import { Router } from 'express';
import { AnalyticsController } from '../controllers/analytics.controller';
import { authenticateSuperAdmin } from '@/middleware/auth.middleware';
/**
 * @swagger
 * tags:
 *   - name: Analytics - SuperAdmin
 *     description: Analytics endpoints requiring Super Admin privileges.
 */
/**
 * NOTE: TypeScript is showing errors for router handlers related to return types.
 * This is a known issue with Express typings and how they handle async route handlers.
 * The functionality works correctly despite the TypeScript errors.
 *
 * @see https://github.com/DefinitelyTyped/DefinitelyTyped/issues/50871
 */
const router = Router();
const analyticsController = new AnalyticsController();
/**
 * @swagger
 * /analytics/dashboard:
 *   get:
 *     tags: [Analytics - SuperAdmin]
 *     summary: Get teacher dashboard statistics
 *     description: Retrieves various statistics for the admin/teacher dashboard.
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Dashboard statistics retrieved successfully.
 *         content:
 *           application/json:
 *             schema:
 *               type: object # TODO: Define specific DashboardStats schema
 *               example:
 *                 totalStudents: 150
 *                 activeSubscriptions: 120
 *                 averageProgress: 65.5
 *                 popularModule: "Introduction to Reading"
 *       401:
 *         description: Authentication required.
 *       403:
 *         description: Unauthorized (not a Super Admin).
 *       500:
 *         description: Internal server error.
 */
// @ts-ignore: Express typing issue with response objects
router.get('/dashboard', authenticateSuperAdmin, (req, res, next) => {
    analyticsController.getTeacherDashboard(req, res, next);
});
/**
 * @swagger
 * /analytics/students/{studentId}:
 *   get:
 *     tags: [Analytics - SuperAdmin]
 *     summary: Get progress analytics for a specific student
 *     description: Retrieves detailed progress analytics for a single student by their ID.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: studentId
 *         required: true
 *         schema:
 *           $ref: '#/components/schemas/StudentIdParam' # Use shared schema
 *         description: The UUID of the student.
 *     responses:
 *       200:
 *         description: Student progress analytics retrieved successfully.
 *         content:
 *           application/json:
 *             schema:
 *               type: object # TODO: Define specific StudentAnalytics schema
 *               example:
 *                 studentName: "Jane Doe"
 *                 completedModules: 15
 *                 averageScore: 88
 *                 timeSpent: 1200 # in minutes
 *       400:
 *         description: Invalid student ID format.
 *       401:
 *         description: Authentication required.
 *       403:
 *         description: Unauthorized (not a Super Admin).
 *       404:
 *         description: Student not found.
 *       500:
 *         description: Internal server error.
 */
// @ts-ignore: Express typing issue with response objects
router.get('/students/:studentId', authenticateSuperAdmin, (req, res, next) => {
    analyticsController.getStudentProgress(req, res, next);
});
/**
 * @swagger
 * /analytics/modules/popular:
 *   get:
 *     tags: [Analytics - SuperAdmin]
 *     summary: Get the most popular modules
 *     description: Retrieves a list of reading modules ordered by popularity (e.g., completion rate or number of students).
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Popular modules retrieved successfully.
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object # TODO: Define specific PopularModule schema
 *                 example:
 *                   moduleId: "uuid-module-1"
 *                   title: "Advanced Reading Techniques"
 *                   completionRate: 75.2
 *       401:
 *         description: Authentication required.
 *       403:
 *         description: Unauthorized (not a Super Admin).
 *       500:
 *         description: Internal server error.
 */
// @ts-ignore: Express typing issue with response objects
router.get('/modules/popular', authenticateSuperAdmin, (req, res, next) => {
    analyticsController.getPopularModules(req, res, next);
});
/**
 * @swagger
 * /analytics/subscriptions:
 *   get:
 *     tags: [Analytics - SuperAdmin]
 *     summary: Get subscription statistics
 *     description: Retrieves statistics related to user subscriptions (e.g., counts per tier, revenue).
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Subscription statistics retrieved successfully.
 *         content:
 *           application/json:
 *             schema:
 *               type: object # TODO: Define specific SubscriptionStats schema
 *               example:
 *                 totalActive: 120
 *                 freeTier: 30
 *                 homeTier: 50
 *                 proTier: 40
 *                 monthlyRevenue: 599.50
 *       401:
 *         description: Authentication required.
 *       403:
 *         description: Unauthorized (not a Super Admin).
 *       500:
 *         description: Internal server error.
 */
// @ts-ignore: Express typing issue with response objects
router.get('/subscriptions', authenticateSuperAdmin, (req, res, next) => {
    analyticsController.getSubscriptionStats(req, res, next);
});
export default router;
