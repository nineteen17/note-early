import { Request, Response, NextFunction } from 'express';
import { SubscriptionService } from '../services/subscription.service';
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
  private subscriptionService: SubscriptionService;

  constructor() {
    this.subscriptionService = new SubscriptionService();
  }

  /**
   * Get all available subscription plans
   */
  async getPlans(req: Request, res: Response, next: NextFunction) {
    try {
      const plans = await this.subscriptionService.getPlans();
      console.log("Getplans triggered from controller");
      
      
      res.status(200).json({
        status: 'success',
        data: plans
      });
      return;
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get current user's subscription
   */
  async getCurrentSubscription(req: Request, res: Response, next: NextFunction) {
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
    } catch (error) {
      next(error);
    }
  }

  /**
   * Create a checkout session for subscription
   */
  async createCheckoutSession(req: Request, res: Response, next: NextFunction) {
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
    } catch (error) {
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
  async cancelSubscription(req: Request, res: Response, next: NextFunction) {
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
    } catch (error) {
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
  async reactivateSubscription(req: Request, res: Response, next: NextFunction) {
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
    } catch (error) {
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
  async getPaymentHistory(req: Request, res: Response, next: NextFunction) {
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
    } catch (error) {
      next(error);
    }
  }

  /**
   * Handle Stripe webhook events
   */
  async handleWebhook(req: Request, res: Response, next: NextFunction) {
    try {
      // This endpoint requires raw body, which Express usually parses
      const payload = req.body;
      const signature = req.headers['stripe-signature'] as string;
      
      if (!signature) {
        res.status(400).json({
          status: 'error',
          message: 'Missing Stripe signature'
        });
        return;
      }
      
      // Implement webhook handling logic here
      // This would typically verify the webhook signature and process different event types
      
      res.status(200).json({ received: true });
      return;
    } catch (error) {
      logger.error('Error handling webhook:', error);
      res.status(400).json({
        status: 'error',
        message: 'Webhook error'
      });
      return;
    }
  }

  /**
   * Create a Stripe Customer Portal session
   */
  async createPortalSession(req: Request, res: Response, next: NextFunction) {
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
      
    } catch (error) {
      // Handle AppErrors specifically if needed, otherwise pass to global handler
      next(error);
    }
  }
} 