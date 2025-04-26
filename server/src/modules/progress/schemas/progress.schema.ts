import { z } from 'zod';

/**
 * Schema for validating progress update requests
 */
export const updateProgressSchema = z.object({
  moduleId: z.string().uuid('Invalid module ID format'),
  completed: z.boolean().optional(),
  score: z.number().int().min(0, 'Score must be a positive number').max(100, 'Score cannot exceed 100').optional(),
  timeSpentMinutes: z.number().int().min(0, 'Time spent must be a positive number').max(1440, 'Time spent cannot exceed 24 hours (1440 minutes)').optional(),
  summaryText: z.string().optional().nullable(),
});

/**
 * Schema for validating module start requests
 */
export const startModuleSchema = z.object({
  moduleId: z.string().uuid('Invalid module ID format'),
});

/**
 * Schema for validating paragraph summary submissions
 */
export const submitSummarySchema = z.object({
  moduleId: z.string().uuid('Invalid module ID format'),
  paragraphIndex: z.number().int().positive('Paragraph index must be a positive integer'),
  paragraphSummary: z.string().min(1, 'Paragraph summary cannot be empty').max(1000, 'Paragraph summary cannot exceed 1000 characters'),
  cumulativeSummary: z.string().min(1, 'Cumulative summary cannot be empty').max(10000, 'Cumulative summary cannot exceed 10000 characters'),
});

/**
 * Schema for validating progress parameter IDs
 */
export const progressIdParamSchema = z.object({
  progressId: z.string().uuid('Invalid progress record ID format'),
});

/**
 * Schema for validating student ID parameters
 */
export const studentIdParamSchema = z.object({
  studentId: z.string().uuid('Invalid student ID format'),
});

/**
 * Schema for validating module ID parameters
 */
export const moduleIdParamSchema = z.object({
  moduleId: z.string().uuid('Invalid module ID format'),
});

/**
 * Schema for validating admin updates to progress records.
 * Allows updating score, providing feedback, or marking as complete.
 */
export const AdminUpdateProgressInputSchema = z.object({
  score: z.number().int().min(0).max(100).optional().nullable(),
  teacherFeedback: z.string().max(2000, 'Teacher feedback cannot exceed 2000 characters').optional().nullable(),
  completed: z.boolean().optional(), // Use completed, aligning with service layer UpdateProgressInput
}).refine((data) => Object.keys(data).length > 0, {
    message: 'At least one field (score, teacherFeedback, completed) must be provided for update',
});

// --- DTO Schemas (used for generating OpenAPI responses) ---

/**
 * Base DTO schema for a student progress record.
 * Ensure all fields match the database schema or desired API output.
 */
export const StudentProgressSchema = z.object({
  id: z.string().uuid(),
  studentId: z.string().uuid(),
  moduleId: z.string().uuid(),
  completed: z.boolean(),
  score: z.number().int().nullable(),
  highestParagraphIndexReached: z.number().int().nullable(),
  finalSummary: z.string().nullable(),
  startedAt: z.date().nullable(),
  completedAt: z.date().nullable(),
  timeSpentMinutes: z.number().int().nullable(),
  createdAt: z.date(),
  updatedAt: z.date(),
  teacherFeedback: z.string().nullable(),
  teacherFeedbackAt: z.date().nullable(),
});

/**
 * Base DTO Schema for a paragraph submission record.
 */
export const ParagraphSubmissionSchema = z.object({
    id: z.string().uuid(),
    studentProgressId: z.string().uuid(),
    paragraphIndex: z.number().int().positive(),
    paragraphSummary: z.string(),
    cumulativeSummary: z.string(),
    submittedAt: z.date(),
    // Add other DB fields if needed in API response
    createdAt: z.date(),
    updatedAt: z.date(),
});

/**
 * DTO Schema for the detailed progress response, combining progress and submissions.
 */
export const StudentProgressDetailsDTOSchema = z.object({
    progress: StudentProgressSchema.nullable(),
    submissions: z.array(ParagraphSubmissionSchema)
});

// Infer TypeScript types from Zod schemas if needed elsewhere
export type UpdateProgressInputType = z.infer<typeof updateProgressSchema>;
export type StartModuleInputType = z.infer<typeof startModuleSchema>;
export type SubmitSummaryInputType = z.infer<typeof submitSummarySchema>;
export type AdminUpdateProgressInputType = z.infer<typeof AdminUpdateProgressInputSchema>;
export type StudentProgressDTO = z.infer<typeof StudentProgressSchema>;
export type ParagraphSubmissionDTO = z.infer<typeof ParagraphSubmissionSchema>;
export type StudentProgressDetailsDTO = z.infer<typeof StudentProgressDetailsDTOSchema>; 