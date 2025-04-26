import { z } from 'zod';
import { ReadingLevel } from '@shared/types'; // Import ReadingLevel enum
// Admin signup validation
export const adminSignupSchema = z.object({
    email: z.string().email('Invalid email format').max(254, 'Email cannot exceed 254 characters'),
    password: z.string().min(8, 'Password must be at least 8 characters'),
    fullName: z.string().min(2, 'Full name must be at least 2 characters').max(100, 'Full name cannot exceed 100 characters'),
});
// Admin login validation
export const adminLoginSchema = z.object({
    email: z.string().email('Invalid email format').max(254, 'Email cannot exceed 254 characters'),
    password: z.string().min(1, 'Password is required'),
});
// Student creation validation
export const createStudentSchema = z.object({
    fullName: z.string().min(2, 'Full name must be at least 2 characters').max(100, 'Full name cannot exceed 100 characters'),
    pin: z.string().length(4, 'PIN must be exactly 4 digits').regex(/^\d+$/, 'PIN must contain only digits'),
    age: z.number().int().positive('Age must be a positive integer').max(120, 'Age seems too high').optional().nullable(),
    readingLevel: z.nativeEnum(ReadingLevel).optional().nullable(),
});
// Student login validation
export const studentLoginSchema = z.object({
    studentId: z.string().uuid('Invalid student ID'),
    pin: z.string().length(4, 'PIN must be exactly 4 digits').regex(/^\d+$/, 'PIN must contain only digits'),
});
// Reset admin password validation
export const resetAdminPasswordSchema = z.object({
    userId: z.string().uuid('Invalid user ID'),
    newAdminPassword: z.string().min(6, 'Admin password must be at least 6 characters'),
});
// Reset student PIN validation
export const resetStudentPinSchema = z.object({
    studentId: z.string().uuid('Invalid student ID'),
    newPin: z.string().length(4, 'PIN must be exactly 4 digits').regex(/^\d+$/, 'PIN must contain only digits'),
});
