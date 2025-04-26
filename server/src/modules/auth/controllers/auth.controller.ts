import { Request, Response, NextFunction, CookieOptions } from 'express';
import { AuthService } from '../services/auth.service';
import { AppError } from '@/utils/errors';
import { z } from 'zod';
import { UserRole, StudentProfile, ReadingLevel } from '@shared/types';
import { Profile } from '@/db/schema';
import { ApiResponse } from '@shared/types';
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

// Google OAuth callback schema
const oauthCallbackSchema = z.object({
  code: z.string(),
});

// --- Utility Function for DTO mapping ---
// Maps the full Profile DB object to the shared StudentProfile DTO
function mapToStudentProfileDTO(profile: Profile): Omit<StudentProfile, 'pin'> {
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
    readingLevel: profile.readingLevel as ReadingLevel | null
  };
}

// Define reusable cookie options
const refreshTokenCookieOptions: CookieOptions = {
  httpOnly: true,
  // Explicitly set secure based on NODE_ENV. Ensure NODE_ENV is NOT 'production' for local HTTP development.
  secure: env.NODE_ENV === 'production', 
  path: '/',
  sameSite: 'lax', // Changed back to 'lax' from 'strict'
  maxAge: ms('30d') 
};

export class AuthController {
  constructor(private authService: AuthService) {}

