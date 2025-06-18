import { AppError } from '@/utils/errors';
import { z } from 'zod';
import { UserRole, ReadingLevel } from '@shared/types';
import { env } from '@/config/env';
import ms from 'ms'; // Import ms for cookie expiry
import { logger } from '@/utils/logger'; // Import logger for OAuth callback error logging
// Validation schemas
const adminSignupSchema = z.object({
    email: z.string().email().max(254, 'Email cannot exceed 254 characters'),
    password: z.string().min(8),
    fullName: z.string().min(2).max(100, 'Full name cannot exceed 100 characters')
});
const adminLoginSchema = z.object({
    email: z.string().email().max(254, 'Email cannot exceed 254 characters'),
    password: z.string(),
});
const studentCreateSchema = z.object({
    fullName: z.string().min(2).max(100, 'Full name cannot exceed 100 characters'),
    pin: z.string().length(4).regex(/^\d+$/),
    age: z.number().int().positive().max(120, 'Age seems too high'),
    readingLevel: z.nativeEnum(ReadingLevel).optional().nullable(),
});
const studentLoginSchema = z.object({
    studentId: z.string(),
    pin: z.string(),
});
const resetPasswordSchema = z.object({
    currentPassword: z.string(),
    newPassword: z.string().min(8),
});
const resetPinSchema = z.object({
    studentId: z.string(),
    newPin: z.string().min(4).max(6),
});
const forgotPasswordSchema = z.object({
    email: z.string().email('Invalid email format').max(254, 'Email cannot exceed 254 characters'),
});
const updatePasswordSchema = z.object({
    newPassword: z.string().min(8, 'Password must be at least 8 characters'),
});
// Google OAuth callback schema
const oauthCallbackSchema = z.object({
    code: z.string(),
});
// --- Utility Function for DTO mapping ---
// Maps the full Profile DB object to the shared StudentProfile DTO
function mapToStudentProfileDTO(profile) {
    if (profile.role !== 'STUDENT' || !profile.adminId) {
        throw new Error('Cannot map non-student profile to StudentProfileDTO');
    }
    return {
        id: profile.id,
        fullName: profile.fullName ?? '',
        avatarUrl: profile.avatarUrl ?? undefined,
        role: UserRole.STUDENT,
        createdAt: profile.createdAt,
        adminId: profile.adminId,
        age: profile.age,
        readingLevel: profile.readingLevel
    };
}
// Define reusable cookie options for ADMIN refresh token
const adminRefreshTokenCookieOptions = {
    httpOnly: true,
    secure: env.NODE_ENV === 'production',
    path: '/',
    sameSite: 'lax',
    maxAge: ms('30d')
};
// Define reusable cookie options for STUDENT refresh token
const studentRefreshTokenCookieOptions = {
    httpOnly: true,
    secure: env.NODE_ENV === 'production',
    path: '/', // Specify a path if needed, e.g., '/api/v1/auth' or '/'
    sameSite: 'lax',
    // Use the specific expiry for student refresh tokens
    maxAge: env.JWT_REFRESH_TOKEN_EXPIRY_SECONDS * 1000, // Convert seconds to milliseconds
};
export class AuthController {
    constructor(authService) {
        this.authService = authService;
        // Admin signup with email/password
        this.signUpAdmin = async (req, res, next) => {
            try {
                const { email, password, fullName } = adminSignupSchema.parse(req.body);
                const result = await this.authService.signUpWithEmail(email, password, fullName);
                res.status(201).json({
                    status: 'success',
                    message: 'Admin account created successfully',
                    data: {
                        userId: result.user.id,
                        email: result.user.email,
                        profile: result.profile
                    }
                });
            }
            catch (error) {
                if (error instanceof z.ZodError) {
                    res.status(400).json({
                        status: 'error',
                        message: 'Invalid input',
                        data: error.errors,
                    });
                }
                else if (error instanceof AppError) {
                    res.status(error.statusCode).json({
                        status: 'error',
                        message: error.message,
                    });
                }
                else {
                    res.status(500).json({
                        status: 'error',
                        message: 'Failed to create admin account',
                    });
                }
            }
        };
        // Resend email verification
        this.resendVerificationEmail = async (req, res, next) => {
            try {
                const { email } = z.object({ email: z.string().email() }).parse(req.body);
                await this.authService.resendVerificationEmail(email);
                res.status(200).json({
                    status: 'success',
                    message: 'Verification email sent successfully',
                });
            }
            catch (error) {
                if (error instanceof z.ZodError) {
                    res.status(400).json({
                        status: 'error',
                        message: 'Invalid email address',
                        data: error.errors,
                    });
                }
                else if (error instanceof AppError) {
                    res.status(error.statusCode).json({
                        status: 'error',
                        message: error.message,
                    });
                }
                else {
                    res.status(500).json({
                        status: 'error',
                        message: 'Failed to resend verification email',
                    });
                }
            }
        };
        // Forgot password request
        this.forgotPassword = async (req, res, next) => {
            try {
                const { email } = forgotPasswordSchema.parse(req.body);
                await this.authService.forgotPassword(email);
                res.status(200).json({
                    status: 'success',
                    message: 'If an account with this email exists, a password reset link has been sent.',
                });
            }
            catch (error) {
                if (error instanceof z.ZodError) {
                    res.status(400).json({
                        status: 'error',
                        message: 'Invalid email address',
                        data: error.errors,
                    });
                }
                else if (error instanceof AppError) {
                    res.status(error.statusCode).json({
                        status: 'error',
                        message: error.message,
                    });
                }
                else {
                    res.status(500).json({
                        status: 'error',
                        message: 'Failed to process password reset request',
                    });
                }
            }
        };
        // Update password during reset flow
        this.updatePassword = async (req, res, next) => {
            try {
                const { newPassword } = updatePasswordSchema.parse(req.body);
                // Get the current user from Supabase session
                // The user should be authenticated via the email link
                const authHeader = req.headers.authorization;
                const token = authHeader && authHeader.startsWith('Bearer ') ? authHeader.substring(7) : null;
                if (!token) {
                    return next(new AppError('No authentication token provided. Please use the link from your email.', 401));
                }
                await this.authService.updatePassword(token, newPassword);
                res.status(200).json({
                    status: 'success',
                    message: 'Password updated successfully. You can now sign in with your new password.',
                });
            }
            catch (error) {
                if (error instanceof z.ZodError) {
                    res.status(400).json({
                        status: 'error',
                        message: 'Invalid password format',
                        data: error.errors,
                    });
                }
                else if (error instanceof AppError) {
                    res.status(error.statusCode).json({
                        status: 'error',
                        message: error.message,
                    });
                }
                else {
                    res.status(500).json({
                        status: 'error',
                        message: 'Failed to update password',
                    });
                }
            }
        };
        // Initiate Google OAuth sign-in
        this.initiateGoogleLogin = async (req, res, next) => {
            try {
                const data = await this.authService.initiateGoogleSignIn();
                res.status(200).json({
                    status: 'success',
                    data: {
                        url: data.url
                    }
                });
            }
            catch (error) {
                if (error instanceof AppError) {
                    res.status(error.statusCode).json({
                        status: 'error',
                        message: error.message,
                    });
                }
                else {
                    res.status(500).json({
                        status: 'error',
                        message: 'Failed to initiate Google sign-in',
                    });
                }
            }
        };
        // Handle Google OAuth callback
        this.handleOAuthCallback = async (req, res, next) => {
            try {
                const { token } = req.query;
                if (!token || typeof token !== 'string') {
                    throw new AppError('Invalid or missing token', 400);
                }
                const result = await this.authService.handleOAuthCallback(token);
                if (!result.session) {
                    logger.error('OAuth callback resulted in a null session.', { userId: result.user?.id });
                    throw new AppError('Authentication failed: Could not establish session.', 500);
                }
                // Set refresh token cookie before potential redirect
                if (result.session.refresh_token) {
                    res.cookie('refresh-token', result.session.refresh_token, adminRefreshTokenCookieOptions); // Use admin options
                }
                else {
                    logger.warn('Refresh token missing from Supabase session on OAuth callback');
                }
                if (!result.profile) {
                    // Redirect to complete profile (cookie is already set)
                    res.redirect('/auth/complete-profile');
                    return;
                }
                // Redirect to appropriate dashboard (cookie is already set)
                if (result.profile.role === 'ADMIN') {
                    res.redirect('/admin/dashboard');
                }
                else {
                    // Assuming non-admins might have a profile but shouldn't get here via OAuth?
                    // Or maybe redirect other roles to a general dashboard
                    res.redirect('/dashboard');
                }
            }
            catch (error) {
                logger.error('OAuth callback error:', error);
                res.redirect('/auth/error');
            }
        };
        // Step 1: Admin login with email/password
        this.loginAdmin = async (req, res, next) => {
            try {
                // Log the received body before parsing
                console.log('Received body for /auth/login:', JSON.stringify(req.body, null, 2));
                const { email, password } = adminLoginSchema.parse(req.body);
                const { user, profile, session } = await this.authService.loginAdmin(email, password);
                if (!session) {
                    // Use next(error) for consistency if using global error handler
                    return next(new AppError('Login failed, no session returned.', 500));
                }
                // Set ADMIN refresh-token cookie
                if (session.refresh_token) {
                    res.cookie('refresh-token', session.refresh_token, adminRefreshTokenCookieOptions); // Use admin options
                }
                else {
                    logger.warn('Refresh token missing from Supabase session on admin login');
                }
                // Send access token and user data in response body
                res.status(200).json({
                    status: 'success',
                    message: 'Admin login successful',
                    data: {
                        userId: user.id,
                        accessToken: session.access_token, // Keep access token in body
                        email: user.email,
                        // Optionally return limited profile info if needed
                        // profile: { role: profile.role, fullName: profile.fullName } 
                    }
                });
            }
            catch (error) {
                // Consistent error handling
                if (error instanceof z.ZodError) {
                    console.error('Zod validation error during admin login:', error.errors);
                    next(new AppError('Invalid input', 400));
                }
                else if (error instanceof AppError) {
                    next(error);
                }
                else {
                    logger.error('Admin login failed:', error);
                    next(new AppError('Invalid credentials', 401));
                }
            }
        };
        // Create student profile
        this.createStudent = async (req, res, next) => {
            try {
                const { fullName, pin, age, readingLevel } = studentCreateSchema.parse(req.body);
                const adminId = req.user?.id;
                if (!adminId) {
                    return next(new AppError('Admin authentication required', 401));
                }
                // Fix: Ensure readingLevel passed to service is ReadingLevel | null
                const readingLevelToPass = readingLevel === undefined ? null : readingLevel;
                const createdProfile = await this.authService.createStudent(adminId, fullName, pin, age, readingLevelToPass);
                const studentDTO = mapToStudentProfileDTO(createdProfile);
                res.status(201).json({
                    status: 'success',
                    message: 'Student created successfully',
                    data: studentDTO, // Return the mapped DTO
                });
            }
            catch (error) {
                if (error instanceof z.ZodError) {
                    next(new AppError('Invalid input', 400));
                }
                else if (error instanceof AppError) {
                    next(error);
                }
                else {
                    logger.error('Failed to create student profile:', error);
                    next(new AppError('Failed to create student profile', 500));
                }
            }
        };
        // Student login
        this.loginStudent = async (req, res, next) => {
            try {
                const { studentId, pin } = studentLoginSchema.parse(req.body);
                // Service now returns profile, accessToken, refreshToken
                const { profile, accessToken, refreshToken } = await this.authService.loginStudent(studentId, pin);
                // --- Set HttpOnly Cookie for Refresh Token ---
                res.cookie('student_refresh_token', refreshToken, studentRefreshTokenCookieOptions); // Use student options
                // Map profile to DTO (excluding sensitive info like pin)
                const studentDTO = mapToStudentProfileDTO(profile);
                // Return access token and DTO in the response body
                res.status(200).json({
                    // Non-standard wrapper for student login
                    accessToken,
                    profile: studentDTO,
                });
            }
            catch (error) {
                if (error instanceof z.ZodError) {
                    next(new AppError('Invalid input', 400));
                }
                else if (error instanceof AppError) {
                    // Pass specific status code (e.g., 401 for invalid pin/id)
                    next(error);
                }
                else {
                    logger.error('Student login failed:', error);
                    next(new AppError('Student login failed', 500));
                }
            }
        };
        // --- Refresh Student Token (New Method) --- //
        this.refreshStudentToken = async (req, res, next) => {
            try {
                const refreshToken = req.cookies?.student_refresh_token;
                if (!refreshToken) {
                    return next(new AppError('Refresh token not found', 401));
                }
                const { newAccessToken } = await this.authService.refreshStudentToken(refreshToken);
                // Send the new access token in the standard response format
                res.status(200).json({
                    status: 'success',
                    data: {
                        accessToken: newAccessToken
                    }
                });
            }
            catch (error) {
                // Errors from service (like expired/invalid token) will be AppErrors
                next(error);
            }
        };
        // Refresh ADMIN token (Existing, ensure it uses admin cookie options if different)
        this.refreshToken = async (req, res, next) => {
            try {
                const refreshToken = req.cookies?.['refresh-token']; // Use the admin cookie name
                if (!refreshToken) {
                    return next(new AppError('Refresh token not found', 401));
                }
                const { accessToken, newRefreshToken } = await this.authService.refreshSession(refreshToken);
                // If Supabase rotated the refresh token, set the new one
                if (newRefreshToken) {
                    logger.info('Setting new rotated refresh token cookie (admin).');
                    res.cookie('refresh-token', newRefreshToken, adminRefreshTokenCookieOptions); // Use admin options
                }
                // Send only the new access token in the standard response format
                res.status(200).json({
                    status: 'success',
                    data: {
                        accessToken: accessToken
                    }
                });
            }
            catch (error) {
                // Clear potentially invalid cookie on failure
                res.clearCookie('refresh-token', adminRefreshTokenCookieOptions); // Use admin options
                next(error); // Pass error to global handler
            }
        };
        // --- Logout Student (New Method) --- //
        this.logoutStudent = async (req, res, next) => {
            try {
                // Clear the student refresh token cookie
                res.clearCookie('student_refresh_token', studentRefreshTokenCookieOptions); // Use student options
                res.status(200).json({
                    status: 'success',
                    message: 'Student logged out successfully'
                });
            }
            catch (error) {
                // Should generally not fail, but handle just in case
                logger.error('Error during student logout:', error);
                next(new AppError('Logout failed', 500));
            }
        };
        // Logout Admin (single session only - use invalidateAllSessions for all devices)
        this.logout = async (req, res, next) => {
            try {
                await this.authService.logout();
                // Clear ADMIN refresh token cookie
                res.clearCookie('refresh-token', adminRefreshTokenCookieOptions); // Use admin options
                res.status(200).json({
                    status: 'success',
                    message: 'Logout successful'
                });
            }
            catch (error) {
                next(error); // Pass error to global handler
            }
        };
        // Reset admin password (Existing)
        this.resetAdminPassword = async (req, res, next) => {
            try {
                const { currentPassword, newPassword } = resetPasswordSchema.parse(req.body);
                const userId = req.user?.id;
                if (!userId) {
                    return next(new AppError('User ID not found in request', 401));
                }
                const updatedProfile = await this.authService.resetAdminPassword(userId, currentPassword, newPassword);
                res.status(200).json({
                    status: 'success',
                    message: 'Password reset successfully',
                    // Optionally return limited profile data
                    // data: { userId: updatedProfile.id }
                });
            }
            catch (error) {
                if (error instanceof z.ZodError) {
                    next(new AppError('Invalid input', 400));
                }
                else {
                    next(error); // Handles AppErrors from service (like 403 for wrong password)
                }
            }
        };
        // Invalidate all sessions for the current user (global logout)
        this.invalidateAllSessions = async (req, res) => {
            try {
                const userId = req.user?.id;
                if (!userId) {
                    res.status(401).json({ status: 'error', message: 'User not authenticated' });
                    return;
                }
                await this.authService.invalidateAllSessions(userId);
                // Clear refresh token cookies
                res.clearCookie('refreshToken', { httpOnly: true, secure: true, sameSite: 'strict' });
                res.clearCookie('studentRefreshToken', { httpOnly: true, secure: true, sameSite: 'strict' });
                res.status(200).json({ status: 'success', message: 'All sessions invalidated successfully' });
            }
            catch (error) {
                logger.error('Error invalidating all sessions:', error);
                if (error instanceof AppError) {
                    res.status(error.statusCode).json({ error: error.message });
                }
                else {
                    res.status(500).json({ status: 'error', message: 'Failed to invalidate all sessions' });
                }
            }
        };
        // Reset student PIN (Existing)
        this.resetStudentPin = async (req, res, next) => {
            try {
                const { studentId, newPin } = resetPinSchema.parse(req.body);
                const adminId = req.user?.id; // Get admin ID from authentication middleware
                if (!adminId) {
                    return next(new AppError('Admin authentication required', 401));
                }
                // Optional: Add service layer check if admin owns this student
                await this.authService.resetStudentPin(studentId, newPin);
                res.status(200).json({
                    status: 'success',
                    message: 'Student PIN reset successfully',
                });
            }
            catch (error) {
                if (error instanceof z.ZodError) {
                    next(new AppError('Invalid input', 400));
                }
                else if (error instanceof AppError) {
                    // Pass specific errors like 404 Not Found from service
                    next(error);
                }
                else {
                    logger.error('Failed to reset student PIN:', error);
                    next(new AppError('Failed to reset student PIN', 500));
                }
            }
        };
    }
}
