import { supabase, supabaseAdmin } from '@config/supabase';
import { db } from '@/db';  
import * as schema from '@/db/schema'; // Import schema namespace
import { Profile } from '@/db/schema'; // Keep specific type import
import { UserRole, AdminProfile, StudentProfile, ReadingLevel } from '@shared/types';
import { eq, and, count, SQL } from 'drizzle-orm'; // Keep count, eq, and, SQL
import bcrypt from 'bcrypt';
import { AuthError, Session, User } from '@supabase/supabase-js';
import { logger } from '@/utils/logger';
import { AppError } from '@/utils/errors'; 
import { SubscriptionService } from '@/modules/subscription/services/subscription.service'; 
import { generateStudentToken } from '@/utils/jwt'; // Import the new utility function

// Define the type for the db instance (adjust path/type if needed)
type DbInstanceType = typeof db;

// Define a return type for OAuth operations
interface AuthResult {
  user: User;
  session: Session | null; // Allow session to be null
  profile: Profile | null;
}

export class AuthService {
  private subscriptionService: SubscriptionService;
  private db: DbInstanceType; // <<< Add db property

  // <<< Modify constructor to accept db instance
  constructor(dbInstance: DbInstanceType) {
    this.db = dbInstance; // <<< Assign injected db instance
    this.subscriptionService = new SubscriptionService(); // Keep this for now, could also be injected
  }