  // Admin signup with email/password
  signUpAdmin = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
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
      } as ApiResponse);
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({
          status: 'error',
          message: 'Invalid input',
          data: error.errors,
        } as ApiResponse);
      } else if (error instanceof AppError) {
        res.status(error.statusCode).json({
          status: 'error',
          message: error.message,
        } as ApiResponse);
      } else {
        res.status(500).json({
          status: 'error',
          message: 'Failed to create admin account',
        } as ApiResponse);
      }
    }
  }

  // Initiate Google OAuth sign-in
  initiateGoogleLogin = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const data = await this.authService.initiateGoogleSignIn();
      
      res.status(200).json({
        status: 'success',
        data: {
          url: data.url
        }
      } as ApiResponse);
    } catch (error) {
      if (error instanceof AppError) {
        res.status(error.statusCode).json({
          status: 'error',
          message: error.message,
        } as ApiResponse);
      } else {
        res.status(500).json({
          status: 'error',
          message: 'Failed to initiate Google sign-in',
        } as ApiResponse);
      }
    }
  }

  // Handle Google OAuth callback
  handleOAuthCallback = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
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
         res.cookie('refresh-token', result.session.refresh_token, refreshTokenCookieOptions);
      } else {
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
      } else {
        // Assuming non-admins might have a profile but shouldn't get here via OAuth?
        // Or maybe redirect other roles to a general dashboard
        res.redirect('/dashboard'); 
      }
    } catch (error) {
      logger.error('OAuth callback error:', error);
      res.redirect('/auth/error');
    }
  }

  // Step 1: Admin login with email/password
  loginAdmin = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      // Log the received body before parsing
      console.log('Received body for /auth/login:', JSON.stringify(req.body, null, 2)); 
      
      const { email, password } = adminLoginSchema.parse(req.body);
      const { user, profile, session } = await this.authService.loginAdmin(email, password);

      if (!session) {
        // Use next(error) for consistency if using global error handler
        return next(new AppError('Login failed, no session returned.', 500)); 
      }

      // Set refresh-token cookie
      // logger.info('Session object received:', session); // Log the whole session
      if (session.refresh_token) {
        //  logger.info(`Attempting to set refresh-token cookie with value: ${session.refresh_token.substring(0, 10)}...`); // Log first 10 chars
         res.cookie('refresh-token', session.refresh_token, refreshTokenCookieOptions);
      } else {
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
        }
      } as ApiResponse);
    } catch (error) {
       // Consistent error handling
       if (error instanceof z.ZodError) {
         // Log the Zod error details for better debugging
         console.error('Zod validation error during admin login:', error.errors);
         next(new AppError('Invalid input', 400)); 
       } else if (error instanceof AppError) {
         next(error); 
       } else {
         logger.error('Admin login failed:', error); 
         next(new AppError('Invalid credentials', 401)); 
       }
    }
  }

  // Create student profile
  createStudent = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { fullName, pin, age, readingLevel } = studentCreateSchema.parse(req.body);
      const adminId = req.user?.id;
      if (!adminId) {
        return next(new AppError('Admin authentication required', 401));
      }
      
      // Fix: Ensure readingLevel passed to service is ReadingLevel | null
      const readingLevelToPass: ReadingLevel | null = readingLevel === undefined ? null : readingLevel;
      
      const createdProfile = await this.authService.createStudent(adminId, fullName, pin, age, readingLevelToPass);
      
      const studentDTO = mapToStudentProfileDTO(createdProfile);
      
      res.status(201).json({
        status: 'success',
        message: 'Student created successfully',
        data: studentDTO,
      } as ApiResponse<Omit<StudentProfile, 'pin'>>);
    } catch (error) {
      if (error instanceof z.ZodError) {
        logger.error("Zod Validation Error (createStudent):", error.errors);
        next(new AppError('Invalid input: ' + error.errors.map(e => e.message).join(', '), 400));
      } else if (error instanceof AppError) { 
        next(error);
      } else {
        logger.error('Failed to create student profile:', error);
        next(new AppError('Failed to create student profile', 500));
      }
    }
  }

  // Student login with PIN - MODIFIED
  loginStudent = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { studentId, pin } = studentLoginSchema.parse(req.body);
      // Get profile and token from the service
      const { profile: studentProfile, token } = await this.authService.loginStudent(studentId, pin);
      const studentDTO = mapToStudentProfileDTO(studentProfile);

      // Respond with token and profile in JSON body
      res.json({
        status: 'success',
        message: 'Student login successful', // Added success message
        data: {
          accessToken: token, // Include the token here
          profile: studentDTO
        }
      } as ApiResponse);

    } catch (error) {
      // Consistent error handling
       if (error instanceof z.ZodError) {
         next(new AppError('Invalid input', 400));
       } else if (error instanceof AppError) {
         next(error);
       } else {
         logger.error('Student login failed:', error);
         // Return 401 for invalid credentials instead of 500
         next(new AppError('Invalid Student ID or PIN', 401)); 
       }
    }
  }

  // Refresh token handler
  refreshToken = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const refreshToken = req.cookies['refresh-token'];
      console.log("refreshToken", refreshToken);
      console.log("req.cookies", req.cookies);
      if (!refreshToken) {
        return next(new AppError('Refresh token missing', 401));
      }

      // Call the service to refresh the session
      const newSessionData = await this.authService.refreshSession(refreshToken);

      // Set the new refresh token cookie IF it was rotated/returned
      if (newSessionData.newRefreshToken) {
        res.cookie('refresh-token', newSessionData.newRefreshToken, refreshTokenCookieOptions); 
      }

      // Send the new access token
      res.status(200).json({
        status: 'success',
        message: 'Token refreshed',
        data: {
          accessToken: newSessionData.accessToken, // Correct key: accessToken
        },
      } as ApiResponse);
      logger.info('New access token:', newSessionData.accessToken);

    } catch (error) {
      // Pass errors (like invalid refresh token from service) to the error handler
      next(error); 
    }
  }

  // Logout
  logout = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      // Sign out from Supabase (handles admin/oauth sessions)
      await this.authService.logout(); 
      
      // Clear BOTH potential cookies
      res.clearCookie('refresh-token', { path: '/', sameSite: 'lax' }); // Use same path/samesite as when set
      res.clearCookie('student_token', { path: '/', sameSite: 'strict' }); // Use same path/samesite as when set
      
      res.json({
        status: 'success',
        message: 'Logged out successfully',
      } as ApiResponse);
    } catch (error) {
      // Consistent error handling
      logger.error('Logout failed:', error);
      next(new AppError('Failed to logout', 500));
    }
  }

  // Reset admin password
  resetAdminPassword = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { currentPassword, newPassword } = resetPasswordSchema.parse(req.body);
      const userId = req.user?.id;
      if (!userId) {
        res.status(401).json({
          status: 'error',
          message: 'Unauthorized',
        } as ApiResponse);
        return;
      }
      await this.authService.resetAdminPassword(userId, currentPassword, newPassword);
      
      res.json({
        status: 'success',
        message: 'Password reset successfully',
      } as ApiResponse);
    } catch (error) {
      if (error instanceof z.ZodError) {
        next(new AppError('Invalid input', 400));
      } else if (error instanceof AppError) {
        next(error); 
      } else {
        logger.error('Reset admin password failed:', error);
        next(new AppError('Invalid password or failed to reset', 401)); 
      }
    }
  }

  // Reset student PIN
  resetStudentPin = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { studentId, newPin } = resetPinSchema.parse(req.body);
      await this.authService.resetStudentPin(studentId, newPin);
      
      res.json({
        status: 'success',
        message: 'Student PIN reset successfully',
      } as ApiResponse);
    } catch (error) {
      if (error instanceof z.ZodError) {
        next(new AppError('Invalid input', 400));
      } else if (error instanceof AppError) { 
        next(error);
      } else {
        logger.error('Reset student PIN failed:', error);
        next(new AppError('Failed to reset student PIN', 500));
      }
    }
  }
} 
