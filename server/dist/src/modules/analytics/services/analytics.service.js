import { db } from '@/db';
import * as schema from '@/db/schema';
import { eq, and, count, sql, desc, gte, sum, avg, max } from 'drizzle-orm';
import { AppError } from '@/utils/errors';
import { logger } from '@/utils/logger';
export class AnalyticsService {
    constructor(dbInstance = db) {
        this.db = dbInstance;
    }
    /**
     * Get summary statistics for a teacher's students
     */
    async getTeacherStudentStats(teacherId) {
        try {
            // Get count of students for this teacher
            const studentCountResult = await this.db
                .select({ count: count() })
                .from(schema.profiles)
                .where(eq(schema.profiles.adminId, teacherId))
                .execute();
            const studentCount = studentCountResult[0]?.count || 0;
            // Get active subscription information
            const subscriptionResult = await this.db
                .select()
                .from(schema.profiles)
                .where(eq(schema.profiles.id, teacherId))
                .execute();
            const teacher = subscriptionResult[0];
            if (!teacher) {
                throw new AppError('Teacher not found', 404);
            }
            // Get module completion statistics for this teacher's students
            const completedModulesQuery = await this.db
                .select({
                totalModules: count(),
                completedModules: count(schema.studentProgress.completed),
            })
                .from(schema.studentProgress)
                .innerJoin(schema.profiles, eq(schema.studentProgress.studentId, schema.profiles.id))
                .where(eq(schema.profiles.adminId, teacherId))
                .execute();
            const completionStats = completedModulesQuery[0] || {
                totalModules: 0,
                completedModules: 0
            };
            // Calculate completion rate
            const completionRate = completionStats.totalModules > 0
                ? (completionStats.completedModules / completionStats.totalModules) * 100
                : 0;
            return {
                studentCount,
                subscriptionTier: teacher.subscriptionPlan,
                subscriptionStatus: teacher.subscriptionStatus,
                moduleStats: {
                    totalModules: completionStats.totalModules,
                    completedModules: completionStats.completedModules,
                    completionRate: Math.round(completionRate * 10) / 10 // Round to 1 decimal place
                }
            };
        }
        catch (error) {
            if (error instanceof AppError) {
                throw error;
            }
            logger.error('Error getting teacher student stats:', {
                teacherId,
                error,
            });
            throw new AppError('Failed to get teacher student statistics', 500);
        }
    }
    /**
     * Get student progress over time (last 30 days by default)
     */
    async getStudentProgressOverTime(studentId, days = 30) {
        try {
            const startDate = new Date();
            startDate.setDate(startDate.getDate() - days);
            // Get progress records for this student in the date range
            const progressResults = await this.db
                .select({
                date: sql `DATE(${schema.studentProgress.updatedAt})`,
                modulesActive: count(), // Total modules worked on
                modulesCompleted: count(sql `CASE WHEN ${schema.studentProgress.completed} = true THEN 1 END`), // Only count completed ones
                timeSpent: sum(schema.studentProgress.timeSpentMinutes),
                averageScore: avg(schema.studentProgress.score),
                lastActivity: max(schema.studentProgress.updatedAt),
            })
                .from(schema.studentProgress)
                .where(and(eq(schema.studentProgress.studentId, studentId), gte(schema.studentProgress.updatedAt, startDate)))
                .groupBy(sql `DATE(${schema.studentProgress.updatedAt})`)
                .orderBy(sql `DATE(${schema.studentProgress.updatedAt})`)
                .execute();
            return {
                progressByDay: progressResults.map(day => ({
                    date: day.date,
                    modulesActive: day.modulesActive,
                    modulesCompleted: day.modulesCompleted,
                    timeSpent: day.timeSpent || 0,
                    averageScore: day.averageScore || 0,
                    lastActivity: day.lastActivity,
                })),
            };
        }
        catch (error) {
            if (error instanceof AppError) {
                throw error;
            }
            logger.error('Error getting student progress over time:', {
                studentId,
                days,
                error,
            });
            throw new AppError('Failed to get student progress over time', 500);
        }
    }
    /**
     * Get most popular reading modules
     */
    async getPopularModules(limit = 10) {
        try {
            const popularModules = await this.db
                .select({
                moduleId: schema.studentProgress.moduleId,
                moduleTitle: schema.readingModules.title,
                startCount: count(),
                completionCount: count(schema.studentProgress.completed),
            })
                .from(schema.studentProgress)
                .innerJoin(schema.readingModules, eq(schema.studentProgress.moduleId, schema.readingModules.id))
                .groupBy(schema.studentProgress.moduleId, schema.readingModules.title)
                .orderBy(desc(count()))
                .limit(limit)
                .execute();
            return popularModules.map(module => ({
                moduleId: module.moduleId,
                title: module.moduleTitle,
                startCount: module.startCount,
                completionCount: module.completionCount,
                completionRate: module.startCount > 0
                    ? (module.completionCount / module.startCount) * 100
                    : 0,
            }));
        }
        catch (error) {
            logger.error('Error getting popular modules:', {
                limit,
                error,
            });
            throw new AppError('Failed to get popular modules', 500);
        }
    }
    /**
     * Get subscription statistics
     */
    async getSubscriptionStats() {
        try {
            // Count users by subscription plan
            const planStats = await this.db
                .select({
                plan: schema.profiles.subscriptionPlan,
                count: count(),
            })
                .from(schema.profiles)
                .groupBy(schema.profiles.subscriptionPlan)
                .execute();
            // Count subscriptions by status
            const statusStats = await this.db
                .select({
                status: schema.profiles.subscriptionStatus,
                count: count(),
            })
                .from(schema.profiles)
                .groupBy(schema.profiles.subscriptionStatus)
                .execute();
            // Get recent payment history
            const thirtyDaysAgo = new Date();
            thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
            const recentPayments = await this.db
                .select({
                date: sql `DATE(${schema.paymentHistory.createdAt})`,
                total: sum(schema.paymentHistory.amount),
                count: count(),
            })
                .from(schema.paymentHistory)
                .where(gte(schema.paymentHistory.createdAt, thirtyDaysAgo))
                .groupBy(sql `DATE(${schema.paymentHistory.createdAt})`)
                .orderBy(sql `DATE(${schema.paymentHistory.createdAt})`)
                .execute();
            return {
                planDistribution: planStats.map(stat => ({
                    plan: stat.plan,
                    count: stat.count,
                })),
                statusDistribution: statusStats.map(stat => ({
                    status: stat.status,
                    count: stat.count,
                })),
                recentRevenue: recentPayments.map(day => ({
                    date: day.date,
                    total: parseFloat(day.total?.toString() || '0'),
                    count: day.count,
                })),
            };
        }
        catch (error) {
            logger.error('Error getting subscription stats:', {
                error,
            });
            throw new AppError('Failed to get subscription statistics', 500);
        }
    }
}
