import { db } from '@/db';
import { 
  profiles, 
  customerSubscriptions, 
  subscriptionPlans, 
  SubscriptionStatus, // Import the Drizzle pgEnum for Status
  studentProgress // <<< Import studentProgress schema
} from '@/db/schema';
import { eq, sql, inArray, and, SQL, count } from 'drizzle-orm';
import { logger } from '../../../utils/logger';
import { AppError } from '@/utils/errors';
import { 
  AdminUpdateStudentRequest, 
  ProfileDTO, 
  ProfileUpdateRequest 
} from '../schemas/profile.schema';
import { 
  UserRole, 
  ReadingLevel, 
  SubscriptionPlan // Import TS Enum for Plan Tier from shared types
} from '@shared/types';

// Define the type returned by the database selection based on the schema
type ProfileFromDb = typeof profiles.$inferSelect;
// Type for subscription data including nested plan (needed for joins)
type SubscriptionFromDb = typeof customerSubscriptions.$inferSelect & {
  subscription_plans?: typeof subscriptionPlans.$inferSelect | null; 
};
// Type for the result of the leftJoin query (needed for getProfileById)
type ProfileWithSubscriptionQueryResult = {
  profiles: ProfileFromDb;
  customer_subscriptions: (typeof customerSubscriptions.$inferSelect) | null;
  subscription_plans: (typeof subscriptionPlans.$inferSelect) | null;
};

// Helper function to map DB result to ProfileDTO
function mapToProfileDTO(
  profileFromDb: ProfileFromDb, 
  subscriptionFromDb?: typeof customerSubscriptions.$inferSelect | null, 
  planFromDb?: typeof subscriptionPlans.$inferSelect | null,
  completedModulesCount?: number // <<< Add optional parameter
): ProfileDTO {
  // Ensure email is present ONLY for non-student roles
  if (profileFromDb.role !== UserRole.STUDENT && !profileFromDb.email) {
    logger.error('Profile from DB missing required email for non-student role', { profileId: profileFromDb.id, role: profileFromDb.role });
    throw new AppError('Database integrity error: Profile data is incomplete for non-student.', 500);
  }
  
  // Use UserRole from shared types
  const mappedRole = Object.values(UserRole).includes(profileFromDb.role as UserRole) 
      ? profileFromDb.role as UserRole 
      : undefined;

  if (!mappedRole && profileFromDb.role) { // Log only if role exists but is invalid
      logger.warn('Profile from DB has invalid role', { profileId: profileFromDb.id, role: profileFromDb.role });
  }

  // --- RE-ADDED subscription fields mapping ---
  // NOTE: This assumes ProfileDTO in profile.schema.ts has been updated
  return {
    profileId: profileFromDb.id,
    email: profileFromDb.email, // Guaranteed non-null by check above
    fullName: profileFromDb.fullName,
    avatarUrl: profileFromDb.avatarUrl,
    role: mappedRole, // Use validated role from shared types
    createdAt: profileFromDb.createdAt, 
    updatedAt: profileFromDb.updatedAt,
    stripeCustomerId: profileFromDb.stripeCustomerId,
    
    // --- CORRECTED: Read status/renewal date from profileFromDb --- 
    subscriptionStatus: profileFromDb.subscriptionStatus, // Use status directly from the profiles table
    subscriptionPlan: planFromDb?.tier as SubscriptionPlan | null ?? null, // Plan tier comes from the joined plan table (correct)
    subscriptionRenewalDate: profileFromDb.subscriptionRenewalDate, // Use renewal date directly from the profiles table

    // <<< Add completedModulesCount (defaults to undefined if not provided)
    completedModulesCount: completedModulesCount, 

    // Map student fields conditionally
    ...(mappedRole === UserRole.STUDENT && {
      adminId: profileFromDb.adminId, // Include adminId only for students in DTO
      age: profileFromDb.age,
      readingLevel: profileFromDb.readingLevel as ReadingLevel | null | undefined // Use ReadingLevel from shared types
    }),
  };
}

