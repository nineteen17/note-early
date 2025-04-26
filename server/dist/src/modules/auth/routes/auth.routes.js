import { Router } from 'express';
import { AuthController } from '../controllers/auth.controller';
import { AuthService } from '../services/auth.service';
import { db } from '@/db';
import { authenticateAdmin } from '@/middleware/auth.middleware';
const authRouter = Router();
const authService = new AuthService(db);
const authController = new AuthController(authService);
/**
 * @swagger
 * tags:
 *   - name: Auth - Public
 *     description: Authentication endpoints accessible without login.
 *   - name: Auth - Admin
 *     description: Authentication endpoints for Admin and SuperAdmin users.
 *   - name: Auth - Student
 *     description: Authentication endpoints for Student users.
 */
// --- Public Routes (No Authentication Required) --- //
/**
 * @swagger
 * /auth/signup:
 *   post:
 *     tags: [Auth - Public]
 *     summary: Register a new user (Admin/SuperAdmin)
 *     description: Creates a new user profile. Assigns SUPER_ADMIN role for specific emails (@noteearly.com, admin@example.com), otherwise assigns ADMIN role.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [email, password, fullName]
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *                 description: User's email address.
 *               password:
 *                 type: string
 *                 format: password
 *                 minLength: 8
 *               fullName:
 *                 type: string
 *     responses:
 *       201:
 *         description: User account created successfully.
 *       400:
 *         description: Validation error or invalid input.
 *       500:
 *         description: Server error during signup.
 */
authRouter.post('/signup', authController.signUpAdmin); // Renamed route, controller method might need rename later for clarity
/**
 * @swagger
 * /auth/login:
 *   post:
 *     tags: [Auth - Public]
 *     summary: Log in an Admin or SuperAdmin user
 *     description: Logs in a user with ADMIN or SUPER_ADMIN role using email and password.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [email, password]
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *               password:
 *                 type: string
 *                 format: password
 *     responses:
 *       200:
 *         description: Login successful. Returns user info and sets access token cookie.
 *       401:
 *         description: Authentication failed (Invalid credentials or user not Admin/SuperAdmin).
 *       500:
 *         description: Server error during login.
 */
authRouter.post('/login', authController.loginAdmin); // Renamed route
/**
 * @swagger
 * /auth/google:
 *   get:
 *     tags: [Auth - Public]
 *     summary: Initiate Google OAuth login
 *     description: Starts the Google OAuth flow. Users signing in with specific emails (@noteearly.com, admin@example.com) get SUPER_ADMIN role, others get ADMIN.
 *     responses:
 *       200:
 *         description: Returns the Google OAuth URL to redirect the user.
 *       500:
 *         description: Failed to generate OAuth URL.
 */
authRouter.get('/google', authController.initiateGoogleLogin);
/**
 * @swagger
 * /auth/callback:
 *   get:
 *     tags: [Auth - Public]
 *     summary: Handle Google OAuth callback
 *     description: Processes the callback from Google after user authentication. Sets access token cookie and redirects.
 *     parameters:
 *       - in: query
 *         name: code # Supabase uses 'code' parameter
 *         schema:
 *           type: string
 *         required: true
 *         description: The authorization code provided by Google.
 *     responses:
 *       302:
 *         description: Redirects to the appropriate dashboard page after successful authentication.
 *       400:
 *         description: Invalid or missing authorization code.
 *       500:
 *         description: Server error during OAuth callback processing.
 */
authRouter.get('/callback', authController.handleOAuthCallback);
/**
 * @swagger
 * /auth/student/login:
 *   post:
 *     tags: [Auth - Student]
 *     summary: Log in a Student user
 *     description: Logs in a student user using their assigned ID and PIN. Returns a student-specific token.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [studentId, pin]
 *             properties:
 *               studentId:
 *                 type: string
 *                 format: uuid
 *                 description: The student's unique ID.
 *               pin:
 *                 type: string
 *                 description: The student's PIN.
 *     responses:
 *       200:
 *         description: Student login successful. Returns student profile and token.
 *       401:
 *         description: Authentication failed (Invalid studentId or PIN).
 *       404:
 *         description: Student profile not found.
 *       500:
 *         description: Server error during student login.
 */
