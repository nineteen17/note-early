import Stripe from 'stripe';
import { env } from '@/config/env';
import { logger } from '@/utils/logger';

/**
 * Stripe service for handling Stripe API interactions
 */
class StripeService {
  private stripe: Stripe;

  constructor() {
    this.stripe = new Stripe(env.STRIPE_SECRET_KEY);
  }

  /**
   * List all active subscription plans from Stripe
   */
  async listPlans() {
    try {
      const prices = await this.stripe.prices.list({
        active: true,
        expand: ['data.product'],
        type: 'recurring',
      });
      
      return prices.data;
    } catch (error) {
      logger.error('Error fetching plans from Stripe:', error);
      throw new Error('Failed to fetch subscription plans');
    }
  }

  /**
   * Get a customer by ID
   */
  async getCustomer(customerId: string) {
    try {
      return await this.stripe.customers.retrieve(customerId);
    } catch (error) {
      logger.error(`Error fetching customer ${customerId}:`, error);
      throw new Error('Failed to fetch customer data');
    }
  }

  /**
   * Create a new customer in Stripe
   */
  async createCustomer(email: string, name?: string, metadata?: Record<string, string>) {
    try {
      return await this.stripe.customers.create({
        email,
        name,
        metadata,
      });
    } catch (error) {
      logger.error('Error creating customer:', error);
      throw new Error('Failed to create customer in Stripe');
    }
  }

  /**
   * Create a checkout session for subscription
   */
  async createCheckoutSession(customerId: string, priceId: string, successUrl: string, cancelUrl: string, userId: string) {
    try {
      const session = await this.stripe.checkout.sessions.create({
        customer: customerId,
        line_items: [
          {
            price: priceId,
            quantity: 1,
          },
        ],
        mode: 'subscription',
        success_url: successUrl,
        cancel_url: cancelUrl,
        subscription_data: {
          metadata: {
            userId: userId
          }
        }
      });
      
      return session;
    } catch (error) {
      logger.error('Error creating checkout session:', error);
      throw new Error('Failed to create checkout session');
    }
  }

  /**
   * Get a subscription by ID
   */
  async getSubscription(subscriptionId: string) {
    try {
      return await this.stripe.subscriptions.retrieve(subscriptionId);
    } catch (error) {
      logger.error(`Error fetching subscription ${subscriptionId}:`, error);
      throw new Error('Failed to fetch subscription data');
    }
  }

  /**
   * Cancel a subscription
   */
  async cancelSubscription(subscriptionId: string, cancelAtPeriodEnd = true) {
    try {
      return await this.stripe.subscriptions.update(subscriptionId, {
        cancel_at_period_end: cancelAtPeriodEnd,
      });
    } catch (error) {
      logger.error(`Error canceling subscription ${subscriptionId}:`, error);
      throw new Error('Failed to cancel subscription');
    }
  }

  /**
   * Reactivate a subscription that was previously canceled
   */
  async reactivateSubscription(subscriptionId: string) {
    try {
      return await this.stripe.subscriptions.update(subscriptionId, {
        cancel_at_period_end: false,
      });
    } catch (error) {
      logger.error(`Error reactivating subscription ${subscriptionId}:`, error);
      throw new Error('Failed to reactivate subscription');
    }
  }

  /**
   * Get payment history for a customer
   */
  async getPaymentHistory(customerId: string, limit = 10) {
    try {
      return await this.stripe.paymentIntents.list({
        customer: customerId,
        limit,
      });
    } catch (error) {
      logger.error(`Error fetching payment history for customer ${customerId}:`, error);
      throw new Error('Failed to fetch payment history');
    }
  }

  /**
   * Create a Customer Portal session
   */
  async createCustomerPortalSession(customerId: string, returnUrl: string) {
    try {
      const portalSession = await this.stripe.billingPortal.sessions.create({
        customer: customerId,
        return_url: returnUrl, // The URL the user is sent to after leaving the portal
      });
      return portalSession;
    } catch (error) {
      // Log the *original* error caught from Stripe
      logger.error(`Stripe API Error creating customer portal session for customer ${customerId}:`, error); 
      // Throw a generic error for the service layer to handle
      throw new Error('Failed to create customer portal session'); 
    }
  }

  /**
   * Verify Stripe webhook signature
   */
  constructEventFromPayload(payload: string, signature: string) {
    try {
      return this.stripe.webhooks.constructEvent(
        payload,
        signature,
        env.STRIPE_WEBHOOK_SECRET
      );
    } catch (error) {
      logger.error('Error verifying webhook signature:', error);
      throw new Error('Invalid webhook signature');
    }
  }
}

// Export a singleton instance
export const stripeService = new StripeService(); 