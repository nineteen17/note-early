import { describe, it, expect, beforeEach, vi } from 'vitest';
import { AnalyticsService } from '../analytics.service';
import { AppError } from '@/utils/errors';
// Mock the database and logger
vi.mock('@/db', () => {
    return {
        db: {
            select: vi.fn(() => ({
                from: vi.fn(() => ({
                    where: vi.fn(() => ({
                        execute: vi.fn(),
                    })),
                    innerJoin: vi.fn(() => ({
                        where: vi.fn(() => ({
                            execute: vi.fn(),
                        })),
                        groupBy: vi.fn(() => ({
                            orderBy: vi.fn(() => ({
                                limit: vi.fn(() => ({
                                    execute: vi.fn(),
                                })),
                                execute: vi.fn(),
                            })),
                        })),
                    })),
                    groupBy: vi.fn(() => ({
                        orderBy: vi.fn(() => ({
                            execute: vi.fn(),
                        })),
                    })),
                    execute: vi.fn(),
                })),
            })),
        }
    };
});
vi.mock('@/utils/logger', () => ({
    logger: {
        error: vi.fn(),
    },
}));
describe('AnalyticsService', () => {
    let analyticsService;
    let mockDb;
    beforeEach(() => {
        vi.resetAllMocks();
        // Create a mock DB instance
        mockDb = {
            select: vi.fn(() => ({
                from: vi.fn(() => ({
                    where: vi.fn(() => ({
                        execute: vi.fn(),
                    })),
                    innerJoin: vi.fn(() => ({
                        where: vi.fn(() => ({
                            execute: vi.fn(),
                        })),
                        groupBy: vi.fn(() => ({
                            orderBy: vi.fn(() => ({
                                limit: vi.fn(() => ({
                                    execute: vi.fn(),
                                })),
                                execute: vi.fn(),
                            })),
                        })),
                    })),
                    groupBy: vi.fn(() => ({
                        orderBy: vi.fn(() => ({
                            execute: vi.fn(),
                        })),
                    })),
                    execute: vi.fn(),
                })),
            })),
        };
        analyticsService = new AnalyticsService(mockDb);
    });
    describe('getTeacherStudentStats', () => {
        it('should return teacher student statistics', async () => {
            // Mock select().from().where().execute() for student count
            const mockStudentCountResult = [{ count: 5 }];
            const mockFrom = vi.fn().mockReturnValue({
                where: vi.fn().mockReturnValue({
                    execute: vi.fn().mockResolvedValue(mockStudentCountResult),
                }),
            });
            mockDb.select.mockReturnValueOnce({ from: mockFrom });
            // Mock select().from().where().execute() for teacher info
            const mockTeacher = {
                id: 'teacher-id',
                subscriptionPlan: 'pro',
                subscriptionStatus: 'active',
            };
            const mockFromTeacher = vi.fn().mockReturnValue({
                where: vi.fn().mockReturnValue({
                    execute: vi.fn().mockResolvedValue([mockTeacher]),
                }),
            });
            mockDb.select.mockReturnValueOnce({ from: mockFromTeacher });
            // Mock select().from().innerJoin().where().execute() for module stats
            const mockModuleStats = {
                totalModules: 15,
                completedModules: 10,
            };
            const mockInnerJoin = vi.fn().mockReturnValue({
                where: vi.fn().mockReturnValue({
                    execute: vi.fn().mockResolvedValue([mockModuleStats]),
                }),
            });
            const mockFromModules = vi.fn().mockReturnValue({
                innerJoin: mockInnerJoin,
            });
            mockDb.select.mockReturnValueOnce({ from: mockFromModules });
            // Call the method
            const result = await analyticsService.getTeacherStudentStats('teacher-id');
            // Assert
            expect(result).toEqual({
                studentCount: 5,
                subscriptionTier: 'pro',
                subscriptionStatus: 'active',
                moduleStats: {
                    totalModules: 15,
                    completedModules: 10,
                    completionRate: 66.7, // 10/15 * 100, rounded to 1 decimal place
                },
            });
        });
        it('should throw an error if teacher is not found', async () => {
            // Mock student count query
            const mockStudentCountResult = [{ count: 0 }];
            const mockFrom = vi.fn().mockReturnValue({
                where: vi.fn().mockReturnValue({
                    execute: vi.fn().mockResolvedValue(mockStudentCountResult),
                }),
            });
            mockDb.select.mockReturnValueOnce({ from: mockFrom });
            // Mock teacher query to return empty array (teacher not found)
            const mockFromTeacher = vi.fn().mockReturnValue({
                where: vi.fn().mockReturnValue({
                    execute: vi.fn().mockResolvedValue([]),
                }),
            });
            mockDb.select.mockReturnValueOnce({ from: mockFromTeacher });
            // Call the method and expect it to throw
            await expect(analyticsService.getTeacherStudentStats('teacher-id'))
                .rejects
                .toBeInstanceOf(AppError);
        });
    });
    describe('getPopularModules', () => {
        it('should return popular modules with completion rates', async () => {
            // Setup mock data
            const mockModules = [
                {
                    moduleId: 'module-1',
                    moduleTitle: 'Module One',
                    startCount: 100,
                    completionCount: 80,
                },
                {
                    moduleId: 'module-2',
                    moduleTitle: 'Module Two',
                    startCount: 50,
                    completionCount: 20,
                },
            ];
            // Mock the query chain
            const mockOrderBy = vi.fn().mockReturnValue({
                limit: vi.fn().mockReturnValue({
                    execute: vi.fn().mockResolvedValue(mockModules),
                }),
            });
            const mockGroupBy = vi.fn().mockReturnValue({
                orderBy: mockOrderBy,
            });
            const mockInnerJoin = vi.fn().mockReturnValue({
                groupBy: mockGroupBy,
            });
            const mockFrom = vi.fn().mockReturnValue({
                innerJoin: mockInnerJoin,
            });
            mockDb.select.mockReturnValue({ from: mockFrom });
            // Call the method
            const result = await analyticsService.getPopularModules(2);
            // Assert
            expect(result).toEqual([
                {
                    moduleId: 'module-1',
                    title: 'Module One',
                    startCount: 100,
                    completionCount: 80,
                    completionRate: 80,
                },
                {
                    moduleId: 'module-2',
                    title: 'Module Two',
                    startCount: 50,
                    completionCount: 20,
                    completionRate: 40,
                },
            ]);
            // Verify limit was used
            expect(mockOrderBy().limit).toHaveBeenCalledWith(2);
        });
    });
});
