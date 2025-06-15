import { supabase, supabaseAdmin } from '@config/supabase';
import * as schema from '@/db/schema'; // Import schema namespace
import { UserRole } from '@shared/types';
import { eq, and, count } from 'drizzle-orm'; // Keep count, eq, and, SQL
import bcrypt from 'bcrypt';
import { AuthError } from '@supabase/supabase-js';
import { logger } from '@/utils/logger';
import { AppError } from '@/utils/errors';
import { SubscriptionService } from '@/modules/subscription/services/subscription.service';
import { generateStudentAuthTokens, verifyStudentRefreshToken } from '@/utils/jwt'; // Import the new utility function
export class AuthService {
    // <<< Modify constructor to accept db instance
    constructor(dbInstance) {
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
            if (error)
                throw error;
            return data;
        }
        catch (error) {
            logger.error('Failed to initiate Google sign-in:', error);
            const message = error instanceof Error ? error.message : String(error);
            throw new AppError(`Failed to initiate Google sign-in: ${message}`, 500);
        }
    }
    // Handle OAuth callback and create/retrieve profile
    async handleOAuthCallback(token) {
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
        }
        catch (error) {
            logger.error('Error handling OAuth callback:', error);
            const message = error instanceof Error ? error.message : String(error);
            throw new AppError(`OAuth callback failed: ${message}`, 500);
        }
    }
    // Sign up with email (now for any public user)
    async signUpWithEmail(email, password, fullName) {
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
                }
                else {
                    throw new AppError(`Authentication error: ${authError.message}`, authError.status || 400);
                }
            }
            if (!authData.user)
                throw new AppError('User creation failed after signup', 500);
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
        }
        catch (error) {
            logger.error('Error during email signup:', error);
            if (error instanceof AppError) {
                throw error;
            }
            throw new AppError(`Signup failed. Please try again.`, 500);
        }
    }
    // Resend email verification
    async resendVerificationEmail(email) {
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
        }
        catch (error) {
            if (error instanceof AppError) {
                throw error;
            }
            logger.error('Error resending verification email:', error);
            throw new AppError('Failed to resend verification email.', 500);
        }
    }
    // Forgot password - send reset email
    async forgotPassword(email) {
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
        }
        catch (error) {
            logger.error('Error in forgot password flow:', error);
            // Don't throw error - for security, always return success response
        }
    }
    // Update password during reset flow
    async updatePassword(accessToken, newPassword) {
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
        }
        catch (error) {
            if (error instanceof AppError) {
                throw error;
            }
            logger.error('Unexpected error in updatePassword:', error);
            throw new AppError('Failed to update password', 500);
        }
    }
    // Step 1: Admin login with Supabase (email/password only)
    // Step 1: Admin login with Supabase (email/password only)
    async loginAdmin(email, password) {
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
            if (!authData.user)
                throw new AppError('Login failed', 400);
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
        }
        catch (error) {
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
    async refreshSession(refreshToken) {
        const maxRetries = 2;
        let lastError;
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
                const newRefreshToken = data.session.refresh_token && data.session.refresh_token !== refreshToken
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
            }
            catch (error) {
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
    async createStudent(adminId, fullName, pin, age, readingLevel) {
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
                throw new AppError(`Student limit (${plan.studentLimit}) for your current plan ('${plan.tier}') has been reached. Please upgrade to create more students.`, 403 // Forbidden
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
        }
        catch (error) {
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
    async loginStudent(studentId, pin) {
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
        }
        catch (error) {
            if (error instanceof AppError) {
                throw error;
            }
            logger.error(`Error logging in student ${studentId}:`, error);
            const message = error instanceof Error ? error.message : String(error);
            throw new AppError(`Failed to login student: ${message}`, 500);
        }
    }
    // --- NEW METHOD for Student Refresh Token --- //
    async refreshStudentToken(refreshToken) {
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
        }
        catch (error) {
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
    async resetAdminPassword(userId, currentPassword, newPassword) {
        try {
            // Verify the current password with Supabase
            const { data: { user }, error: getUserError } = await supabase.auth.getUser();
            if (getUserError || !user) {
                throw new AppError('Failed to get current user for password reset.', 401);
            }
            // Verify the current password by trying to sign in 
            const { error: signInError } = await supabase.auth.signInWithPassword({
                email: user.email,
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
        }
        catch (error) {
            if (error instanceof AppError) {
                throw error;
            }
            logger.error('Failed to reset admin password:', error);
            const message = error instanceof Error ? error.message : String(error);
            throw new AppError(`Failed to reset admin password.`, 500);
        }
    }
    // Reset student PIN
    async resetStudentPin(studentId, newPin) {
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
        }
        catch (error) {
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
