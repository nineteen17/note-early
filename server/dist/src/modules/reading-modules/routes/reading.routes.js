import { Router } from 'express';
import { ReadingModuleController } from '../controllers/reading.controller.js';
import { authenticateAdmin, authenticateSuperAdmin, authenticateUser } from '@/middleware/auth.middleware';
// Utility to handle async route handlers and catch errors
const asyncHandler = (fn) => {
    return (req, res, next) => {
        Promise.resolve(fn(req, res, next)).catch(next);
    };
};
const router = Router();
// Instantiate the controller
const readingModuleController = new ReadingModuleController();
/**
 * @swagger
 * tags:
 *   - name: Reading Modules - Public
 *     description: Reading module operations accessible without login.
 *   - name: Reading Modules - Admin
 *     description: Reading module operations for Admin and SuperAdmin users.
 *   - name: Reading Modules - SuperAdmin
 *     description: Reading module operations restricted to SuperAdmin users.
 */
/**
 * @swagger
 * components:
 *   schemas:
 *     VocabularyEntryDTO:
 *       type: object
 *       properties:
 *         id:
 *           type: string
 *           format: uuid
 *           description: The unique identifier for the vocabulary entry.
 *         moduleId:
 *           type: string
 *           format: uuid
 *           description: The ID of the module this entry belongs to.
 *         paragraphIndex:
 *           type: integer
 *           description: The 1-based index of the paragraph this entry relates to.
 *           minimum: 1
 *         word:
 *           type: string
 *           description: The word being defined.
 *         description:
 *           type: string
 *           description: The definition or description of the word.
 *       required:
 *         - id
 *         - moduleId
 *         - paragraphIndex
 *         - word
 *         - description
 *     VocabularyBodySchema: # Schema for POST
 *       type: object
 *       properties:
 *         paragraphIndex:
 *           type: integer
 *           minimum: 1
 *           description: 1-based index of the paragraph.
 *         word:
 *           type: string
 *           minLength: 1
 *           maxLength: 100
 *           description: The word being defined.
 *         description:
 *           type: string
 *           minLength: 1
 *           maxLength: 1000
 *           description: The definition.
 *       required:
 *         - paragraphIndex
 *         - word
 *         - description
 *     UpdateVocabularyBodySchema: # Schema for PUT
 *       type: object
 *       description: At least one field must be provided for update.
 *       properties:
 *         paragraphIndex:
 *           type: integer
 *           minimum: 1
 *           description: 1-based index of the paragraph.
 *         word:
 *           type: string
 *           minLength: 1
 *           maxLength: 100
 *           description: The word being defined.
 *         description:
 *           type: string
 *           minLength: 1
 *           maxLength: 1000
 *           description: The definition.
 *   parameters:
 *     ModuleId:
 *       in: path
 *       name: moduleId
 *       required: true
 *       schema:
 *         type: string
 *         format: uuid
 *       description: The UUID of the reading module.
 *     ParagraphIndex:
 *       in: path
 *       name: paragraphIndex
 *       required: true
 *       schema:
 *         type: integer
 *         minimum: 1
 *       description: The 1-based index of the paragraph.
 *     VocabularyId:
 *       in: path
 *       name: vocabularyId
 *       required: true
 *       schema:
 *         type: string
 *         format: uuid
 *       description: The UUID of the vocabulary entry.
 *   securitySchemes:
 *     bearerAuth:            # arbitrary name for the security scheme
 *       type: http
 *       scheme: bearer
 *       bearerFormat: JWT    # optional, arbitrary value for documentation purposes
 */
// --- Public Routes --- //
/**
 * @swagger
 * /api/v1/reading-modules/active:
 *   get:
 *     tags: [Reading Modules - Public]
 *     summary: Get active reading modules (Public)
 *     description: Retrieves a list of active reading modules available to all users.
 *     responses:
 *       200:
 *         description: A list of active reading modules.
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/ReadingModuleDTO'
 *       500:
 *         description: Internal server error.
 */
