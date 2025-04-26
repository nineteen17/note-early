import { ProgressService } from '../services/progress.service';
import { db } from '@/db';
import { z } from 'zod';
import { AppError } from '@/utils/errors';
import { logger } from '@/utils/logger';
import { submitSummarySchema, startModuleSchema, moduleIdParamSchema, progressIdParamSchema, AdminUpdateProgressInputSchema } from '../schemas/progress.schema';
// Instantiate the service
const progressService = new ProgressService(db);
// --- Zod Schemas ---
// Schema for submitting a paragraph summary
// export const SubmitSummarySchema = z.object({ ... }); // Now imported
// Schema for starting progress on a module
// export const StartProgressSchema = z.object({ ... }); // Now imported
// Schema for teacher updating progress - REMOVE THIS LOCAL DEFINITION
// export const TeacherUpdateProgressSchema = z.object({
//   score: z.number().min(0).max(100).optional(),
//   teacherFeedback: z.string().optional(),
//   approved: z.boolean().optional(), // This field was mismatched
// });
// Schema for getting progress details (uses route params)
// export const ModuleIdParamSchema = z.object({ ... }); // Now imported
// Schema for generic ID param (if needed for other methods)
// export const IdParamSchema = z.object({ ... }); // Remove if unused here
// export const ProgressIdParamSchema = z.object({ ... }); // Now imported
// --- Controller Functions ---
/**
 * Handler for starting progress on a module.
 */
export const startProgress = async (req, res, next) => {
    try {
        const studentId = req.user?.id;
        if (!studentId) {
            // Use standard error response
            return res.status(401).json({ status: 'error', message: 'Authentication required.' });
        }
        const { moduleId } = startModuleSchema.parse(req.body);
        const input = { studentId, moduleId };
        const progress = await progressService.startProgress(input);
        // Use standard success response
        res.status(200).json({
            status: 'success',
            message: progress.createdAt && progress.startedAt && progress.createdAt.getTime() === progress.startedAt.getTime()
                ? 'Progress tracking started.'
                : 'Progress already exists.', // Refined message logic
            data: progress
        });
    }
    catch (error) {
        if (error instanceof z.ZodError) {
            logger.warn('Validation Error (startProgress)', { errors: error.errors });
            // Use standard error response
            return res.status(400).json({ status: 'error', message: 'Validation Error: ' + error.errors.map(e => e.message).join(', ') });
        }
        // Use standard error response for other errors
        logger.error('Error in startProgress controller:', { error });
        const message = (error instanceof AppError) ? error.message : 'Internal server error starting progress.';
        const statusCode = (error instanceof AppError) ? error.statusCode : 500;
        res.status(statusCode).json({ status: 'error', message });
    }
};
/**
 * Handler for submitting a paragraph summary.
 */
export const submitParagraphSummary = async (req, res, next) => {
    try {
        const studentId = req.user?.id;
        if (!studentId) {
            // Use standard error response
            return res.status(401).json({ status: 'error', message: 'Authentication required.' });
        }
        const validatedBody = submitSummarySchema.parse(req.body);
        const input = { ...validatedBody, studentId };
        const { submission, progress } = await progressService.submitParagraphSummary(input);
        // Use standard success response
        res.status(201).json({
            status: 'success',
            message: `Summary for paragraph ${submission.paragraphIndex} submitted successfully.${progress.completed ? ' Module completed!' : ''}`,
            data: {
                submissionId: submission.id,
                progressStatus: {
                    completed: progress.completed,
                    highestParagraphIndexReached: progress.highestParagraphIndexReached,
                    finalSummary: progress.finalSummary, // Included if module is completed
                }
            }
        });
    }
    catch (error) {
        if (error instanceof z.ZodError) {
            logger.warn('Validation Error (submitParagraphSummary)', { errors: error.errors });
            // Use standard error response
            return res.status(400).json({ status: 'error', message: 'Validation Error: ' + error.errors.map(e => e.message).join(', ') });
        }
        // Use standard error response for other errors
        logger.error('Error in submitParagraphSummary controller:', { error });
        const message = (error instanceof AppError) ? error.message : 'Internal server error submitting summary.';
        const statusCode = (error instanceof AppError) ? error.statusCode : 500;
        res.status(statusCode).json({ status: 'error', message });
    }
};
/**
 * Handler for getting detailed progress for a student on a specific module.
 */
