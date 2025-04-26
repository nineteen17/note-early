import jwt from 'jsonwebtoken';
import ms from 'ms'; // Re-import ms
import { env } from '@/config/env';
import { UserRole } from '@shared/types';
import { logger } from '@/utils/logger';
/**
 * Generates a custom JWT for a student user.
 * @param studentProfile - The student's profile object from the database.
 * @returns The generated JWT string.
 * @throws Error if JWT generation fails.
 */
export const generateStudentToken = (studentProfile) => {
    if (studentProfile.role !== UserRole.STUDENT || !studentProfile.id || !studentProfile.adminId) {
        logger.error('Attempted to generate student token for invalid profile:', studentProfile);
        throw new Error('Invalid profile data for student token generation.');
    }
    const payload = {
        id: studentProfile.id,
        role: UserRole.STUDENT,
        adminId: studentProfile.adminId,
    };
    try {
        const secret = env.JWT_SECRET;
        // Convert env string to seconds using ms, handle potential invalid format
        // Use 'any' assertion for ms call due to persistent type issues
        let expiresInSeconds = ms(env.JWT_EXPIRES_IN) / 1000;
        if (isNaN(expiresInSeconds)) {
            logger.error(`Invalid JWT_EXPIRES_IN format: ${env.JWT_EXPIRES_IN}. Using default 1h.`);
            expiresInSeconds = 3600; // Default to 1 hour (3600 seconds)
        }
        const options = {
            expiresIn: expiresInSeconds, // Use number of seconds
            // You could add an issuer or audience claim for better security
            // issuer: 'NoteEarlyBackend',
            // audience: 'NoteEarlyStudents'
        };
        const token = jwt.sign(payload, secret, options);
        return token;
    }
    catch (error) {
        logger.error('Failed to sign student JWT:', error);
        throw new Error('Could not generate student token.');
    }
};
// Optional: Add a verification function here later if desired
// export const verifyStudentToken = (token: string): StudentJwtPayload => { ... } 