router.get('/active', authenticateUser, asyncHandler(readingModuleController.getAllActiveReadingModules.bind(readingModuleController)));
// --- Admin/SuperAdmin Routes --- //
/**
 * @swagger
 * /api/v1/reading-modules/my-modules:
 *   get:
 *     tags: [Reading Modules - Admin]
 *     summary: Get modules created by the logged-in admin (Admin/SuperAdmin)
 *     description: Retrieves a list of custom reading modules created by the currently authenticated admin or superadmin.
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: A list of the user's custom reading modules.
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/ReadingModuleDTO'
 *       401:
 *         description: Authentication required.
 *       500:
 *         description: Internal server error.
 */
router.get('/my-modules', authenticateAdmin, asyncHandler(readingModuleController.getAdminReadingModules.bind(readingModuleController)));
/**
 * @swagger
 * /api/v1/reading-modules/{id}:
 *   get:
 *     tags: [Reading Modules - Public]
 *     summary: Get a specific module by ID (Public)
 *     description: Retrieves details for a specific reading module by its UUID. Access may be restricted based on module status.
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: The UUID of the reading module.
 *     responses:
 *       200:
 *         description: Reading module details.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ReadingModuleDTO'
 *       400:
 *         description: Invalid ID format.
 *       404:
 *         description: Module not found or not accessible.
 *       500:
 *         description: Internal server error.
 */
router.get('/:id', asyncHandler(readingModuleController.getReadingModuleById.bind(readingModuleController)));
/**
 * @swagger
 * /api/v1/reading-modules/{moduleId}/paragraph/{paragraphIndex}:
 *   get:
 *     tags: [Reading Modules - Public]
 *     summary: Get a specific paragraph from a module (Public)
 *     description: Retrieves the text content and index of a single paragraph within a reading module. Assumes module is accessible.
 *     parameters:
 *       - in: path
 *         name: moduleId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: The UUID of the reading module.
 *       - in: path
 *         name: paragraphIndex
 *         required: true
 *         schema:
 *           type: integer
 *           minimum: 1
 *         description: The 1-based index of the paragraph.
 *     responses:
 *       200:
 *         description: Paragraph details.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Paragraph'
 *       400:
 *         description: Invalid ID or index format.
 *       404:
 *         description: Module or Paragraph not found.
 *       500:
 *         description: Internal server error.
 */
router.get('/:moduleId/paragraph/:paragraphIndex', asyncHandler(readingModuleController.getModuleParagraph.bind(readingModuleController)));
/**
 * @swagger
 * /api/v1/reading-modules/{moduleId}/paragraphs/{paragraphIndex}/vocabulary:
 *   get:
 *     tags: [Reading Modules - Public, Vocabulary]
 *     summary: Get vocabulary for a specific paragraph (Public)
 *     description: Retrieves vocabulary definitions relevant to a specific paragraph within a module.
 *     parameters:
 *       - $ref: '#/components/parameters/ModuleId'
 *       - $ref: '#/components/parameters/ParagraphIndex'
 *     responses:
 *       200:
 *         description: Vocabulary definitions for the paragraph.
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/VocabularyEntryDTO'
 *       400:
 *         description: Invalid ID or index format.
 *       500:
 *         description: Internal server error.
 */
router.get('/:moduleId/paragraphs/:paragraphIndex/vocabulary', asyncHandler(readingModuleController.getParagraphVocabulary.bind(readingModuleController)));
// --- Admin/SuperAdmin Routes --- //
/**
 * @swagger
 * /api/v1/reading-modules:
 *   post:
 *     tags: [Reading Modules - Admin]
 *     summary: Create a new custom reading module (Admin/SuperAdmin)
 *     description: Allows an authenticated admin or superadmin to create a new custom reading module.
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/CreateModuleInput'
 *     responses:
 *       201:
 *         description: Custom module created successfully.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ReadingModuleDTO'
 *       400:
 *         description: Validation Error.
 *       401:
 *         description: Authentication required.
 *       403:
 *         description: Forbidden (e.g., Subscription limit reached).
 *       500:
 *         description: Internal server error.
 */
router.post('/', authenticateAdmin, asyncHandler(readingModuleController.createReadingModule.bind(readingModuleController)));
/**
 * @swagger
 * /api/v1/reading-modules/{id}:
 *   patch:
 *     tags: [Reading Modules - Admin]
 *     summary: Update a specific module (Admin/SuperAdmin)
 *     description: Allows an authenticated admin/superadmin to update their own custom reading module. SuperAdmins might have broader update capabilities via controller logic.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: The UUID of the reading module to update.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/UpdateModuleInput'
 *     responses:
 *       200:
 *         description: Module updated successfully.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ReadingModuleDTO'
 *       400:
 *         description: Validation Error or Invalid ID.
 *       401:
 *         description: Authentication required.
 *       403:
 *         description: Forbidden (User does not own this module and is not SuperAdmin).
 *       404:
 *         description: Module not found.
 *       500:
 *         description: Internal server error.
 */