authRouter.post('/student/login', authController.loginStudent);
/**
 * @swagger
 * /auth/refresh:
 *   post:
 *     tags: [Auth - Public]
 *     summary: Refresh access token using refresh token cookie
 *     description: Attempts to refresh the Supabase session using the httpOnly refresh-token cookie. Returns a new access token if successful.
 *     responses:
 *       200:
 *         description: Token refreshed successfully. Returns new access token.
 *       401:
 *         description: Refresh token missing, invalid, or expired.
 *       500:
 *         description: Server error during token refresh.
 */
authRouter.post('/refresh', authController.refreshToken);
// --- Admin/SuperAdmin Routes (Authentication Required) --- //
/**
 * @swagger
 * /auth/logout:
 *   post:
 *     tags: [Auth - Admin]
 *     summary: Log out an Admin/SuperAdmin user
 *     description: Logs out the currently authenticated Admin or SuperAdmin user by invalidating their session/token.
 *     security:
 *       - bearerAuth: [] # Or cookieAuth, depending on setup
 *     responses:
 *       200:
 *         description: Logout successful.
 *       401:
 *         description: Authentication required.
 *       500:
 *         description: Server error during logout.
 */
authRouter.post('/logout', authenticateAdmin, authController.logout); // Added middleware
/**
 * @swagger
 * /auth/reset-password:
 *   post:
 *     tags: [Auth - Admin]
 *     summary: Reset Admin/SuperAdmin password
 *     description: Allows a logged-in Admin or SuperAdmin to reset their own password.
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [currentPassword, newPassword]
 *             properties:
 *               currentPassword:
 *                 type: string
 *                 format: password
 *               newPassword:
 *                 type: string
 *                 format: password
 *                 minLength: 8
 *     responses:
 *       200:
 *         description: Password reset successfully.
 *       400:
 *         description: Validation error (e.g., new password too short).
 *       401:
 *         description: Authentication required.
 *       403:
 *         description: Current password incorrect.
 *       500:
 *         description: Server error during password reset.
 */
authRouter.post('/reset-password', authenticateAdmin, authController.resetAdminPassword); // Renamed route
/**
 * @swagger
 * /auth/admin/student:
 *   post:
 *     tags: [Auth - Admin]
 *     summary: Create a new student profile (Admin/SuperAdmin only)
 *     description: Allows a logged-in Admin or SuperAdmin to create a new student profile associated with their account.
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/CreateStudentInput' # Now includes optional age/readingLevel
 *     responses:
 *       201:
 *         description: Student created successfully.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ProfileDTO' # Includes age/readingLevel
 *       400:
 *         description: Validation error or invalid input.
 *       401:
 *         description: Authentication required.
 *       403:
 *         description: Student limit reached based on subscription plan.
 *       500:
 *         description: Server error during student creation.
 */
authRouter.post('/admin/student', authenticateAdmin, authController.createStudent); // Renamed route
/**
 * @swagger
 * /auth/admin/student/reset-pin:
 *   post:
 *     tags: [Auth - Admin]
 *     summary: Reset a student's PIN (Admin/SuperAdmin only)
 *     description: Allows a logged-in Admin or SuperAdmin to reset the PIN for a student associated with their account.
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [studentId, newPin]
 *             properties:
 *               studentId:
 *                 type: string
 *                 format: uuid
 *                 description: The ID of the student whose PIN needs resetting.
 *               newPin:
 *                 type: string
 *                 minLength: 4
 *                 maxLength: 6
 *                 description: The new PIN for the student.
 *     responses:
 *       200:
 *         description: Student PIN reset successfully.
 *       400:
 *         description: Validation error.
 *       401:
 *         description: Admin authentication required.
 *       403:
 *         description: Admin does not have permission to reset PIN for this student (e.g., student belongs to another admin).
 *       404:
 *         description: Student profile not found.
 *       500:
 *         description: Server error during PIN reset.
 */
authRouter.post('/admin/student/reset-pin', authenticateAdmin, authController.resetStudentPin); // Renamed route
export default authRouter;
