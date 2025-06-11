import jwt from 'jsonwebtoken';
import ms from 'ms'; // Re-import ms
import { env } from '@/config/env';
import { UserRole } from '@shared/types';
import { logger } from '@/utils/logger';
import { AppError } from '@/utils/errors'; // Import AppError
// --- Token Generation --- //
/**
 * Generates both Access and Refresh JWTs for a student user.
 * @param studentProfile - The student's profile object from the database.
 * @returns An object containing the accessToken and refreshToken.
 * @throws AppError if validation or JWT generation fails.
 */
export const generateStudentAuthTokens = (studentProfile) => {
    if (studentProfile.role !== UserRole.STUDENT || !studentProfile.id || !studentProfile.adminId) {
        logger.error('Attempted to generate student tokens for invalid profile:', studentProfile);
        throw new AppError('Invalid profile data for student token generation.', 400);
    }
    try {
        // 1. Generate Access Token (using existing logic)
        const accessPayload = {
            id: studentProfile.id,
            role: UserRole.STUDENT,
            adminId: studentProfile.adminId,
        };
        const accessSecret = env.JWT_SECRET;
        // Calculate expiry in seconds, casting ms to any due to type issues
        let accessExpiresInSeconds;
        const expiresInMs = ms(env.JWT_EXPIRES_IN);
        if (typeof expiresInMs !== 'number') {
            logger.warn(`Invalid JWT_EXPIRES_IN format or ms() failed for ${env.JWT_EXPIRES_IN}. Using default 15m.`);
            accessExpiresInSeconds = 900; // Default to 15 mins (900 seconds)
        }
        else {
            accessExpiresInSeconds = expiresInMs / 1000;
        }
        const accessOptions = { expiresIn: accessExpiresInSeconds };
        const accessToken = jwt.sign(accessPayload, accessSecret, accessOptions);
        // 2. Generate Refresh Token
        const refreshPayload = {
            id: studentProfile.id,
            type: 'student_refresh',
        };
        const refreshSecret = env.JWT_REFRESH_SECRET;
        const refreshOptions = { expiresIn: env.JWT_REFRESH_TOKEN_EXPIRY_SECONDS };
        const refreshToken = jwt.sign(refreshPayload, refreshSecret, refreshOptions);
        logger.info(`Generated tokens for student ID: ${studentProfile.id}`);
        return { accessToken, refreshToken };
    }
    catch (error) {
        logger.error('Failed to sign student JWTs:', error);
        throw new AppError('Could not generate student authentication tokens.', 500);
    }
};
// --- Token Verification --- //
/**
 * Verifies a student refresh token.
 * @param token - The refresh token string.
 * @returns The verified payload.
 * @throws AppError if token is invalid or expired (401).
 */
export const verifyStudentRefreshToken = (token) => {
    try {
        const decoded = jwt.verify(token, env.JWT_REFRESH_SECRET);
        // Optional: Add more specific checks on the decoded payload if needed
        if (decoded.type !== 'student_refresh' || !decoded.id) {
            throw new Error('Invalid token payload structure');
        }
        // Return the verified payload, potentially trimming extra JWT fields if desired
        return {
            id: decoded.id,
            type: decoded.type,
        };
    }
    catch (error) {
        logger.warn('Student refresh token verification failed:', error instanceof Error ? error.message : error);
        if (error instanceof jwt.TokenExpiredError) {
            throw new AppError('Refresh token expired', 401);
        }
        else if (error instanceof jwt.JsonWebTokenError) {
            throw new AppError('Invalid refresh token', 401);
        }
        else {
            // Rethrow unexpected errors or wrap them
            throw new AppError('Could not verify refresh token', 401); // Default to 401 for verification issues
        }
    }
};
// Optional: Add a verification function here later if desired
// export const verifyStudentToken = (token: string): StudentJwtPayload => { ... } 
