import { Request, Response, NextFunction } from 'express';
import { supabase } from '@config/supabase';
import { db } from '@/db';
import { profiles } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { UserRole } from '@shared/types';
import jwt from 'jsonwebtoken';
import { env } from '@/config/env';
import { AppError } from '@/utils/errors';
import { logger } from '@/utils/logger';

// Extend Express Request type to include user
declare global {
  namespace Express {
    interface Request {
      user?: {
        id: string;
        role: UserRole;
        isSuperAdmin?: boolean;
      };
    }
  }
}

// Middleware to authenticate admin users (Restoring this function)
export const authenticateAdmin = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  // --- Restoring Original Logic --- 
   try {
    // Get JWT from Authorization header
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith('Bearer ')) {
      // Use AppError for consistency
      return next(new AppError('No token provided', 401));
    }

    const token = authHeader.split(' ')[1];
    // Verify token with Supabase
    const { data: { user }, error } = await supabase.auth.getUser(token);
    
    if (error || !user) {
       console.error('Supabase getUser error in authenticateAdmin:', error?.message || 'No user returned');
       return next(new AppError('Invalid or expired token', 401));
    }

    // Get user profile from database
    const [profile] = await db
      .select()
      .from(profiles)
      .where(eq(profiles.id, user.id));

    if (!profile) {
       return next(new AppError('Admin profile not found', 403));
    }

    // Check if the user has ADMIN or SUPER_ADMIN role
    if (profile.role !== UserRole.ADMIN && profile.role !== UserRole.SUPER_ADMIN) {
       return next(new AppError('Admin or SuperAdmin privileges required', 403));
    }

    // Add user info to request
    req.user = {
      id: user.id,
      role: profile.role as UserRole,
      isSuperAdmin: profile.role === UserRole.SUPER_ADMIN
    };

    next();
  } catch (error) {
     console.error("Admin Authentication middleware error:", error);
     next(new AppError('Authentication failed', 500));
  }
  // --- End Restored Logic ---
};

// Middleware to authenticate any valid user (admin or student)
export const authenticateUser = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  const authHeader = req.headers.authorization;
  const studentToken = req.cookies?.student_token;

  try {
    // --- Case 1: Bearer Token (Admin/SuperAdmin) ---
    if (authHeader?.startsWith('Bearer ')) {
      const rawToken = authHeader.split(' ')[1];
      const token = rawToken.trim();
      
      logger.info('Middleware received token:', token);
      
      const getUserResult = await supabase.auth.getUser(token);
      const user = getUserResult.data.user;
      const error = getUserResult.error;

      if (error || !user) {
        // Log the specific Supabase error for debugging
        logger.error('Supabase getUser error in middleware:', error?.message || 'No user returned');
        return next(new AppError('Invalid or expired token', 401)); // Fail directly
      }

      // Token is valid, fetch profile
      const [profile] = await db.select().from(profiles).where(eq(profiles.id, user.id));
      if (!profile) {
        return next(new AppError('Profile not found for authenticated user', 404));
      }

      // Check if role is appropriate (Admin/SuperAdmin for Bearer tokens)
      if (profile.role !== UserRole.ADMIN && profile.role !== UserRole.SUPER_ADMIN) {
          return next(new AppError('User role not authorized for this token type', 403));
      }

      req.user = { id: user.id, role: profile.role as UserRole, isSuperAdmin: profile.role === UserRole.SUPER_ADMIN };
      return next(); // Success for Bearer token

    // --- Case 2: Student Token Cookie ---
    } else if (studentToken) {
      try {
        const decoded = jwt.verify(studentToken, env.JWT_SECRET) as { id: string; role: UserRole; adminId?: string };

        if (decoded && decoded.id && decoded.role === UserRole.STUDENT) {
          // Optional: Verify student profile still exists in DB here if needed
          req.user = { id: decoded.id, role: UserRole.STUDENT, isSuperAdmin: false };
          return next(); // Success for Student token
        } else {
          return next(new AppError('Invalid student token payload', 401));
        }
      } catch (jwtError) {
        // Log the JWT error message for clarity
        const message = jwtError instanceof Error ? jwtError.message : 'Unknown JWT Error';
        console.error('Student JWT verification failed:', message);
        return next(new AppError('Invalid or expired student token', 401));
      }

    // --- Case 3: No Token ---
    } else {
      return next(new AppError('No token provided', 401));
    }
  } catch (error) {
    // Catch potential errors from DB calls or unforeseen issues
    console.error("Authentication middleware error:", error);
    next(new AppError('Authentication failed', 500));
  }
};

// Middleware to authenticate super admin users
export const authenticateSuperAdmin = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) {
     return next(new AppError('No token provided', 401));
  }

  const token = authHeader.split(' ')[1];
  try {
      const { data: { user }, error } = await supabase.auth.getUser(token);
      
      if (error || !user) {
        console.error('Supabase getUser error in SuperAdmin middleware:', error?.message || 'No user returned');
        return next(new AppError('Invalid or expired token', 401));
      }

      const [profile] = await db.select().from(profiles).where(eq(profiles.id, user.id));

      if (!profile) {
         return next(new AppError('Profile not found for authenticated user', 404));
      }

      if (profile.role !== UserRole.SUPER_ADMIN) {
         return next(new AppError('Super admin privileges required', 403));
      }

      req.user = { id: user.id, role: profile.role as UserRole, isSuperAdmin: true };
      next();
  } catch (error) {
      console.error("SuperAdmin Authentication middleware error:", error);
      next(new AppError('Authentication failed', 500));
  }
}; 