export class ProfileService {
  /**
   * Get all profiles managed by a specific admin
   * (Includes completed module count for students)
   */
  async getProfilesByAdminId(adminId: string): Promise<ProfileDTO[]> {
    try {
      // 1. Fetch base student profiles for the admin
      const profilesResult = await db.select()
        .from(profiles)
        .where(and(
          eq(profiles.adminId, adminId),
          eq(profiles.role, UserRole.STUDENT) // Ensure we only fetch students
        ))
        .execute();
      
      // If no students found, return early
      if (profilesResult.length === 0) {
        return [];
      }

      // 2. Extract student IDs
      const studentIds = profilesResult.map(p => p.id);

      // 3. Query for completed module counts for these students
      const progressCounts = await db.select({
          studentId: studentProgress.studentId,
          completedCount: count() // Drizzle aggregate count
        })
        .from(studentProgress)
        .where(and(
          inArray(studentProgress.studentId, studentIds),
          eq(studentProgress.completed, true) // Only count completed modules
        ))
        .groupBy(studentProgress.studentId) // Group by student ID
        .execute();

      // 4. Create a map for quick lookup: studentId -> completedCount
      const progressMap = new Map<string, number>();
      progressCounts.forEach(item => {
        progressMap.set(item.studentId, item.completedCount);
      });
      
      // 5. Map results, including the completed count
      return profilesResult.map(profile => {
        const countForStudent = progressMap.get(profile.id) ?? 0; // Default to 0 if no progress found
        // Pass the count to mapToProfileDTO
        return mapToProfileDTO(profile, null, null, countForStudent); 
      }); 
    } catch (error: unknown) {
      // Handle specific AppErrors thrown by mapping
      if (error instanceof AppError) {
        throw error;
      }
      logger.error('Error getting profiles for admin', {
        adminId,
        error,
      });
      // Throw a generic error for other issues
      throw new AppError('Failed to fetch profiles', 500); 
    }
  }

  /**
   * Get a profile by their ID
   * --- Updated to include subscription data ---
   */
  async getProfileById(profileId: string): Promise<ProfileDTO> {
    try {
      // Use a single query with left joins
      const result = await db.select()
        .from(profiles)
        .leftJoin(customerSubscriptions, eq(profiles.id, customerSubscriptions.userId))
        .leftJoin(subscriptionPlans, eq(customerSubscriptions.planId, subscriptionPlans.id))
        .where(eq(profiles.id, profileId))
        .limit(1)
        .execute() as ProfileWithSubscriptionQueryResult[]; // Type assertion

      if (result.length === 0 || !result[0].profiles) { // Check if profile part exists
        throw new AppError('Profile not found', 404);
      }

      // Extract parts from the result
      const profileData = result[0].profiles;
      const subscriptionData = result[0].customer_subscriptions;
      const planData = result[0].subscription_plans;

      // Map combined data to DTO, passing subscription/plan info
      return mapToProfileDTO(profileData, subscriptionData, planData);

    } catch (error: unknown) {
      // Re-throw known AppErrors (like not found or mapping errors)
      if (error instanceof AppError) { 
        throw error;
      }
      
      logger.error('Error getting profile by ID', {
        profileId,
        error,
      });
       // Throw a generic error for other issues
      throw new AppError('Failed to fetch profile', 500);
    }
  }

