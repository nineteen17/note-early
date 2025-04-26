import { z } from 'zod';
// import { ReadingLevel } from '@shared/types'; // Still failing, keeping commented

// Define ReadingLevel range for validation if enum isn't available
const MIN_READING_LEVEL = 1;
const MAX_READING_LEVEL = 10;

// Schema for creating a student (Admin action)
export const createStudentSchema = z.object({
    fullName: z.string().min(2, 'Full name must be at least 2 characters').max(100, 'Full name cannot exceed 100 characters'),
    pin: z.string()
        .length(4, 'PIN must be exactly 4 digits') // Corrected length
        .regex(/^\d+$/, 'PIN must only contain digits'),
    age: z.coerce.number() // Use coerce for potential string input from form
        .int('Age must be a whole number')
        .positive('Age must be positive')
        .max(120, 'Age seems too high'), // Required as per backend
    // Use number validation since enum import failed
    readingLevel: z.coerce.number()
        .int()
        .min(MIN_READING_LEVEL)
        .max(MAX_READING_LEVEL)
        .nullable()
        .optional(), 
});

export type CreateStudentInput = z.infer<typeof createStudentSchema>;

// Schema for updating own profile (Admin/SuperAdmin)
export const updateProfileSchema = z.object({
    fullName: z.string().min(2, 'Full name must be at least 2 characters').max(100, 'Full name cannot exceed 100 characters').optional(),
    avatarUrl: z.string().url('Invalid URL format').max(2048, 'URL too long').nullable().optional(),
}).partial().refine(data => Object.keys(data).length > 0, {
    message: 'At least one field must be provided for update'
});

export type UpdateProfileInput = z.infer<typeof updateProfileSchema>;

// Schema for admin updating a student's profile
export const adminUpdateStudentSchema = z.object({
    fullName: z.string().min(2, 'Full name must be at least 2 characters').max(100, 'Full name cannot exceed 100 characters').optional(),
    avatarUrl: z.string().url('Invalid URL format').max(2048, 'URL too long').nullable().optional(),
    // Add other fields admin might update, e.g.:
    // age: z.number().int().positive().nullable().optional(),
    // readingLevel: z.nativeEnum(ReadingLevel).nullable().optional(), 
}).partial().refine(data => Object.keys(data).length > 0, {
    message: 'At least one field must be provided for update'
});

export type AdminUpdateStudentInput = z.infer<typeof adminUpdateStudentSchema>; 