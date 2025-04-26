import { Request, Response, NextFunction } from 'express';
import { ProfileService } from '../services/profile.service';
import { AppError } from '@/utils/errors';
import { z } from 'zod';
import { ProfileUpdateRequestSchema, AdminUpdateStudentRequestSchema, profileIdParamSchema } from '../schemas/profile.schema';
import { UserRole } from '@shared/types';

/**
 * Controller for profile-related operations
 */
export class ProfileController {
  private profileService: ProfileService;

  constructor() {
    this.profileService = new ProfileService();
  }

  /**
   * Get all profiles managed by the authenticated admin
   */
  async getProfilesByAdmin(req: Request, res: Response, next: NextFunction) {
    try {
      const adminId = req.user?.id;
      
      if (!adminId) {
        return res.status(401).json({
          status: 'error',
          message: 'Authentication required'
        });
      }
      
      const profiles = await this.profileService.getProfilesByAdminId(adminId);
      
      return res.status(200).json({
        status: 'success',
        data: profiles
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get a profile by ID
   */
  async getProfileById(req: Request, res: Response, next: NextFunction) {
    try {
      const { profileId } = req.params;
      
      if (!profileId) {
        return res.status(400).json({
          status: 'error',
          message: 'Profile ID is required'
        });
      }
      
      // Use uppercase 'ADMIN' for comparison
      if (req.user?.role !== 'ADMIN' && req.user?.id !== profileId) {
        return res.status(403).json({
          status: 'error',
          message: 'Unauthorized to access this profile'
        });
      }
      
      const profile = await this.profileService.getProfileById(profileId);
      
      return res.status(200).json({
        status: 'success',
        data: profile
      });
    } catch (error) {
      if (error instanceof AppError && error.statusCode === 404) {
        return res.status(404).json({
          status: 'error',
          message: 'Profile not found'
        });
      }
      next(error);
    }
  }

  /**
   * Delete a profile
   */
  async deleteProfile(req: Request, res: Response, next: NextFunction) {
    try {
      const { profileId } = req.params;
      const adminId = req.user?.id;
      
      if (!profileId || !adminId) {
        return res.status(400).json({
          status: 'error',
          message: 'Profile ID and admin authentication are required'
        });
      }
      
      // Use uppercase 'ADMIN' for comparison
      if (req.user?.role !== 'ADMIN') {
        return res.status(403).json({
          status: 'error',
          message: 'Unauthorized: Only admins can delete profiles'
        });
      }
      
      const result = await this.profileService.deleteProfile(profileId, adminId);
      
      return res.status(200).json({
        status: 'success',
        data: result
      });
    } catch (error) {
      if (error instanceof AppError) {
        return res.status(error.statusCode).json({
          status: 'error',
          message: error.message
        });
      }
      next(error);
    }
  }

  /**
   * Get all students
   */
  async getAllStudents(req: Request, res: Response, next: NextFunction) {
    try {
      // Use uppercase 'ADMIN' for comparison
      if (req.user?.role !== 'ADMIN') {
        return res.status(403).json({
          status: 'error',
          message: 'Unauthorized: Only admins can view all students'
        });
      }
      
      const students = await this.profileService.getAllStudents();
      
      return res.status(200).json({
        status: 'success',
        data: students
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get the currently authenticated user's profile
   */
  async getMyProfile(req: Request, res: Response, next: NextFunction) {
    try {
      const profileId = req.user?.id;
      if (!profileId) {
        return next(new AppError('Authentication required', 401));
      }
      const profile = await this.profileService.getProfileById(profileId);
      return res.status(200).json({ status: 'success', data: profile });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Update the currently authenticated user's profile
   */
  async updateMyProfile(req: Request, res: Response, next: NextFunction) {
    try {
      const profileId = req.user?.id;
      if (!profileId) {
        return next(new AppError('Authentication required', 401));
      }
      // Validate body against self-update schema
      const updates = ProfileUpdateRequestSchema.parse(req.body);
      
      // Call the consolidated updateProfile method, indicating it's NOT an admin update
      const updatedProfile = await this.profileService.updateProfile(profileId, updates, profileId, false);
      
      return res.status(200).json({ status: 'success', data: updatedProfile });
    } catch (error) {
      // Handle Zod errors
      if (error instanceof z.ZodError) {
         return next(new AppError('Invalid input: ' + error.errors.map(e => e.message).join(', '), 400));
      }
      next(error);
    }
  }

  /**
   * Get a specific student profile (for admins)
   */
  async getStudentProfileByAdmin(req: Request, res: Response, next: NextFunction) {
    try {
      const { profileId } = profileIdParamSchema.parse(req.params); // Validate param
      const requestingAdminId = req.user?.id;

      if (!requestingAdminId || req.user?.role !== UserRole.ADMIN) {
        return next(new AppError('Admin authentication required', 401));
      }
      
      // Fetch the profile, service layer will handle ownership check implicitly if needed, 
      // but we could add an explicit check here or in service if required.
      // For now, rely on fetching and potential errors from service.
      const profile = await this.profileService.getProfileById(profileId);

      // Additional check: Ensure the fetched profile is a student managed by this admin
      if (profile.role !== UserRole.STUDENT || profile.adminId !== requestingAdminId) {
        return next(new AppError('Profile not found or not managed by this admin', 404));
      }
      
      return res.status(200).json({ status: 'success', data: profile });
    } catch (error) {
       if (error instanceof z.ZodError) { // Assuming z is imported
         return next(new AppError('Invalid profile ID format', 400));
       }
       // Let global handler deal with AppErrors (like 404 from service)
       next(error);
    }
  }

  /**
   * Update a specific student profile (by Admin)
   */
  async updateStudentProfileByAdmin(req: Request, res: Response, next: NextFunction) {
    try {
      const { profileId } = profileIdParamSchema.parse(req.params); // Validate param
      const requestingAdminId = req.user?.id;
      
      if (!requestingAdminId || req.user?.role !== UserRole.ADMIN) {
        return next(new AppError('Admin authentication required', 401));
      }

      // Validate body against admin-update schema
      const updates = AdminUpdateStudentRequestSchema.parse(req.body);
      
      // Call the consolidated updateProfile method, indicating it IS an admin update
      const updatedProfile = await this.profileService.updateProfile(profileId, updates, requestingAdminId, true);
      
      return res.status(200).json({ status: 'success', data: updatedProfile });
    } catch (error) {
      if (error instanceof z.ZodError) { // Assuming z is imported
         return next(new AppError('Invalid input: ' + error.errors.map(e => e.message).join(', '), 400));
      }
      next(error);
    }
  }
} 