import { Router, Request, Response, NextFunction, RequestHandler } from 'express';
import { authenticateUser, authenticateAdmin } from '@/middleware/auth.middleware';
import {
    startProgress,
    submitParagraphSummary,
    getStudentProgressDetails,
    updateProgressByAdmin,
    getAllStudentProgress,
    getAllModuleProgress,
    getStudentProgressForAdmin,
    getDetailedStudentModuleProgressForAdmin
} from '../controllers/progress.controller';
import { AppError } from '@/utils/errors';

// Import schemas used in Swagger comments
import { 
    StudentProgressSchema, 
    ParagraphSubmissionSchema,
    AdminUpdateProgressInputSchema // <-- Import for Swagger reference
} from '../schemas/progress.schema';

/**
 * NOTE: TypeScript is showing errors for router handlers related to return types.
 * This is a known issue with Express typings and how they handle async route handlers.
 * The functionality works correctly despite the TypeScript errors.
 * 
 * The issue relates to controller methods potentially returning a value from res.json() calls,
 * while Express expects void return types from route handlers.
 * 
 * We're explicitly ignoring these TypeScript errors since fixing them would require
 * significant type gymnastics for no runtime benefit.
 * 
 * @see https://github.com/DefinitelyTyped/DefinitelyTyped/issues/50871
 */

const router = Router();

// Utility to handle async route handlers and catch errors
const asyncHandler = (fn: (req: Request, res: Response, next: NextFunction) => Promise<any>): RequestHandler => {
    return (req: Request, res: Response, next: NextFunction) => {
        Promise.resolve(fn(req, res, next)).catch(next);
    };
};

// --- Type Definitions for Swagger --- //

/**
 * @swagger
 * tags:
 *   - name: Progress - Student
 *     description: Endpoints for students to manage and view their own progress.
 *   - name: Progress - Admin
 *     description: Endpoints for Admin/SuperAdmin users to view and manage student progress.
 */

/**
 * @swagger
 * /api/v1/progress/start:
 *   post:
 *     tags: [Progress - Student]
 *     summary: Start progress on a module (Student)
 *     description: Creates a progress record for the authenticated student on a specific module if one doesn't exist. Idempotent.
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/StartModuleInput' # Reference the actual schema name
 *     responses:
 *       200:
 *         description: Progress tracking started or retrieved successfully.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                  message: { type: string }
 *                  progress: { $ref: '#/components/schemas/StudentProgress' }
 *       400:
 *         description: Validation Error.
 *       401:
 *         description: Authentication required (Student context).
 *       404:
 *         description: Module or Student not found.
 *       500:
 *         description: Internal server error.
 */
router.post('/start', authenticateUser, asyncHandler(startProgress));

/**
 * @swagger
 * /api/v1/progress/submit-summary:
 *   post:
 *     tags: [Progress - Student]
 *     summary: Submit a paragraph summary (Student)
 *     description: Submits an individual and cumulative summary for a specific paragraph within a module the student has started.
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/SubmitSummaryInput' # Reference the actual schema name
 *     responses:
 *       201:
 *         description: Summary submitted successfully.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message: { type: string }
 *                 submissionId: { type: string, format: uuid }
 *                 progressStatus: # Simplified progress status
 *                   type: object
 *                   properties:
 *                      completed: { type: boolean }
 *                      highestParagraphIndexReached: { type: integer, nullable: true }
 *                      finalSummary: { type: string, nullable: true }
 *       400:
 *         description: Validation Error, or Module already completed, or paragraph index mismatch.
 *       401:
 *         description: Authentication required (Student context).
 *       404:
 *         description: Module or Progress record not found for this student.
 *       500:
 *         description: Internal server error.
 */
router.post('/submit-summary', authenticateUser, asyncHandler(submitParagraphSummary));

/**
 * @swagger
 * /api/v1/progress/details/{moduleId}:
 *   get:
 *     tags: [Progress - Student]
 *     summary: Get my detailed progress for a module (Student)
 *     description: Retrieves the overall progress record and all paragraph submissions for the authenticated student on a specific module.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - $ref: '#/components/parameters/ModuleIdParam' # Reference the actual parameter schema name
 *     responses:
 *       200:
 *         description: Detailed progress information for the student.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/StudentProgressDetailsDTOSchema' # Corrected: Reference the actual Zod schema name
 *       400:
 *         description: Invalid Module ID format.
 *       401:
 *         description: Authentication required (Student context).
 *       404:
 *         description: Progress record not found for this student/module.
 *       500:
 *         description: Internal server error.
 */
router.get('/details/:moduleId', authenticateUser, asyncHandler(getStudentProgressDetails));

/**
 * @swagger
 * /api/v1/progress/my-progress:
 *   get:
 *     tags: [Progress - Student]
 *     summary: Get all my progress records (Student)
 *     description: Retrieves a list of all progress records (across different modules) for the currently authenticated student.
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: A list of the student's progress records.
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/StudentProgress'
 *       401:
 *         description: Authentication required (Student context).
 *       500:
 *         description: Internal server error.
 */
