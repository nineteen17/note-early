import { Router } from 'express';
import { authenticateAdmin, authenticateUser } from '@/middleware/auth.middleware';
import { SubscriptionController } from '../controllers/subscription.controller';
const subscriptionController = new SubscriptionController();
const router = Router();
// Utility to handle async route handlers
const asyncHandler = (fn) => {
    return (req, res, next) => {
        Promise.resolve(fn(req, res, next)).catch(next);
    };
};
/**
 * @swagger
 * tags:
 *   - name: Subscriptions - Admin
 *     description: Subscription management endpoints for Admin/SuperAdmin users.
 *   - name: Subscriptions - User
 *     description: Subscription management endpoints for authenticated users (Admin/SuperAdmin).
 *   - name: Subscriptions - Webhook
 *     description: Endpoint for receiving Stripe webhook events (Public, validated by Stripe).
 */
// --- Admin/SuperAdmin Routes --- //
/**
 * @swagger
 * /api/v1/subscriptions/plans:
 *   get:
 *     tags: [Subscriptions - Admin]
 *     summary: Get available subscription plans (Admin/SuperAdmin)
 *     description: Retrieves a list of all available subscription plans from the database. Requires Admin/SuperAdmin privileges.
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: A list of subscription plans.
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/SubscriptionPlan'
 *       401:
 *         description: Authentication required.
 *       403:
 *         description: Admin/SuperAdmin access required.
 *       500:
 *         description: Internal server error.
 */
router.get('/plans', authenticateAdmin, asyncHandler(subscriptionController.getPlans.bind(subscriptionController)));
// --- Authenticated User Routes (Admin/SuperAdmin) --- //
/**
 * @swagger
 * /api/v1/subscriptions/checkout-session:
 *   post:
 *     tags: [Subscriptions - User]
 *     summary: Create Stripe Checkout session for a specific plan (Admin/SuperAdmin)
 *     description: Creates and returns a Stripe Checkout Session ID and URL for a specific subscription plan selected by the user.
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - planId
 *             properties:
 *               planId:
 *                 type: string
 *                 description: The Stripe Price ID of the plan to subscribe to.
 *                 example: price_12345ABCDE
 *     responses:
 *       200:
 *         description: Stripe Checkout session created successfully.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   example: success
 *                 data:
 *                   type: object
 *                   properties:
 *                      sessionId:
 *                          type: string
 *                          description: The ID of the Stripe Checkout Session.
 *                      url:
 *                          type: string
 *                          format: url
 *                          description: The URL to redirect the user to for completing the checkout.
 *       400:
 *         description: Invalid input (e.g., missing planId).
 *       401:
 *         description: Authentication required.
 *       404:
 *         description: User profile or plan not found.
 *       500:
 *         description: Internal server error (e.g., Stripe API error).
 */
// Added route for creating checkout session
router.post('/checkout-session', authenticateUser, asyncHandler(subscriptionController.createCheckoutSession.bind(subscriptionController)));
/**
 * @swagger
 * /api/v1/subscriptions/manage:
 *   post:
 *     tags: [Subscriptions - User]
 *     summary: Create Stripe Customer Portal session (Admin/SuperAdmin)
 *     description: Creates and returns a URL for the Stripe Customer Portal, allowing the authenticated Admin/SuperAdmin user to manage their subscription.
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Stripe Customer Portal session URL created successfully.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 url:
 *                   type: string
 *                   format: url
 *                   description: The URL to redirect the user to the Stripe Customer Portal.
 *       401:
 *         description: Authentication required.
 *       404:
 *         description: User profile or Stripe customer ID not found.
 *       500:
 *         description: Internal server error (e.g., Stripe API error).
 */