router.patch('/:id', authenticateAdmin, asyncHandler(readingModuleController.updateReadingModule.bind(readingModuleController))); // Controller must check ownership or SuperAdmin role
/**
 * @swagger
 * /api/v1/reading-modules/{id}:
 *   delete:
 *     tags: [Reading Modules - Admin]
 *     summary: Delete a specific module (Admin/SuperAdmin)
 *     description: Allows an authenticated admin/superadmin to delete their own custom reading module. SuperAdmins might have broader delete capabilities via controller logic.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: The UUID of the reading module to delete.
 *     responses:
 *       204:
 *         description: Module deleted successfully.
 *       401:
 *         description: Authentication required.
 *       403:
 *         description: Forbidden (User does not own this module and is not SuperAdmin).
 *       404:
 *         description: Module not found.
 *       500:
 *         description: Internal server error.
 */
router.delete('/:id', authenticateAdmin, asyncHandler(readingModuleController.deleteReadingModule.bind(readingModuleController))); // Controller must check ownership or SuperAdmin role
// --- NEW: Admin Vocabulary Routes --- //
/**
 * @swagger
 * /api/v1/reading-modules/{moduleId}/vocabulary:
 *   post:
 *     tags: [Reading Modules - Admin, Vocabulary]
 *     summary: Create a vocabulary entry for a module (Admin/SuperAdmin)
 *     description: Adds a new vocabulary word and definition linked to a specific paragraph within a module. Requires Admin or SuperAdmin role.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - $ref: '#/components/parameters/ModuleId'
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/VocabularyBodySchema'
 *     responses:
 *       201:
 *         description: Vocabulary entry created successfully.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/VocabularyEntryDTO'
 *       400:
 *         description: Validation Error (Invalid input, paragraph index out of bounds).
 *       401:
 *         description: Authentication required.
 *       403:
 *         description: Forbidden (User does not have permission to modify this module).
 *       404:
 *         description: Module not found.
 *       409:
 *         description: Conflict (Word already defined for this paragraph).
 *       500:
 *         description: Internal server error.
 */
router.post('/:moduleId/vocabulary', authenticateAdmin, asyncHandler(readingModuleController.createVocabularyEntry.bind(readingModuleController)));
/**
 * @swagger
 * /api/v1/reading-modules/{moduleId}/vocabulary:
 *   get:
 *     tags: [Reading Modules - Admin, Vocabulary]
 *     summary: Get all vocabulary entries for a module (Admin/SuperAdmin)
 *     description: Retrieves all vocabulary definitions associated with a specific reading module. Requires Admin or SuperAdmin role.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - $ref: '#/components/parameters/ModuleId'
 *     responses:
 *       200:
 *         description: A list of vocabulary entries for the module.
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/VocabularyEntryDTO'
 *       401:
 *         description: Authentication required.
 *       403:
 *         description: Forbidden.
 *       404:
 *         description: Module not found.
 *       500:
 *         description: Internal server error.
 */
router.get('/:moduleId/vocabulary', authenticateAdmin, asyncHandler(readingModuleController.getModuleVocabulary.bind(readingModuleController)));
/**
 * @swagger
 * /api/v1/vocabulary/{vocabularyId}:
 *   put:
 *     tags: [Vocabulary]
 *     summary: Update a specific vocabulary entry (Admin/SuperAdmin)
 *     description: Updates an existing vocabulary definition by its unique ID. Requires Admin or SuperAdmin role with permission for the associated module.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - $ref: '#/components/parameters/VocabularyId'
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/UpdateVocabularyBodySchema'
 *     responses:
 *       200:
 *         description: Vocabulary entry updated successfully.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/VocabularyEntryDTO'
 *       400:
 *         description: Validation Error (Invalid input, must provide at least one field).
 *       401:
 *         description: Authentication required.
 *       403:
 *         description: Forbidden (User does not have permission).
 *       404:
 *         description: Vocabulary entry not found.
 *       500:
 *         description: Internal server error.
 */