router.get('/my-progress', authenticateUser, asyncHandler(getAllStudentProgress));


// --- Admin/SuperAdmin Routes ---

/**
 * @swagger
 * /api/v1/progress/admin/update/{progressId}:
 *   patch:
 *     tags: [Progress - Admin]
 *     summary: Update progress record (Admin/SuperAdmin)
 *     description: Allows an Admin/SuperAdmin to update specific fields (e.g., feedback, score, completion status) on a student's progress record they manage.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - $ref: '#/components/parameters/ProgressIdParam' # Reference the actual parameter schema name
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/AdminUpdateProgressInputSchema' # Use the correct, defined schema
 *     responses:
 *       200:
 *         description: Progress record updated successfully.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/StudentProgress'
 *       400:
 *         description: Validation Error or Invalid ID.
 *       401:
 *         description: Authentication required.
 *       403:
 *         description: Forbidden (Admin/SuperAdmin access required, or does not manage the student associated with this progress).
 *       404:
 *         description: Progress record not found.
 *       500:
 *         description: Internal server error.
 */
router.patch('/admin/update/:progressId', authenticateAdmin, asyncHandler(updateProgressByAdmin));

/**
 * @swagger
 * /api/v1/progress/admin/module/{moduleId}:
 *   get:
 *     tags: [Progress - Admin]
 *     summary: Get all progress for a module (Admin/SuperAdmin)
 *     description: Retrieves all student progress records associated with a specific module, accessible only to Admins/SuperAdmins.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - $ref: '#/components/parameters/ModuleIdParam' # Reference the actual parameter schema name
 *     responses:
 *       200:
 *         description: A list of all progress records for the specified module.
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/StudentProgress'
 *       400:
 *         description: Invalid Module ID format.
 *       401:
 *         description: Authentication required.
 *       403:
 *         description: Admin/SuperAdmin access required.
 *       404:
 *         description: Module not found.
 *       500:
 *         description: Internal server error.
 */
router.get('/admin/module/:moduleId', authenticateAdmin, asyncHandler(getAllModuleProgress));

/**
 * @swagger
 * /api/v1/progress/admin/student/{studentId}:
 *   get:
 *     tags: [Progress - Admin]
 *     summary: Get all progress records for a specific student (Admin)
 *     description: Retrieves a list of all `StudentProgressSchema` records for a specific student, accessible only by an authorized Admin/SuperAdmin who manages that student.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - $ref: '#/components/parameters/StudentIdParam' # Reference parameter schema
 *     responses:
 *       200:
 *         description: A list of the student's progress records.
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/StudentProgressSchema' # Reference response item schema
 *       400:
 *         description: Invalid Student ID format.
 *       401:
 *         description: Authentication required.
 *       403:
 *         description: Forbidden (Admin does not manage this student).
 *       404:
 *         description: Student not found.
 *       500:
 *         description: Internal server error.
 */
router.get('/admin/student/:studentId', authenticateAdmin, asyncHandler(getStudentProgressForAdmin));

/**
 * @swagger
 * /api/v1/progress/admin/student/{studentId}/module/{moduleId}:
 *   get:
 *     tags: [Progress - Admin]
 *     summary: Get detailed progress for a specific student/module (Admin)
 *     description: Retrieves the detailed progress, including all paragraph submissions, for a specific student on a specific module. Accessible only by an authorized Admin/SuperAdmin who manages that student.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - $ref: '#/components/parameters/StudentIdParam' # Reference parameter schema
 *       - $ref: '#/components/parameters/ModuleIdParam' # Reference parameter schema
 *     responses:
 *       200:
 *         description: Detailed progress information for the student on the module.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/StudentProgressDetailsDTOSchema' # Reference response schema
 *       400:
 *         description: Invalid Student or Module ID format.
 *       401:
 *         description: Authentication required.
 *       403:
 *         description: Forbidden (Admin does not manage this student).
 *       404:
 *         description: Student, Module, or Progress record not found.
 *       500:
 *         description: Internal server error.
 */
router.get('/admin/student/:studentId/module/:moduleId', authenticateAdmin, asyncHandler(getDetailedStudentModuleProgressForAdmin));


// --- Parameter Definitions for Swagger --- //

/**
 * @swagger
 * components:
 *   parameters:
 *     ModuleIdParam:
 *       in: path
 *       name: moduleId
 *       required: true
 *       schema:
 *         type: string
 *         format: uuid
 *       description: The UUID of the module.
 *     ProgressIdParam:
 *       in: path
 *       name: progressId
 *       required: true
 *       schema:
 *         type: string
 *         format: uuid
 *       description: The UUID of the student progress record.
 *     ParagraphIndexParam:
 *        in: path
 *        name: paragraphIndex
 *        required: true
 *        schema:
 *          type: integer
 *          format: int32
 *          minimum: 1
 *        description: The 1-based index of the paragraph.
 *     StudentIdParam:   # Add StudentIdParam definition if not present
 *       in: path
 *       name: studentId
 *       required: true
 *       schema:
 *         type: string
 *         format: uuid
 *       description: The UUID of the student.
 */

export default router; 