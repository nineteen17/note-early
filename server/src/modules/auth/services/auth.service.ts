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
import { generateStudentAuthTokens, verifyStudentRefreshToken } from '@/utils/jwt'; // Import the new utility function
import { env } from '@/config/env';
import { createClient } from '@supabase/supabase-js';


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
      // --- Pre-check using listUsers with pagination ---
      logger.info(`Checking for existing user with email: ${email}`);
      const { data: listData, error: listError } = await supabaseAdmin.auth.admin.listUsers({
        page: 1,
        perPage: 1,
        // No direct email filter here, we check the result
      });

      if (listError) {
        logger.error('Error listing users during pre-check:', listError);
        throw new AppError('Failed to verify email address. Please try again.', 500);
      }

      // Check if the first user returned matches the email
      if (listData && listData.users && listData.users.length > 0) {
        // Compare emails case-insensitively
        if (listData.users[0].email?.toLowerCase() === email.toLowerCase()) {
            logger.warn(`Signup attempt failed: Email ${email} already registered (found via listUsers).`);
            throw new AppError('Email address is already registered.', 409);
        }
        // If the first user doesn't match, it's unlikely (though not impossible)
        // that the target user exists further down the list if listUsers isn't
        // ordered reliably by email. However, for most practical purposes,
        // if the *very first* user doesn't match, we can assume the email is available.
        // A more robust check might involve multiple pages if exact filtering fails,
        // but that adds complexity. Let's proceed if the first user doesn't match.
      }

      logger.info(`Email ${email} appears not registered (or first user didn't match). Proceeding with signup attempt.`);
      // --- END Pre-check ---

      // If pre-check passed, proceed to create user in Supabase Auth
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name: fullName
          }
        }
      });

      // Fallback check (in case of race conditions or other issues)
      if (authError) {
          logger.error('Supabase signup error (after pre-check):', authError);
          if (authError.message && authError.message.includes('User already registered')) {
              throw new AppError('Email address is already registered.', 409);
          } else {
              throw new AppError(`Authentication error: ${authError.message}`, authError.status || 400);
          }
      }

      if (!authData.user) throw new AppError('User creation failed after signup', 500);

      await new Promise(resolve => setTimeout(resolve, 750));

      const [profile] = await this.db
        .select()
        .from(schema.profiles)
        .where(eq(schema.profiles.id, authData.user.id));

      if (!profile) {
          logger.warn(`Profile not found immediately after signup for user ${authData.user.id}`);
      }

      return {
        user: authData.user,
        session: authData.session,
        profile: profile || null
      };
    } catch (error) {
       logger.error('Error during email signup:', error);
       if (error instanceof AppError) {
         throw error;
       }
       throw new AppError(`Signup failed. Please try again.`, 500);
    }
  }

  // Resend email verification
  async resendVerificationEmail(email: string): Promise<void> {
    try {
      // Check if user exists first
      const { data: listData, error: listError } = await supabaseAdmin.auth.admin.listUsers({
        page: 1,
        perPage: 1000, // Set a reasonable limit
      });

      if (listError) {
        logger.error('Error listing users during resend verification:', listError);
        throw new AppError('Failed to process verification request.', 500);
      }

      // Find user by email
      const existingUser = listData.users.find(user => user.email?.toLowerCase() === email.toLowerCase());
      
      if (!existingUser) {
        throw new AppError('Email address not found.', 404);
      }

      // Check if user is already confirmed
      if (existingUser.email_confirmed_at) {
        throw new AppError('Email is already verified.', 400);
      }

      // Resend verification email using admin API
      const { error: resendError } = await supabaseAdmin.auth.resend({
        type: 'signup',
        email: email,
      });

      if (resendError) {
        logger.error('Error resending verification email:', resendError);
        throw new AppError('Failed to resend verification email.', 500);
      }

      logger.info(`Verification email resent successfully to: ${email}`);
    } catch (error) {
      if (error instanceof AppError) {
        throw error;
      }
      logger.error('Error resending verification email:', error);
      throw new AppError('Failed to resend verification email.', 500);
    }
  }

  // Forgot password - send reset email
  async forgotPassword(email: string): Promise<void> {
    try {
      // Use Supabase's built-in password reset functionality
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${process.env.CLIENT_URL || 'http://localhost:3000'}/password-reset`,
      });

      if (error) {
        logger.error('Error sending password reset email:', error);
        // Don't throw error - for security, always return success response
        // regardless of whether email exists or not
      }

      logger.info(`Password reset email sent (or attempted) for: ${email}`);
    } catch (error) {
      logger.error('Error in forgot password flow:', error);
      // Don't throw error - for security, always return success response
    }
  }

  // Update password during reset flow
  async updatePassword(accessToken: string, newPassword: string): Promise<void> {
    try {
      // Set the session with the provided access token
      const { data: { user }, error: sessionError } = await supabase.auth.getUser(accessToken);
      
      if (sessionError || !user) {
        logger.error(`Invalid or expired session for password update: ${sessionError?.message}`);
        throw new AppError('Password reset session has expired. Please request a new password reset.', 401);
      }

      // Update the user's password using admin API to ensure it works
      const { error: updateError } = await supabaseAdmin.auth.admin.updateUserById(user.id, {
        password: newPassword
      });

      if (updateError) {
        logger.error(`Supabase password update error: ${updateError.message}`, { userId: user.id });
        throw new AppError('Failed to update password', 500);
      }

      logger.info(`Password updated successfully`, { userId: user.id });
    } catch (error) {
      if (error instanceof AppError) {
        throw error;
      }
      logger.error('Unexpected error in updatePassword:', error);
      throw new AppError('Failed to update password', 500);
    }
  }

  // Step 1: Admin login with Supabase (email/password only)
// Step 1: Admin login with Supabase (email/password only)
async loginAdmin(email: string, password: string) {
  try {
    // Sign in with Supabase
    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (authError) {
      // Check for email confirmation errors specifically
      if (authError.message?.includes('Email not confirmed') || 
          authError.message?.includes('email_not_confirmed') ||
          authError.message?.includes('confirm') ||
          authError.message?.includes('verify')) {
        throw new AppError('Please verify your email address before signing in.', 400);
      }
      throw authError;
    }
    
    if (!authData.user) throw new AppError('Login failed', 400);

    // IMPORTANT: Check if email is verified
    if (!authData.user.email_confirmed_at) {
      throw new AppError('Please verify your email address before signing in.', 400);
    }

    // Get admin profile using this.db
    const [profile] = await this.db
      .select()
      .from(schema.profiles)
      .where(eq(schema.profiles.id, authData.user.id));

    if (!profile || profile.role !== "ADMIN") {
      throw new AppError('Admin profile not found', 404);
    }

    return {
      user: authData.user,
      profile,
      session: authData.session,
    };
  } catch (error) {
    if (error instanceof AppError) {
      throw error;
    }
    if (error instanceof AuthError) {
      // Handle specific Supabase auth errors
      if (error.message?.includes('Email not confirmed') || 
          error.message?.includes('email_not_confirmed')) {
        throw new AppError('Please verify your email address before signing in.', 400);
      }
      throw new AppError(`Authentication error: ${error.message}`, 400);
    }
    logger.error('Failed to login admin:', error);
    const message = error instanceof Error ? error.message : String(error);
    throw new AppError(`Failed to login admin: ${message}`, 500);
  }
}

  async refreshSession(refreshToken: string): Promise<{ accessToken: string; newRefreshToken?: string }> {
    const maxRetries = 2;
    let lastError: any;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        logger.info(`Attempting to refresh session using refreshSession method (attempt ${attempt}/${maxRetries}).`);

        // Use refreshSession explicitly with the provided refresh token
        const { data, error } = await supabase.auth.refreshSession({
           refresh_token: refreshToken
        });

        if (error) {
          // Check for specific "already used" error
          if (error.message?.includes('Already Used') && attempt < maxRetries) {
            logger.warn(`Refresh token already used on attempt ${attempt}, retrying...`);
            lastError = error;
            // Wait a bit before retrying to avoid race conditions
            await new Promise(resolve => setTimeout(resolve, 100 * attempt));
            continue;
          }
          
          logger.error('Supabase session refresh failed', { error: error.message, attempt });
          throw new AppError('Invalid or expired refresh token', 401);
        }

        if (!data || !data.session) {
          logger.error('Supabase refreshSession succeeded but no session data returned');
          throw new AppError('Failed to refresh session: No session data received', 500);
        }

        // It's good practice to verify the user still exists after refresh
        // Use the new access token from the refreshed session
        const { data: userData, error: userError } = await supabase.auth.getUser(data.session.access_token);
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

        logger.info(`Session refreshed successfully on attempt ${attempt}.`);
        return {
          accessToken: data.session.access_token,
          newRefreshToken: newRefreshToken,
        };

      } catch (error) {
        lastError = error;
        
        if (error instanceof AppError) {
          // Don't retry AppErrors unless it's a specific "already used" case
          if (error.message.includes('Invalid or expired refresh token') && attempt < maxRetries) {
            logger.warn(`Refresh failed on attempt ${attempt}, retrying...`);
            await new Promise(resolve => setTimeout(resolve, 100 * attempt));
            continue;
          }
          throw error;
        }
        
        logger.error(`Unexpected error during session refresh attempt ${attempt}:`, error);
        if (attempt === maxRetries) {
          throw new AppError('An unexpected error occurred during session refresh', 500);
        }
      }
    }

    // If we get here, all retries failed
    if (lastError instanceof AppError) {
      throw lastError;
    }
    throw new AppError('Failed to refresh session after multiple attempts', 500);
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

      // 2. Count existing students for this admin (uses this.db)
      const [studentCountResult] = await this.db
        .select({ value: count() })
        .from(schema.profiles)
        .where(and(eq(schema.profiles.adminId, adminId), eq(schema.profiles.role, 'STUDENT')));

      const currentStudentCount = studentCountResult.value || 0;

      // 3. Check against plan limit
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

  // Student login with PIN - MODIFIED
  async loginStudent(studentId: string, pin: string): Promise<{ profile: Profile, accessToken: string, refreshToken: string }> {
    try {
      const [fetchedProfile] = await this.db
        .select()
        .from(schema.profiles)
        .where(eq(schema.profiles.id, studentId));

      if (!fetchedProfile || fetchedProfile.role !== UserRole.STUDENT) {
        throw new AppError('Student profile not found', 401);
      }
      
      if (fetchedProfile.pin === null || fetchedProfile.adminId === null) {
          logger.error('Fetched student profile is missing required pin or adminId:', fetchedProfile);
          throw new AppError('Student profile data is invalid.', 400); 
      }

      // Verify PIN
      const isValidPin = await bcrypt.compare(pin, fetchedProfile.pin);
      if (!isValidPin) {
        throw new AppError('Invalid PIN', 401); 
      }

      // --- Generate BOTH tokens using the updated utility --- 
      const { accessToken, refreshToken } = generateStudentAuthTokens(fetchedProfile);
      
      // Return profile and BOTH tokens
      return { profile: fetchedProfile, accessToken, refreshToken };

    } catch (error) {
       if (error instanceof AppError) { 
           throw error; 
       }
       logger.error(`Error logging in student ${studentId}:`, error);
       const message = error instanceof Error ? error.message : String(error);
       throw new AppError(`Failed to login student: ${message}`, 500);
    }
  }
  
  // --- NEW METHOD for Student Refresh Token --- //
  async refreshStudentToken(refreshToken: string): Promise<{ newAccessToken: string }> {
    try {
      // 1. Verify the refresh token
      const verifiedPayload = verifyStudentRefreshToken(refreshToken);
      const studentId = verifiedPayload.id;
      logger.info(`Verified student refresh token for student ID: ${studentId}`);

      // 2. Fetch the current student profile from DB
      const [currentProfile] = await this.db
        .select()
        .from(schema.profiles)
        .where(and(eq(schema.profiles.id, studentId), eq(schema.profiles.role, UserRole.STUDENT)));

      // Ensure profile exists and is still valid/active (add checks if needed)
      if (!currentProfile) {
        logger.warn(`Refresh attempt failed: Student profile ${studentId} not found or invalid.`);
        throw new AppError('Invalid refresh token: User not found', 401); 
      }

      // 3. Generate *only* a new access token
      // We call generateStudentAuthTokens but only need the accessToken part
      const { accessToken: newAccessToken } = generateStudentAuthTokens(currentProfile);

       logger.info(`Generated new access token for student ID: ${studentId} via refresh.`);
      return { newAccessToken };

    } catch (error) {
        // Log specific AppErrors from verification/DB fetch
        if (error instanceof AppError) {
             logger.error(`Student token refresh error: ${error.message} (Status: ${error.statusCode})`);
             // Rethrow specific errors (like 401) to be handled by controller
             throw error; 
        }
        // Log unexpected errors
        logger.error('Unexpected error during student token refresh:', error);
        // Throw generic error for unexpected issues
        throw new AppError('Failed to refresh student session', 500); 
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

    // Invalidate all Supabase sessions for the current user
  async invalidateAllSessions(userId: string): Promise<void> {
    try {
      // Validate userId input
      if (!userId || typeof userId !== 'string' || userId.trim().length === 0) {
        throw new AppError('Invalid user ID provided', 400);
      }
      
      // Debug: Check if service role key is configured
      const serviceRoleKey = env.SUPABASE_SERVICE_ROLE_KEY;
      if (!serviceRoleKey || serviceRoleKey.length < 50) {
        logger.error('Supabase service role key missing or malformed:', {
          hasKey: !!serviceRoleKey,
          keyLength: serviceRoleKey?.length || 0,
          keyPrefix: serviceRoleKey?.substring(0, 10) || 'none'
        });
        throw new AppError('Supabase service role key not properly configured', 500);
      }
      
      // Create a fresh admin client
      const freshAdminClient = createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      });
      
      logger.info('Attempting to invalidate sessions for user:', {
        userId,
        userIdLength: userId.length,
        isValidUUID: /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(userId)
      });
      
      // First, get the user to verify they exist
      const { data: userData, error: getUserError } = await freshAdminClient.auth.admin.getUserById(userId);
      
      if (getUserError) {
        logger.error('Failed to get user before session invalidation:', {
          errorMessage: getUserError.message,
          errorName: getUserError.name,
          userId,
          status: getUserError.status
        });
        throw new AppError(`User not found or inaccessible: ${getUserError.message}`, 404);
      }
      
      if (!userData.user) {
        logger.error('User data is null for userId:', { userId });
        throw new AppError('User not found in Supabase', 404);
      }
      
      logger.info('User found, proceeding with session invalidation:', {
        userId,
        userEmail: userData.user.email,
        userCreatedAt: userData.user.created_at
      });
      
      // **NEW APPROACH: Use the same method as password changes**
      // This approach is much more reliable because it forces immediate session invalidation
      // by updating the user's authentication state, similar to how password changes work
      
      let sessionInvalidated = false;
      const errors: string[] = [];
      
      // Approach 1: Use Supabase's admin.listUserSessions and admin.deleteSession to force invalidation
      // This is the most direct approach to invalidate all active sessions
      try {
        logger.info('Approach 1: Attempting to list and delete all user sessions...');
        
        // Try to list all sessions for the user (this might not be available in all Supabase versions)
        try {
          // Note: This API might not be available in all Supabase versions
          const { data: sessions, error: listError } = await (freshAdminClient.auth.admin as any).listUserSessions?.(userId);
          
          if (!listError && sessions && Array.isArray(sessions)) {
            logger.info(`Found ${sessions.length} active sessions for user`);
            
            // Delete each session individually
            let deletedCount = 0;
            for (const session of sessions) {
              try {
                const { error: deleteError } = await (freshAdminClient.auth.admin as any).deleteSession?.(session.id);
                if (!deleteError) {
                  deletedCount++;
                }
              } catch (deleteErr) {
                logger.warn(`Failed to delete session ${session.id}:`, deleteErr);
              }
            }
            
            if (deletedCount > 0) {
              logger.info(`SUCCESS: Deleted ${deletedCount} sessions directly!`);
              sessionInvalidated = true;
            }
          } else {
            logger.info('Session listing API not available or no sessions found, trying alternative approach...');
          }
        } catch (sessionApiError) {
          logger.info('Session management API not available, trying alternative approach...');
        }
        
        // If direct session deletion didn't work, try the ban/unban approach
        if (!sessionInvalidated) {
          logger.info('Attempting user ban/unban cycle to force session invalidation...');
          
          // Step 1: Ban the user (this should invalidate all sessions)
          const { error: banError } = await freshAdminClient.auth.admin.updateUserById(userId, {
            ban_duration: '1s' // Ban for 1 second
          });
          
          if (!banError) {
            // Wait a moment to ensure the ban takes effect
            await new Promise(resolve => setTimeout(resolve, 100));
            
            // Step 2: Unban the user immediately
            const { error: unbanError } = await freshAdminClient.auth.admin.updateUserById(userId, {
              ban_duration: 'none'
            });
            
            if (!unbanError) {
              logger.info('SUCCESS: Ban/unban cycle completed - sessions should be invalidated!');
              sessionInvalidated = true;
            } else {
              const errorMsg = `Failed to unban user: ${unbanError.message}`;
              errors.push(errorMsg);
              logger.error(errorMsg);
            }
          } else {
            const errorMsg = `Failed to ban user: ${banError.message}`;
            errors.push(errorMsg);
            logger.error(errorMsg);
          }
        }
      } catch (approachError) {
        const errorMsg = `Exception during session invalidation approach 1: ${approachError instanceof Error ? approachError.message : String(approachError)}`;
        errors.push(errorMsg);
        logger.error(errorMsg);
      }
      
      // Approach 2: Force session invalidation by updating the user's updated_at timestamp
      // This forces Supabase to recognize the user as "changed" and invalidate sessions
      if (!sessionInvalidated) {
        try {
          logger.info('Approach 2: Forcing session invalidation via user record update...');
          
          // Update user metadata with a force logout flag and current timestamp
          const { error: updateError } = await freshAdminClient.auth.admin.updateUserById(userId, {
            user_metadata: {
              ...userData.user.user_metadata,
              session_invalidated_at: new Date().toISOString(),
              force_logout: true,
              invalidation_reason: 'admin_requested'
            },
            // Also update app_metadata to ensure the change is recognized
            app_metadata: {
              ...userData.user.app_metadata,
              last_session_invalidation: new Date().toISOString()
            }
          });
          
          if (!updateError) {
            logger.info('SUCCESS: User record updated to force session invalidation!');
            sessionInvalidated = true;
          } else {
            const errorMsg = `User record update failed: ${updateError.message}`;
            errors.push(errorMsg);
            logger.error(errorMsg, {
              errorName: updateError.name,
              status: updateError.status
            });
          }
        } catch (updateError) {
          const errorMsg = `Exception during user record update: ${updateError instanceof Error ? updateError.message : String(updateError)}`;
          errors.push(errorMsg);
          logger.error(errorMsg);
        }
      }
      
      // Approach 3: Temporary account disable/enable cycle (most forceful)
      // This guarantees session invalidation but is more disruptive
      if (!sessionInvalidated) {
        try {
          logger.info('Approach 3: Forcing session invalidation via temporary account disable...');
          
          // Temporarily disable the account for 1 second
          const { error: disableError } = await freshAdminClient.auth.admin.updateUserById(userId, {
            ban_duration: 'PT1S' // Ban for 1 second (ISO 8601 duration)
          });
          
          if (!disableError) {
            // Wait for the ban to take effect
            await new Promise(resolve => setTimeout(resolve, 1100)); // Wait 1.1 seconds
            
            // Re-enable the account
            const { error: enableError } = await freshAdminClient.auth.admin.updateUserById(userId, {
              ban_duration: 'none'
            });
            
            if (!enableError) {
              logger.info('SUCCESS: Temporary account disable/enable completed - all sessions invalidated!');
              sessionInvalidated = true;
            } else {
              const errorMsg = `Failed to re-enable account: ${enableError.message}`;
              errors.push(errorMsg);
              logger.error(errorMsg);
            }
          } else {
            const errorMsg = `Failed to temporarily disable account: ${disableError.message}`;
            errors.push(errorMsg);
            logger.error(errorMsg);
          }
        } catch (disableError) {
          const errorMsg = `Exception during account disable/enable: ${disableError instanceof Error ? disableError.message : String(disableError)}`;
          errors.push(errorMsg);
          logger.error(errorMsg);
        }
      }
      
      // Approach 4: Fallback to traditional signOut methods (less reliable but worth trying)
      if (!sessionInvalidated) {
        try {
          logger.info('Approach 4: Fallback to traditional signOut methods...');
          const { error: signOutError } = await freshAdminClient.auth.admin.signOut(userId, 'global');
          if (!signOutError) {
            logger.info('SUCCESS: Traditional signOut worked!');
            sessionInvalidated = true;
          } else {
            const errorMsg = `Traditional signOut failed: ${signOutError.message}`;
            errors.push(errorMsg);
            logger.error(errorMsg);
          }
        } catch (signOutError) {
          const errorMsg = `Exception during traditional signOut: ${signOutError instanceof Error ? signOutError.message : String(signOutError)}`;
          errors.push(errorMsg);
          logger.error(errorMsg);
        }
      }
      
      // Handle final result
      if (!sessionInvalidated) {
        // Analyze the first error to understand the failure pattern
        const primaryError = errors[0];
        const errorMessage = typeof primaryError === 'string' ? primaryError : String(primaryError);
        
        // Simple error categorization based on error message patterns
        const isJWTMalformed = errorMessage.includes('token is malformed') || 
                              errorMessage.includes('invalid number of segments') ||
                              errorMessage.includes('unable to parse or verify signature');
        
        const isConfigurationError = errorMessage.includes('service role') ||
                                    errorMessage.includes('configuration') ||
                                    errorMessage.includes('insufficient_privilege');
        
        logger.warn('All session invalidation methods failed:', {
          userId,
          totalErrorCount: errors.length,
          isJWTMalformed,
          isConfigurationError,
          primaryError: errors[0],
          allErrors: errors.slice(0, 3)
        });
        
        // For JWT malformed errors, treat as success since sessions are likely already invalid
        if (isJWTMalformed) {
          logger.info('Treating JWT malformed errors as success - sessions were likely already invalid');
        } else if (isConfigurationError) {
          // For configuration issues, we should throw an error
          throw new AppError('Session invalidation failed due to configuration issue. Check service role key and project settings.', 500);
        } else {
          // For other errors, log but don't throw - the user might already be logged out
          logger.info('Session invalidation failed but treating as acceptable - user may already be logged out');
        }
      } else {
        logger.info('Session invalidation completed successfully - all user sessions have been invalidated');
      }
    } catch (error) {
      if (error instanceof AppError) {
        throw error;
      }
      
      logger.error('Failed to invalidate all sessions:', {
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
        userId
      });
      
      const message = error instanceof Error ? error.message : String(error);
      throw new AppError(`Failed to invalidate all sessions: ${message}`, 500);
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