router.put('/vocabulary/:vocabularyId', authenticateAdmin, asyncHandler(readingModuleController.updateVocabularyEntry.bind(readingModuleController)));
/**
 * @swagger
 * /api/v1/vocabulary/{vocabularyId}:
 *   delete:
 *     tags: [Vocabulary]
 *     summary: Delete a specific vocabulary entry (Admin/SuperAdmin)
 *     description: Deletes a vocabulary definition by its unique ID. Requires Admin or SuperAdmin role with permission for the associated module.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - $ref: '#/components/parameters/VocabularyId'
 *     responses:
 *       204:
 *         description: Vocabulary entry deleted successfully.
 *       401:
 *         description: Authentication required.
 *       403:
 *         description: Forbidden (User does not have permission).
 *       404:
 *         description: Vocabulary entry not found.
 *       500:
 *         description: Internal server error.
 */
router.delete('/vocabulary/:vocabularyId', authenticateAdmin, asyncHandler(readingModuleController.deleteVocabularyEntry.bind(readingModuleController)));
// --- SuperAdmin Only Routes --- //
/**
 * @swagger
 * /api/v1/reading-modules/curated:
 *   post:
 *     tags: [Reading Modules - SuperAdmin]
 *     summary: Create a new curated reading module (SuperAdmin Only)
 *     description: Allows a Super Admin to create a new curated (system) reading module.
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/CreateCuratedModuleInput'
 *     responses:
 *       201:
 *         description: Curated module created successfully.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ReadingModuleDTO'
 *       400:
 *         description: Validation Error.
 *       401:
 *         description: Authentication required.
 *       403:
 *         description: Forbidden (User is not a Super Admin).
 *       500:
 *         description: Internal server error.
 */
router.post('/curated', authenticateSuperAdmin, asyncHandler(readingModuleController.createCuratedModule.bind(readingModuleController)));
/**
 * @swagger
 * /api/v1/reading-modules/curated/{id}:
 *   patch:
 *     tags: [Reading Modules - SuperAdmin]
 *     summary: Update any module (SuperAdmin Only)
 *     description: Allows a Super Admin to update *any* reading module, including curated ones.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - $ref: '#/components/parameters/IdParam' # Use shared IdParam
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/UpdateModuleInput'
 *     responses:
 *       200:
 *         description: Module updated successfully.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ReadingModuleDTO'
 *       400:
 *         description: Validation Error or Invalid ID.
 *       401:
 *         description: Authentication required.
 *       403:
 *         description: Forbidden (User is not a Super Admin).
 *       404:
 *         description: Module not found.
 *       500:
 *         description: Internal server error.
 */
router.patch('/curated/:id', authenticateSuperAdmin, asyncHandler(readingModuleController.superAdminUpdateReadingModule.bind(readingModuleController)));
/**
 * @swagger
 * /api/v1/reading-modules/curated/{id}:
 *   delete:
 *     tags: [Reading Modules - SuperAdmin]
 *     summary: Delete any module (SuperAdmin Only)
 *     description: Allows a Super Admin to delete *any* reading module, including curated ones.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - $ref: '#/components/parameters/IdParam' # Use shared IdParam
 *     responses:
 *       204:
 *         description: Module deleted successfully.
 *       401:
 *         description: Authentication required.
 *       403:
 *         description: Forbidden (User is not a Super Admin).
 *       404:
 *         description: Module not found.
 *       500:
 *         description: Internal server error.
 */
router.delete('/curated/:id', authenticateSuperAdmin, asyncHandler(readingModuleController.superAdminDeleteReadingModule.bind(readingModuleController)));
// --- Shared Parameter Definitions --- //
/**
 * @swagger
 * components:
 *   parameters:
 *     IdParam:
 *       in: path
 *       name: id
 *       required: true
 *       schema:
 *         type: string
 *         format: uuid
 *       description: The UUID of the reading module.
 *     ParagraphIndexParam:
 *        in: path
 *        name: paragraphIndex
 *        required: true
 *        schema:
 *          type: integer
 *          format: int32
 *          minimum: 1
 *        description: The 1-based index of the paragraph within the module.
 */
export default router;
