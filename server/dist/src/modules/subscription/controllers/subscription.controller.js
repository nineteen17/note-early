import { SubscriptionService } from '../services/subscription.service.js';
import { AppError } from '@/utils/errors';
import { logger } from '@/utils/logger';
import { z } from 'zod';
// Schema for createCheckoutSession body
const CreateCheckoutSessionSchema = z.object({
    planId: z.string().min(1, 'Plan ID is required') // Basic validation, could be more specific (e.g., regex for price_xxx)
});
/**
 * Controller for subscription-related operations
 */
export class SubscriptionController {
    constructor() {
        this.subscriptionService = new SubscriptionService();
    }
    /**
     * Get all available subscription plans
     */
    async getPlans(req, res, next) {
        try {
            const plans = await this.subscriptionService.getPlans();
            console.log("Getplans triggered from controller");
            res.status(200).json({
                status: 'success',
                data: plans
            });
            return;
        }
        catch (error) {
            next(error);
        }
    }
    /**
     * Get current user's subscription
     */
    async getCurrentSubscription(req, res, next) {
        try {
            const userId = req.user?.id;
            if (!userId) {
                res.status(401).json({
                    status: 'error',
                    message: 'Authentication required'
                });
                return;
            }
            const subscription = await this.subscriptionService.getCurrentSubscription(userId);
            res.status(200).json({
                status: 'success',
                data: subscription
            });
            return;
        }
        catch (error) {
            next(error);
        }
    }
    /**
     * Create a checkout session for subscription
     */
    async createCheckoutSession(req, res, next) {
        try {
            const userId = req.user?.id;
            const { planId } = CreateCheckoutSessionSchema.parse(req.body); // Validate req.body
            if (!userId) {
                res.status(401).json({
                    status: 'error',
                    message: 'Authentication required'
                });
                return;
            }
            const session = await this.subscriptionService.createCheckoutSession(userId, planId);
            res.status(200).json({
                status: 'success',
                data: {
                    sessionId: session.id,
                    url: session.url
                }
            });
            return;
        }
        catch (error) {
            if (error instanceof z.ZodError) {
                return res.status(400).json({ status: 'error', message: 'Invalid input: ' + error.errors.map(e => e.message).join(', ') });
            }
            if (error instanceof AppError) {
                res.status(error.statusCode).json({
                    status: 'error',
                    message: error.message
                });
                return;
            }
            next(error);
        }
    }
    /**
     * Cancel a subscription
     */
    async cancelSubscription(req, res, next) {
        try {
            const userId = req.user?.id;
            if (!userId) {
                res.status(401).json({
                    status: 'error',
                    message: 'Authentication required'
                });
                return;
            }
            const result = await this.subscriptionService.cancelSubscription(userId);
            res.status(200).json({
                status: 'success',
                message: 'Subscription cancellation requested successfully.'
            });
            return;
        }
        catch (error) {
            if (error instanceof AppError) {
                res.status(error.statusCode).json({
                    status: 'error',
                    message: error.message
                });
                return;
            }
            next(error);
        }
    }
    /**
     * Reactivate a canceled subscription
     */
    async reactivateSubscription(req, res, next) {
        try {
            const userId = req.user?.id;
            if (!userId) {
                res.status(401).json({
                    status: 'error',
                    message: 'Authentication required'
                });
                return;
            }
            const result = await this.subscriptionService.reactivateSubscription(userId);
            res.status(200).json({
                status: 'success',
                message: 'Subscription reactivation requested successfully.'
            });
            return;
        }
        catch (error) {
            if (error instanceof AppError) {
                res.status(error.statusCode).json({
                    status: 'error',
                    message: error.message
                });
                return;
            }
            next(error);
        }
    }
    /**
     * Get payment history
     */
    async getPaymentHistory(req, res, next) {
        try {
            const userId = req.user?.id;
            if (!userId) {
                res.status(401).json({
                    status: 'error',
                    message: 'Authentication required'
                });
                return;
            }
            const payments = await this.subscriptionService.getPaymentHistory(userId);
            res.status(200).json({
                status: 'success',
                data: payments
            });
            return;
        }
        catch (error) {
            next(error);
        }
    }
    /**
     * Handle Stripe webhook events
     */
    async handleWebhook(req, res, next) {
        // Use try-catch to handle errors from the service, including signature verification
        try {
            const signature = req.headers['stripe-signature'];
            // IMPORTANT: req.body should be the raw buffer/string due to express.raw()
            const payload = req.body;
            if (!signature) {
                return res.status(400).json({ status: 'error', message: 'Missing Stripe signature' });
            }
            if (!payload) {
                return res.status(400).json({ status: 'error', message: 'Missing request body' });
            }
            // Call the service method to process the event
            const result = await this.subscriptionService.processWebhookEvent(payload, signature);
            // Send response back to Stripe
            res.status(200).json(result); // result is { received: true }
        }
        catch (error) {
            // Log the error details from the service
            logger.error('Error processing webhook in controller:', error instanceof Error ? error.message : error);
            // If it's an AppError (like signature verification failure), use its status code
            if (error instanceof AppError) {
                return res.status(error.statusCode).json({ status: 'error', message: error.message });
            }
            // For other unexpected errors, send a generic 500
            return res.status(500).json({ status: 'error', message: 'Internal webhook processing error' });
        }
    }
    /**
     * Create a Stripe Customer Portal session
     */
    async createPortalSession(req, res, next) {
        try {
            const userId = req.user?.id;
            if (!userId) {
                // Use AppError for consistency
                return next(new AppError('Authentication required', 401));
            }
            // Call the service method
            const session = await this.subscriptionService.createPortalSession(userId);
            // Return the URL in the response
            res.status(200).json({
                status: 'success',
                data: session // Contains { url: ... }
            });
            // No explicit return needed after res.json()
        }
        catch (error) {
            // Handle AppErrors specifically if needed, otherwise pass to global handler
            next(error);
        }
    }
}