export const getStudentProgressDetails = async (req, res, next) => {
    try {
        const studentId = req.user?.id;
        if (!studentId) {
            // Use standard error response
            return res.status(401).json({ status: 'error', message: 'Authentication required.' });
        }
        const { moduleId } = moduleIdParamSchema.parse(req.params);
        const { progress, submissions } = await progressService.getStudentProgressDetails(studentId, moduleId);
        // if (!progress) { // Handle case where progress might not exist yet
        //     return res.status(200).json({ status: 'success', data: { progress: null, submissions: [] }});
        // }
        // Use standard success response
        res.status(200).json({ status: 'success', data: { progress, submissions } });
    }
    catch (error) {
        if (error instanceof z.ZodError) {
            logger.warn('Validation Error (getStudentProgressDetails)', { errors: error.errors });
            // Use standard error response
            return res.status(400).json({ status: 'error', message: 'Invalid Module ID format' });
        }
        // Use standard error response for other errors
        logger.error('Error in getStudentProgressDetails controller:', { error });
        const message = (error instanceof AppError) ? error.message : 'Internal server error retrieving progress details.';
        const statusCode = (error instanceof AppError) ? error.statusCode : 500;
        res.status(statusCode).json({ status: 'error', message });
    }
};
/**
 * Handler for teacher/admin updating a student's progress.
 */
export const updateProgressByTeacher = async (req, res, next) => {
    try {
        const teacherId = req.user?.id;
        if (!teacherId) {
            // Use standard error response
            return res.status(401).json({ status: 'error', message: 'Authentication required.' });
        }
        const { progressId } = progressIdParamSchema.parse(req.params);
        const updateData = AdminUpdateProgressInputSchema.parse(req.body);
        // Ensure at least one field is being updated (Zod schema refinement handles this now)
        // if (Object.keys(updateData).length === 0) {
        //   return res.status(400).json({ status: 'error', message: 'No update data provided.'});
        // }
        const updatedProgress = await progressService.updateProgress(progressId, updateData, true);
        // Use standard success response
        res.status(200).json({ status: 'success', data: updatedProgress });
    }
    catch (error) {
        if (error instanceof z.ZodError) {
            logger.warn('Validation Error (updateProgressByTeacher)', { errors: error.errors });
            // Use standard error response
            const message = 'Validation Error: ' + error.errors.map(e => e.message).join(', ');
            return res.status(400).json({ status: 'error', message });
        }
        // Use standard error response for other errors
        logger.error('Error in updateProgressByTeacher controller:', { error });
        const message = (error instanceof AppError) ? error.message : 'Internal server error updating progress.';
        const statusCode = (error instanceof AppError) ? error.statusCode : 500;
        res.status(statusCode).json({ status: 'error', message });
    }
};
/**
 * Handler for getting all progress records for the currently authenticated student.
 */
export const getAllStudentProgress = async (req, res, next) => {
    try {
        const studentId = req.user?.id;
        if (!studentId) {
            // Use standard error response
            return res.status(401).json({ status: 'error', message: 'Authentication required.' });
        }
        const progressList = await progressService.getAllStudentProgress(studentId);
        // Use standard success response
        res.status(200).json({ status: 'success', data: progressList });
    }
    catch (error) {
        // Use standard error response for other errors
        logger.error('Error in getAllStudentProgress controller:', { error });
        const message = (error instanceof AppError) ? error.message : 'Internal server error retrieving student progress list.';
        const statusCode = (error instanceof AppError) ? error.statusCode : 500;
        res.status(statusCode).json({ status: 'error', message });
    }
};
/**
 * Handler for getting all progress records for a specific module (teacher/admin view).
 */
export const getAllModuleProgress = async (req, res, next) => {
    try {
        const { moduleId } = moduleIdParamSchema.parse(req.params);
        const progressList = await progressService.getAllModuleProgress(moduleId);
        // Use standard success response
        res.status(200).json({ status: 'success', data: progressList });
    }
    catch (error) {
        if (error instanceof z.ZodError) {
            logger.warn('Validation Error (getAllModuleProgress)', { errors: error.errors });
            // Use standard error response
            return res.status(400).json({ status: 'error', message: 'Invalid Module ID format' });
        }
        // Use standard error response for other errors
        logger.error('Error in getAllModuleProgress controller:', { error });
        const message = (error instanceof AppError) ? error.message : 'Internal server error retrieving module progress list.';
        const statusCode = (error instanceof AppError) ? error.statusCode : 500;
        res.status(statusCode).json({ status: 'error', message });
    }
};