  /**
   * Get profiles by multiple filter criteria
   * (Does not include subscription data for list view)
   */
  async getProfilesByFilters(filters: {
    role?: UserRole; // Use UserRole from shared types
    adminId?: string;
  }): Promise<ProfileDTO[]> {
    try {
      const conditions: SQL<unknown>[] = [];
      
      if (filters.role) {
        conditions.push(eq(profiles.role, filters.role)); // Compare directly using shared type enum value
      }
      
      if (filters.adminId) {
        conditions.push(eq(profiles.adminId, filters.adminId));
      }
      
      // Determine the final where clause
      const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

      // Declare the result variable
      let profilesResult: ProfileFromDb[];

      // Conditionally build and execute the query to avoid reassignment issues
      if (whereClause) {
        profilesResult = await db.select()
          .from(profiles)
          .where(whereClause) // Apply where clause directly
          .execute();
      } else {
        // Execute without a where clause
        profilesResult = await db.select()
          .from(profiles)
          .execute(); 
      }
            
      // Map results without subscription data
      return profilesResult.map(profile => mapToProfileDTO(profile)); 

    } catch (error: unknown) {
       // Handle specific AppErrors thrown by mapping
      if (error instanceof AppError) {
        throw error;
      }
      logger.error('Error getting profiles by filters', {
        filters,
        error,
      });
       // Throw a generic error for other issues
      throw new AppError('Failed to fetch profiles by filters', 500);
    }
  }

  /**
   * Update a profile (Generic - handles self-updates or admin updates based on input type)
   * --- Updated to refetch profile *with* subscription data after update ---
   */
  async updateProfile(
    profileId: string, 
    updates: ProfileUpdateRequest | AdminUpdateStudentRequest, 
    requestingUserId: string, // ID of the user making the request
    isAdminUpdate: boolean = false // Flag to indicate if this is an admin updating a student
  ): Promise<ProfileDTO> {
    try {
      // 1. Fetch the target profile first (minimal data needed for checks)
      const profilesResult = await db.select({ 
          id: profiles.id, 
          role: profiles.role, 
          adminId: profiles.adminId 
        })
        .from(profiles)
        .where(eq(profiles.id, profileId))
        .limit(1)
        .execute();
        
      if (!profilesResult || profilesResult.length === 0) {
        throw new AppError('Profile not found', 404);
      }
      
      const targetProfile = profilesResult[0];

      // 2. Authorization Check (using shared UserRole enum)
      if (isAdminUpdate) {
        // First, check if target profile is a student
        if (targetProfile.role !== UserRole.STUDENT) {
           throw new AppError('Target user is not a student', 400); // Changed error message/code
        }
        
        // Then check if requesting user is an admin or superadmin
        const requestingUserResult = await db.select({ role: profiles.role })
            .from(profiles)
            .where(eq(profiles.id, requestingUserId))
            .limit(1) 
            .execute();

        // Allow ADMIN or SUPER_ADMIN
        if (!requestingUserResult || requestingUserResult.length === 0 || 
            ![UserRole.ADMIN, UserRole.SUPER_ADMIN].includes(requestingUserResult[0].role as UserRole)) {
            throw new AppError('Admin or SuperAdmin privileges required', 403);
        }
        
        // If standard Admin, check if they manage the student
        if (requestingUserResult[0].role === UserRole.ADMIN && targetProfile.adminId !== requestingUserId) {
           throw new AppError('Admin can only update students they manage', 403);
        }
        // SuperAdmins can update any student (no adminId check needed for them)

      } else {
        // Self-update: Ensure the user is updating their own profile
        if (profileId !== requestingUserId) {
            throw new AppError(`Forbidden: Cannot update another user's profile`, 403);
        }
        // Prevent students from self-updating using this endpoint
        if (targetProfile.role === UserRole.STUDENT) {
            throw new AppError('Students cannot update their own profiles via this endpoint', 403);
        }
      }

      // 3. Prepare valid updates (prevent updating sensitive fields)
      const allowedSelfUpdateFields = ['fullName', 'avatarUrl'];
      const allowedAdminUpdateFields = ['fullName', 'avatarUrl', 'age', 'readingLevel']; 
      const allowedFields = isAdminUpdate ? allowedAdminUpdateFields : allowedSelfUpdateFields;
      const validUpdates: Record<string, any> = {};

      // Check for valid fields in updates object
      Object.keys(updates).forEach(key => {
        // Ensure the key is one of the allowed fields for the context
        if (allowedFields.includes(key) && key in updates) {
            // Add the value from the updates object to validUpdates
            validUpdates[key] = (updates as Record<string, any>)[key]; 
        }
      });
      
      // Check if there's anything valid to update
      if (Object.keys(validUpdates).length === 0) {
         // If only invalid fields were sent, return an error
         // If no fields were sent, maybe return current profile? For now, error.
         throw new AppError('No valid fields provided for update', 400);
      }

      // 4. Perform the update
      await db.update(profiles)
        .set({ ...validUpdates, updatedAt: new Date() }) // Ensure updatedAt is updated
        .where(eq(profiles.id, profileId))
        .execute(); // Don't need returning() if we refetch
      
      // 5. Re-fetch the *full* updated profile using getProfileById to include subscription data
      return this.getProfileById(profileId); 

    } catch (error: unknown) {
      // Explicitly re-throw AppErrors
      if (error instanceof AppError) {
        throw error;
      }
      
      // Wrap non-AppErrors
      const message = error instanceof Error ? error.message : String(error);
      logger.error('Error updating profile', { // Pass metadata object as second arg
        profileId, 
        isAdminUpdate, 
        requestingUserId, 
        updateData: updates, // Log the original update payload 
        originalError: message 
      });
      throw new AppError('Failed to update profile', 500);
    }
  }

