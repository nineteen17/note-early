import { Router } from 'express';
import { AnalyticsController } from '../controllers/analytics.controller';
import { authenticateSuperAdmin, authenticateUser } from '@/middleware/auth.middleware';

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

/**
 * @swagger
 * /analytics/my-activity:
 *   get:
 *     tags: [Student Progress]
 *     summary: Get my activity calendar data
 *     description: Get the current student's activity data for calendar display, including both active and completed modules
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: days
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 365
 *           default: 30
 *         description: Number of days to retrieve activity for
 *     responses:
 *       200:
 *         description: Activity data retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   enum: [success, error]
 *                   example: success
 *                 data:
 *                   type: object
 *                   properties:
 *                     progressByDay:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           date:
 *                             type: string
 *                             format: date
 *                             example: "2024-03-20"
 *                           modulesActive:
 *                             type: integer
 *                             minimum: 0
 *                             description: Total number of modules worked on that day
 *                             example: 3
 *                           modulesCompleted:
 *                             type: integer
 *                             minimum: 0
 *                             description: Number of modules completed that day
 *                             example: 2
 *                           timeSpent:
 *                             type: integer
 *                             minimum: 0
 *                             description: Total time spent in minutes
 *                             example: 45
 *                           averageScore:
 *                             type: number
 *                             minimum: 0
 *                             maximum: 100
 *                             description: Average score for the day
 *                             example: 85.5
 *                           lastActivity:
 *                             type: string
 *                             format: date-time
 *                             description: Timestamp of last activity for the day
 *                             example: "2024-03-20T15:30:00Z"
 *       401:
 *         description: Authentication required
 *       500:
 *         description: Internal server error
 */
router.get('/my-activity', authenticateUser , (req, res, next) => {
  analyticsController.getStudentActivity(req, res, next);
});

export default router; 