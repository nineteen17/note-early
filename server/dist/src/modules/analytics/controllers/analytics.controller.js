import { AnalyticsService } from '../services/analytics.service.js';
import { AppError } from '@/utils/errors';
import { z } from 'zod';
import { logger } from '@/utils/logger';
// Define schemas for query parameters
const StudentProgressQuerySchema = z.object({
    days: z.coerce.number().int().positive().max(365, 'Days must be between 1 and 365').optional().default(30)
});
const PopularModulesQuerySchema = z.object({
    limit: z.coerce.number().int().positive().max(50, 'Limit must be between 1 and 50').optional().default(10)
});
export class AnalyticsController {
    constructor() {
        this.analyticsService = new AnalyticsService();
    }
    /**
     * Get dashboard statistics for a teacher
     */
    async getTeacherDashboard(req, res, next) {
        try {
            const teacherId = req.user?.id;
            if (!teacherId) {
                return res.status(401).json({
                    status: 'error',
                    message: 'Authentication required'
                });
            }
            const teacherStats = await this.analyticsService.getTeacherStudentStats(teacherId);
            const popularModules = await this.analyticsService.getPopularModules(5);
            return res.status(200).json({
                status: 'success',
                data: {
                    teacherStats,
                    popularModules
                }
            });
        }
        catch (error) {
            logger.error('Error in getTeacherDashboard:', { error, teacherId: req.user?.id });
            const message = (error instanceof AppError) ? error.message : 'Internal server error fetching dashboard data.';
            const statusCode = (error instanceof AppError) ? error.statusCode : 500;
            res.status(statusCode).json({ status: 'error', message });
        }
    }
    /**
     * Get student progress over time
     */
    async getStudentProgress(req, res, next) {
        try {
            const { studentId } = req.params;
            const { days } = StudentProgressQuerySchema.parse(req.query);
            if (!studentId) {
                return res.status(400).json({
                    status: 'error',
                    message: 'Student ID is required'
                });
            }
            const progressData = await this.analyticsService.getStudentProgressOverTime(studentId, days);
            return res.status(200).json({
                status: 'success',
                data: progressData
            });
        }
        catch (error) {
            if (error instanceof z.ZodError) {
                return res.status(400).json({ status: 'error', message: 'Invalid query parameter: ' + error.errors.map(e => e.message).join(', ') });
            }
            if (error instanceof AppError && error.statusCode === 404) {
                return res.status(404).json({
                    status: 'error',
                    message: 'Student not found'
                });
            }
            logger.error('Error in getStudentProgress:', { error, studentId: req.params.studentId });
            const message = (error instanceof AppError) ? error.message : 'Internal server error fetching student progress.';
            const statusCode = (error instanceof AppError) ? error.statusCode : 500;
            res.status(statusCode).json({ status: 'error', message });
        }
    }
    /**
     * Get popular modules
     */
    async getPopularModules(req, res, next) {
        try {
            const { limit } = PopularModulesQuerySchema.parse(req.query);
            const modules = await this.analyticsService.getPopularModules(limit);
            return res.status(200).json({
                status: 'success',
                data: modules
            });
        }
        catch (error) {
            if (error instanceof z.ZodError) {
                return res.status(400).json({ status: 'error', message: 'Invalid query parameter: ' + error.errors.map(e => e.message).join(', ') });
            }
            logger.error('Error in getPopularModules:', { error });
            const message = (error instanceof AppError) ? error.message : 'Internal server error fetching popular modules.';
            const statusCode = (error instanceof AppError) ? error.statusCode : 500;
            res.status(statusCode).json({ status: 'error', message });
        }
    }
    /**
     * Get subscription statistics
     */
    async getSubscriptionStats(req, res, next) {
        try {
            const stats = await this.analyticsService.getSubscriptionStats();
            return res.status(200).json({
                status: 'success',
                data: stats
            });
        }
        catch (error) {
            logger.error('Error in getSubscriptionStats:', { error });
            const message = (error instanceof AppError) ? error.message : 'Internal server error fetching subscription stats.';
            const statusCode = (error instanceof AppError) ? error.statusCode : 500;
            res.status(statusCode).json({ status: 'error', message });
        }
    }
    /**
     * Get student activity
     */
    async getStudentActivity(req, res, next) {
        try {
            const studentId = req.user?.id;
            const { days } = StudentProgressQuerySchema.parse(req.query);
            if (!studentId) {
                return res.status(401).json({
                    status: 'error',
                    message: 'Authentication required'
                });
            }
            const activityData = await this.analyticsService.getStudentProgressOverTime(studentId, days);
            return res.status(200).json({
                status: 'success',
                data: activityData
            });
        }
        catch (error) {
            logger.error('Error in getStudentActivity:', { error, studentId: req.user?.id });
            const message = (error instanceof AppError) ? error.message : 'Internal server error fetching student activity.';
            const statusCode = (error instanceof AppError) ? error.statusCode : 500;
            res.status(statusCode).json({ status: 'error', message });
        }
    }
    /**
     * Get student progress over time
     */
    async getStudentProgressOverTime(req, res, next) {
        try {
            const studentId = req.user?.id;
            const { days } = StudentProgressQuerySchema.parse(req.query);
            if (!studentId) {
                return res.status(401).json({
                    status: 'error',
                    message: 'Authentication required'
                });
            }
            const progressData = await this.analyticsService.getStudentProgressOverTime(studentId, days);
            return res.status(200).json({
                status: 'success',
                data: progressData
            });
        }
        catch (error) {
            logger.error('Error in getStudentProgressOverTime:', { error, studentId: req.user?.id });
            const message = (error instanceof AppError) ? error.message : 'Internal server error fetching student progress over time.';
            const statusCode = (error instanceof AppError) ? error.statusCode : 500;
            res.status(statusCode).json({ status: 'error', message });
        }
    }
}
