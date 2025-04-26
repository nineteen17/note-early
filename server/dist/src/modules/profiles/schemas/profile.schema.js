import { z } from 'zod';
import { ReadingLevel, UserRole, SubscriptionPlan } from '@shared/types'; // Import UserRole and added SubscriptionPlan
import { SubscriptionStatus } from '@/db/schema'; // Import SubscriptionStatus from db schema
/**
 * Schema for validating profile ID parameters in route paths
 */
export const profileIdParamSchema = z.object({
    profileId: z.string().uuid('Invalid profile ID format'),
});
/**
 * Base schema representing a Profile DTO (Data Transfer Object)
 * Based on the database schema but might omit sensitive fields.
 */
export const ProfileSchema = z.object({
    profileId: z.string().uuid(),
    email: z.string().email().nullable().optional(),
    fullName: z.string().nullable().optional(), // Adjusted based on DB schema
    avatarUrl: z.string().url().nullable().optional(), // Adjusted based on DB schema
    role: z.nativeEnum(UserRole).optional(), // Use UserRole enum
    adminId: z.string().uuid().optional().nullable(), // --- ADDED adminId (optional for admins)
    createdAt: z.date().or(z.string()).optional(), // Allow string for potential DB format
    updatedAt: z.date().or(z.string()).nullable().optional(),
    // --- ADDED optional age and readingLevel for Student role ---
    age: z.number().int().positive().optional().nullable(),
    readingLevel: z.nativeEnum(ReadingLevel).optional().nullable(),
    // --- ADDED subscription fields ---
    subscriptionStatus: z.enum(SubscriptionStatus.enumValues).nullable().optional(), // Use DB enum
    subscriptionPlan: z.nativeEnum(SubscriptionPlan).nullable().optional(), // Use Shared enum
    subscriptionRenewalDate: z.date().nullable().optional(), // Date or null
    // --- ADDED stripeCustomerId ---
    stripeCustomerId: z.string().nullable().optional(),
    // --- ADDED aggregated progress data (optional) ---
    completedModulesCount: z.number().int().nonnegative().optional(),
});
/**
 * Schema for validating the payload when updating a profile.
 * Users typically update their own profile.
 */
export const ProfileUpdateRequestSchema = z.object({
    fullName: z.string().min(2, 'Full name must be at least 2 characters').max(100, 'Full name cannot exceed 100 characters').optional(),
    // email: z.string().email('Invalid email format').optional(), // Email changes might go through a different flow
    avatarUrl: z.string().url('Invalid URL format').max(2048, 'Avatar URL cannot exceed 2048 characters').nullable().optional(),
}).partial().refine((data) => Object.keys(data).length > 0, {
    message: 'At least one field must be provided for update',
});
/**
 * Schema for validating the payload when an admin updates a *student's* profile.
 * This might allow different fields than a self-update.
 */
export const AdminUpdateStudentRequestSchema = z.object({
    fullName: z.string().min(2, 'Full name must be at least 2 characters').max(100, 'Full name cannot exceed 100 characters').optional(),
    // email: z.string().email('Invalid email format').optional(), // Admin email changes?
    avatarUrl: z.string().url('Invalid URL format').max(2048, 'Avatar URL cannot exceed 2048 characters').nullable().optional(),
    age: z.number().int().positive('Age must be a positive integer').max(120, 'Age seems too high').optional().nullable(), // --- ADDED optional age
    readingLevel: z.nativeEnum(ReadingLevel).optional().nullable(), // --- ADDED optional readingLevel
    // Add other fields admins are allowed to update for students
}).partial().refine((data) => Object.keys(data).length > 0, {
    message: 'At least one field must be provided for update',
});
