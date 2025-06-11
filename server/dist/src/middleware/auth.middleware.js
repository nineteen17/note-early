import { supabase } from '@config/supabase';
import { db } from '@/db';
import { profiles } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { UserRole } from '@shared/types';
import jwt from 'jsonwebtoken';
import { env } from '@/config/env';
import { AppError } from '@/utils/errors';
import { logger } from '@/utils/logger';
// Middleware to authenticate admin users (Restoring this function)
export const authenticateAdmin = async (req, res, next) => {
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
            role: profile.role,
            isSuperAdmin: profile.role === UserRole.SUPER_ADMIN
        };
        next();
    }
    catch (error) {
        console.error("Admin Authentication middleware error:", error);
        next(new AppError('Authentication failed', 500));
    }
    // --- End Restored Logic ---
};
// Middleware to authenticate any valid user (admin or student)
export const authenticateUser = async (req, res, next) => {
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith('Bearer ')) {
        return next(new AppError('No token provided', 401));
    }
    const token = authHeader.split(' ')[1].trim();
    try {
        // --- Attempt 1: Verify as Student JWT ---
        try {
            const decoded = jwt.verify(token, env.JWT_SECRET);
            // Check if payload structure matches student access token
            if (decoded && decoded.id && decoded.role === UserRole.STUDENT && decoded.adminId) {
                // Optional: Verify student profile still exists in DB if needed for extra security
                // const [studentProfile] = await db.select().from(profiles).where(eq(profiles.id, decoded.id));
                // if (!studentProfile || studentProfile.role !== UserRole.STUDENT) {
                //    throw new Error('Student profile not found or invalid for token'); 
                // }
                logger.debug('Authenticated as Student via JWT');
                req.user = { id: decoded.id, role: UserRole.STUDENT, isSuperAdmin: false };
                return next(); // Success for Student JWT
            }
            // If structure doesn't match student token, fall through to Supabase check
            logger.debug('JWT payload did not match student structure, falling back to Supabase check.');
        }
        catch (jwtError) {
            // If JWT verification fails (expired, invalid signature, etc.), 
            // log it but proceed to check with Supabase. This is expected.
            if (jwtError instanceof jwt.TokenExpiredError) {
                logger.debug('Student JWT expired, falling back to Supabase check.');
            }
            else if (jwtError instanceof jwt.JsonWebTokenError) {
                logger.debug('Invalid student JWT signature/format, falling back to Supabase check.');
            }
            else {
                // Log unexpected JWT errors but still fallback
                logger.warn('Unexpected error during student JWT verification, falling back to Supabase check:', jwtError);
            }
        }
        // --- Attempt 2: Verify with Supabase (Admin/SuperAdmin) ---
        logger.debug('Attempting Supabase token verification.');
        const { data: { user: supabaseUser }, error: supabaseError } = await supabase.auth.getUser(token);
        if (supabaseError || !supabaseUser) {
            logger.warn('Supabase getUser verification failed after JWT fallback:', supabaseError?.message || 'No user returned');
            // Both attempts failed
            return next(new AppError('Invalid or expired token', 401));
        }
        // Supabase token is valid, fetch profile
        const [profile] = await db.select().from(profiles).where(eq(profiles.id, supabaseUser.id));
        if (!profile) {
            logger.error(`Profile not found for valid Supabase user ${supabaseUser.id}`);
            return next(new AppError('Profile not found for authenticated user', 404));
        }
        // Check if role is Admin or SuperAdmin
        if (profile.role === UserRole.ADMIN || profile.role === UserRole.SUPER_ADMIN) {
            logger.debug(`Authenticated as ${profile.role} via Supabase`);
            req.user = { id: supabaseUser.id, role: profile.role, isSuperAdmin: profile.role === UserRole.SUPER_ADMIN };
            return next(); // Success for Admin/SuperAdmin
        }
        else {
            // Valid Supabase token but unexpected role (e.g., maybe a student somehow got a Supabase session?)
            logger.warn(`Valid Supabase token for user ${supabaseUser.id} but has unexpected role: ${profile.role}`);
            return next(new AppError('User role not authorized for this endpoint', 403));
        }
    }
    catch (error) {
        // Catch potential errors from DB calls or other unforeseen issues
        logger.error("Authentication middleware error:", error);
        next(new AppError('Authentication failed', 500));
    }
};
// Middleware to authenticate super admin users
export const authenticateSuperAdmin = async (req, res, next) => {
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
        req.user = { id: user.id, role: profile.role, isSuperAdmin: true };
        next();
    }
    catch (error) {
        console.error("SuperAdmin Authentication middleware error:", error);
        next(new AppError('Authentication failed', 500));
    }
};