  // Initiate Google OAuth sign-in
  async initiateGoogleSignIn() {
    try {
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${process.env.APP_URL}/auth/callback`
        }
      });

      if (error) throw error;
      return data;
    } catch (error) {
      logger.error('Failed to initiate Google sign-in:', error);
      const message = error instanceof Error ? error.message : String(error);
      throw new AppError(`Failed to initiate Google sign-in: ${message}`, 500);
    }
  }

  // Handle OAuth callback and create/retrieve profile
  async handleOAuthCallback(token: string): Promise<AuthResult> {
    try {
      // Exchange the token for session data
      const { data, error } = await supabase.auth.getSession();
      
      if (error) {
        throw new AppError('Failed to validate OAuth session', 401);
      }
      
      if (!data.session) {
        throw new AppError('No valid session found', 401);
      }
      
      const user = await supabase.auth.getUser();
      
      if (!user.data.user) {
        throw new AppError('No user found for session', 401);
      }

      // Check if profile exists
      const [existingProfile] = await this.db
        .select()
        .from(schema.profiles)
        .where(eq(schema.profiles.id, user.data.user.id));

      // Return the result
      return {
        user: user.data.user,
        session: data.session,
        profile: existingProfile || null
      };
    } catch (error) {
      logger.error('Error handling OAuth callback:', error);
      const message = error instanceof Error ? error.message : String(error);
      throw new AppError(`OAuth callback failed: ${message}`, 500);
    }
  }

  // Sign up with email (now for any public user)
  async signUpWithEmail(email: string, password: string, fullName: string): Promise<AuthResult> {
    try {
      // Create user in Supabase Auth
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name: fullName // Pass fullName if needed by trigger or elsewhere
          }
        }
      });

      if (authError) {
          logger.error('Supabase signup error:', authError);
          // Consider more specific error mapping based on authError.code/status
          throw new AppError(`Authentication error: ${authError.message}`, authError.status || 400);
      }
      if (!authData.user) throw new AppError('User creation failed after signup', 500);
      // Session might not be immediately available or required depending on email verification settings

      // The profile will be created automatically by our database trigger
      // We can optimistically wait a bit and check, or rely on later profile fetch
      await new Promise(resolve => setTimeout(resolve, 750)); // Increased delay slightly

      // Check if profile was created
      const [profile] = await this.db
        .select()
        .from(schema.profiles)
        .where(eq(schema.profiles.id, authData.user.id));
        
      if (!profile) {
          // This might happen due to trigger delay or failure
          logger.warn(`Profile not found immediately after signup for user ${authData.user.id}`);
          // Decide if this is an error or just needs later handling
      }

      return {
        user: authData.user,
        session: authData.session, // Session might be null if email verification is on
        profile: profile || null
      };
    } catch (error) {
      // Log the original error before potentially re-throwing a generic one
      logger.error('Error during email signup:', error);
      if (error instanceof AppError) {
        throw error; // Re-throw known AppErrors
      }
      // Avoid exposing raw AuthError details potentially
      throw new AppError(`Signup failed. Please try again.`, 500);
    }
  }

  // Step 1: Admin login with Supabase (email/password only)
  async loginAdmin(email: string, password: string) {
    try {
      // Sign in with Supabase
      const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (authError) throw authError;
      if (!authData.user) throw new Error('Login failed');

      // Get admin profile using this.db
      const [profile] = await this.db
        .select()
        .from(schema.profiles)
        .where(eq(schema.profiles.id, authData.user.id));

      if (!profile || profile.role !== "ADMIN") {
        throw new Error('Admin profile not found');
      }

      return {
        user: authData.user,
        profile,
        session: authData.session,
      };
    } catch (error) {
      if (error instanceof AuthError) {
        throw new Error(`Authentication error: ${error.message}`);
      }
      logger.error('Failed to login admin:', error);
      const message = error instanceof Error ? error.message : String(error);
      throw new Error(`Failed to login admin: ${message}`);
    }
  }

  async refreshSession(refreshToken: string): Promise<{ accessToken: string; newRefreshToken?: string }> {
    try {
      logger.info('Attempting to refresh session using refreshSession method.');

      // Use refreshSession explicitly with the provided refresh token
      const { data, error } = await supabase.auth.refreshSession({
         refresh_token: refreshToken
      });

      if (error) {
        logger.error('Supabase session refresh failed', { error: error.message });
        // Check Supabase error details if needed, e.g., error.message might indicate invalid token
        throw new AppError('Invalid or expired refresh token', 401);
      }

      if (!data || !data.session) {
        logger.error('Supabase refreshSession succeeded but no session data returned');
        throw new AppError('Failed to refresh session: No session data received', 500);
      }

      // It's good practice to verify the user still exists after refresh
      const { data: userData, error: userError } = await supabase.auth.getUser();
      if (userError || !userData?.user) {
        logger.error('Failed to retrieve user after session refresh', { error: userError?.message });
        // It's possible refresh worked but user was deleted - treat as auth failure
        throw new AppError('Refreshed session user not found', 401);
      }

      // Check if Supabase returned a new refresh token (rotation)
      const newRefreshToken =
        data.session.refresh_token && data.session.refresh_token !== refreshToken
          ? data.session.refresh_token
          : undefined;

      if (newRefreshToken) {
        logger.info('Supabase returned a new refresh token (rotation detected).');
      }

      logger.info('Session refreshed successfully.');
      return {
        accessToken: data.session.access_token,
        newRefreshToken: newRefreshToken,
      };

    } catch (error) {
      if (error instanceof AppError) {
        throw error;
      }
      logger.error('Unexpected error during session refresh:', error);
      throw new AppError('An unexpected error occurred during session refresh', 500);
    }
  }

  // Create student profile (requires admin authentication)
  async createStudent(adminId: string, fullName: string, pin: string, age: number | null, readingLevel: ReadingLevel | null): Promise<Profile> {
    try {
      // --- BEGIN Subscription Limit Check --- 
      // 1. Get admin's current subscription plan (uses this.subscriptionService)
      const { plan } = await this.subscriptionService.getCurrentSubscription(adminId);
      if (!plan) {
        throw new AppError('Could not determine subscription plan for admin.', 500);
      }

      // 2. Check if the tier allows student creation
      if (plan.tier === 'free') {
        throw new AppError(
          'Student profile creation is not allowed on the Free plan. Please upgrade.',
          403 // Forbidden
        );
      }

      // 3. Count existing students for this admin (uses this.db)
      const [studentCountResult] = await this.db
        .select({ value: count() })
        .from(schema.profiles)
        .where(and(eq(schema.profiles.adminId, adminId), eq(schema.profiles.role, 'STUDENT')));

      const currentStudentCount = studentCountResult.value || 0;

      // 4. Check against plan limit
      if (currentStudentCount >= plan.studentLimit) {
        throw new AppError(
          `Student limit (${plan.studentLimit}) for your current plan ('${plan.tier}') has been reached. Please upgrade to create more students.`,
          403 // Forbidden
        );
      }
      // --- END Subscription Limit Check --- 

      // Hash the PIN before storing
      const hashedPin = await bcrypt.hash(pin, 10);

      // Insert new student profile
      const [newProfile] = await this.db
        .insert(schema.profiles)
        .values({
          adminId,
          fullName,
          pin: hashedPin,
          role: 'STUDENT',
          age: age, // Pass age (which can be null)
          readingLevel: readingLevel // Pass readingLevel (which can be null)
        })
        .returning();

      if (!newProfile) {
          throw new AppError('Failed to create student profile in database', 500);
      }

      return newProfile;
    } catch (error) {
      // Re-throw AppErrors directly
      if (error instanceof AppError) {
        throw error;
      }
      // Log other errors
      logger.error('Error creating student profile:', error);
      const message = error instanceof Error ? error.message : String(error);
      throw new AppError(`Failed to create student: ${message}`, 500);
    }
  }

  // Student login with PIN - Correct return type Promise<{ profile: Profile, token: string }>
  async loginStudent(studentId: string, pin: string): Promise<{ profile: Profile, token: string }> {
    try {
      const [fetchedProfile] = await this.db
        .select()
        .from(schema.profiles)
        .where(eq(schema.profiles.id, studentId));

      if (!fetchedProfile || fetchedProfile.role !== "STUDENT") {
        // Use AppError
        throw new AppError('Student profile not found', 401);
      }
      
      if (fetchedProfile.pin === null || fetchedProfile.adminId === null) {
          logger.error('Fetched student profile is missing required pin or adminId:', fetchedProfile);
          // Use AppError
          throw new AppError('Student profile data is invalid.', 400); 
      }

      // Verify PIN
      const isValidPin = await bcrypt.compare(pin, fetchedProfile.pin!);
      if (!isValidPin) {
        // Use AppError
        throw new AppError('Invalid PIN', 401); 
      }

      // --- Use utility to generate token --- 
      const token = generateStudentToken(fetchedProfile);
      
      // Return profile and the generated token
      return { profile: fetchedProfile, token };

    } catch (error) {
       // Rethrow AppErrors, convert others
       if (error instanceof AppError) { 
           throw error; 
       }
       logger.error(`Error logging in student ${studentId}:`, error);
       const message = error instanceof Error ? error.message : String(error);
       throw new AppError(`Failed to login student: ${message}`, 500);
    }
  }

  // Logout (admin only, students don't have sessions)
  async logout() {
    const { error } = await supabase.auth.signOut();
    if (error) {
      logger.error('Supabase signout error:', error);
      throw new Error(`Logout failed: ${error.message}`);
    }
  }

  // Reset admin password (Using Supabase)
  async resetAdminPassword(userId: string, currentPassword: string, newPassword: string): Promise<Profile> {
    try {
       // Verify the current password with Supabase
      const { data: { user }, error: getUserError } = await supabase.auth.getUser(); 
      
      if (getUserError || !user) {
        throw new AppError('Failed to get current user for password reset.', 401);
      }
      
      // Verify the current password by trying to sign in 
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: user.email!, 
        password: currentPassword,
      });
      
      if (signInError) {
        throw new AppError('Current password is incorrect.', 403); 
      }
      
      // Update the password with Supabase Auth
      const { error: updateError } = await supabase.auth.updateUser({
        password: newPassword,
      });
      
      if (updateError) {
        throw new AppError(`Failed to update password: ${updateError.message}`, 500);
      }
      
      // Get the updated profile from DB 
      const [profile] = await this.db
        .select()
        .from(schema.profiles)
        .where(eq(schema.profiles.id, userId));
        
      if (!profile) {
        throw new AppError('Profile not found after password update.', 404);
      }
      
      return profile;
    } catch (error) {
       if (error instanceof AppError) { 
           throw error; 
       }
      logger.error('Failed to reset admin password:', error);
      const message = error instanceof Error ? error.message : String(error);
      throw new AppError(`Failed to reset admin password.`, 500); 
    }
  }

  // Reset student PIN
  async resetStudentPin(studentId: string, newPin: string): Promise<Profile> {
    try {
      const hashedPin = await bcrypt.hash(newPin, 10);
      const result = await this.db
        .update(schema.profiles)
        .set({ pin: hashedPin, updatedAt: new Date() })
        .where(eq(schema.profiles.id, studentId)) // Assuming studentId is the user ID for the student profile
        .returning();

      if (result.length === 0) {
        // Throw AppError for consistency
        throw new AppError('Student profile not found during PIN reset.', 404);
      }

      return result[0];
    } catch (error: any) {
      // Re-throw known AppErrors
      if (error instanceof AppError) {
        throw error;
      }
      // Wrap other errors
      logger.error(error, 'Failed to reset student PIN:', { studentId });
      throw new AppError(`Failed to reset student PIN: ${error.message}`, 500);
    }
  }
} 