  /**
   * Delete a profile (Student only, by their Admin)
   * --- Updated to check target is STUDENT ---
   */
  async deleteProfile(profileId: string, adminId: string): Promise<ProfileDTO> {
    try {
      // Fetch profile to check ownership and role first
      const profilesResult = await db.select()
        .from(profiles) // Select full profile needed for mapping later
        .where(eq(profiles.id, profileId))
        .limit(1)
        .execute();
      
      if (profilesResult.length === 0) {
        throw new AppError('Profile not found', 404);
      }
      
      const profileToDelete = profilesResult[0];

      // Check if the target profile is actually a student
      if (profileToDelete.role !== UserRole.STUDENT) {
         throw new AppError('Can only delete student profiles via this method', 400);
      }
      
      // Check if the requesting admin manages this student
      if (profileToDelete.adminId !== adminId) {
        // Check if the requester is a SuperAdmin - they might be allowed to delete any student
        const requesterProfile = await db.select({ role: profiles.role })
            .from(profiles)
            .where(eq(profiles.id, adminId)) // Assuming adminId is the profileId of the requester
            .limit(1)
            .execute();
        
        if (!requesterProfile.length || requesterProfile[0].role !== UserRole.SUPER_ADMIN) {
             throw new AppError('Unauthorized: Profile is not managed by this admin', 403);
        }
        // If SuperAdmin, allow deletion regardless of adminId match
        logger.info(`SuperAdmin ${adminId} deleting student ${profileId} managed by ${profileToDelete.adminId}`);
      }
      
      // Perform deletion
      await db.delete(profiles)
        .where(eq(profiles.id, profileId))
        .execute(); // Don't need returning() if we already have profileToDelete

       logger.info('Deleted student profile', { profileId, adminId });

      // Map the data of the profile *before* it was deleted
      // Pass null for subscription data as it's irrelevant now
      return mapToProfileDTO(profileToDelete, null, null); 
    } catch (error: unknown) {
       if (error instanceof AppError) {
         throw error;
       }
      
      logger.error('Error deleting profile', {
        profileId,
        adminId,
        error,
      });
      throw new AppError('Failed to delete profile', 500);
    }
  }

  /**
   * Get all student profiles in the system
   * (Does not include subscription data for list view)
   */
  async getAllStudents(): Promise<ProfileDTO[]> {
    try {
      const studentProfiles = await db.select()
        .from(profiles)
        .where(eq(profiles.role, UserRole.STUDENT)) // Use shared enum value for check
        .execute();
      
      // Map results without subscription data
      return studentProfiles.map(profile => mapToProfileDTO(profile)); 
    } catch (error: unknown) {
       // Handle specific AppErrors thrown by mapping
      if (error instanceof AppError) {
        throw error;
      }
      logger.error('Error getting all students', {
        error,
      });
      throw new AppError('Failed to fetch students', 500);
    }
  }
}