// Note: Although tagged 'User', only Admins/SuperAdmins have subscriptions currently.
// If students get subscriptions later, this might need adjustment or a separate route.
router.post('/manage', authenticateUser, asyncHandler(subscriptionController.createPortalSession.bind(subscriptionController)));
// --- Added Routes for Missing Controller Methods --- //
/**
 * @swagger
 * /api/v1/subscriptions/current:
 *   get:
 *     tags: [Subscriptions - User]
 *     summary: Get current user's subscription details (Admin/SuperAdmin)
 *     description: Retrieves the active subscription details for the currently authenticated user.
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Subscription details retrieved successfully.
 *         content:
 *           application/json:
 *             schema:
 *                type: object
 *                properties:
 *                   status:
 *                      type: string
 *                      example: success
 *                   data:
 *                     $ref: '#/components/schemas/SubscriptionPlan' # Or a more specific Subscription DTO if available
 *       401:
 *         description: Authentication required.
 *       404:
 *         description: Subscription not found for the user.
 *       500:
 *         description: Internal server error.
 */
router.get('/current', authenticateUser, asyncHandler(subscriptionController.getCurrentSubscription.bind(subscriptionController)));
/**
 * @swagger
 * /api/v1/subscriptions/cancel:
 *   post:
 *     tags: [Subscriptions - User]
 *     summary: Request subscription cancellation (Admin/SuperAdmin)
 *     description: Initiates the cancellation process for the current user's active subscription at the end of the billing period.
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Subscription cancellation requested successfully.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   example: success
 *                 message:
 *                   type: string
 *       401:
 *         description: Authentication required.
 *       404:
 *         description: Active subscription not found to cancel.
 *       500:
 *         description: Internal server error.
 */
router.post('/cancel', authenticateUser, asyncHandler(subscriptionController.cancelSubscription.bind(subscriptionController)));
/**
 * @swagger
 * /api/v1/subscriptions/reactivate:
 *   post:
 *     tags: [Subscriptions - User]
 *     summary: Request subscription reactivation (Admin/SuperAdmin)
 *     description: Reactivates a previously canceled subscription for the current user.
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Subscription reactivation requested successfully.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   example: success
 *                 message:
 *                   type: string
 *       401:
 *         description: Authentication required.
 *       404:
 *         description: Canceled subscription not found or not eligible for reactivation.
 *       500:
 *         description: Internal server error.
 */
router.post('/reactivate', authenticateUser, asyncHandler(subscriptionController.reactivateSubscription.bind(subscriptionController)));
/**
 * @swagger
 * /api/v1/subscriptions/payments:
 *   get:
 *     tags: [Subscriptions - User]
 *     summary: Get user's payment history (Admin/SuperAdmin)
 *     description: Retrieves a list of past payments associated with the current user's subscription.
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Payment history retrieved successfully.
 *         content:
 *           application/json:
 *             schema:
 *                type: object
 *                properties:
 *                   status:
 *                      type: string
 *                      example: success
 *                   data:
 *                      type: array
 *                      items:
 *                          type: object # Define payment history item schema if known
 *                          example: { id: 'pi_123', amount: 1000, currency: 'usd', created: 1678886400, status: 'succeeded' }
 *       401:
 *         description: Authentication required.
 *       500:
 *         description: Internal server error.
 */
router.get('/payments', authenticateUser, asyncHandler(subscriptionController.getPaymentHistory.bind(subscriptionController)));
// --- Webhook Route (REMOVED - Now handled directly in app.ts) --- //
/*
 * @swagger
 * /api/v1/subscriptions/stripe-webhook:
 *   post:
 *     tags: [Subscriptions - Webhook]
 *     summary: Handle Stripe webhook events (Public)
 *     description: Receives events from Stripe (e.g., checkout completed, subscription updated/canceled) and updates the application state accordingly. Access is public but requires a valid Stripe signature.
 *     requestBody:
 *       required: true
 *       description: Raw event payload from Stripe with signature in header.
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             description: Generic Stripe event object structure.
 *     responses:
 *       200:
 *         description: Webhook received and processed successfully (or acknowledged for later processing).
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 received:
 *                   type: boolean
 *                   example: true
 *       400:
 *         description: Bad Request (e.g., invalid signature, missing Stripe-Signature header, malformed payload).
 *       500:
 *         description: Internal server error during webhook processing.
 */
// REMOVED: Webhook route definition is now in app.ts
// router.post(
//     '/stripe-webhook',
//     express.raw({ type: 'application/json' }), // Use raw body parser
//     asyncHandler(subscriptionController.handleWebhook.bind(subscriptionController))
// );
export default router;
