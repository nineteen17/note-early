import { logger } from '@/utils/logger';
import { db } from '@/db';
import { profiles, SubscriptionStatus } from '@/db/schema/profiles';
import { customerSubscriptions } from '@/db/schema/customer-subscriptions';
import { paymentHistory } from '@/db/schema/payment-history';
import { and, eq } from 'drizzle-orm';
import { subscriptionPlans } from '@/db/schema/subscription-plans';
import Stripe from 'stripe';
import { stripeService } from './stripe.service';

// Define types for missing Stripe properties
interface EnhancedStripeSubscription extends Stripe.Subscription {
  current_period_start: number;
  current_period_end: number;
}

interface EnhancedStripeInvoice extends Stripe.Invoice {
  subscription?: string;
  payment_intent?: string;
}

// --- ADDED: Helper to map Stripe status to our DB enum --- //
function mapStripeStatusToDbStatus(stripeStatus: Stripe.Subscription.Status | string): typeof SubscriptionStatus.enumValues[number] {
  const validDbStatuses = SubscriptionStatus.enumValues;
  
  // Direct mapping for common statuses
  if (stripeStatus === 'active' || stripeStatus === 'trialing') {
    return 'active';
  }
  if ((validDbStatuses as ReadonlyArray<string>).includes(stripeStatus)) {
    return stripeStatus as typeof SubscriptionStatus.enumValues[number];
  }
  
  // Map other statuses (incomplete, past_due, canceled, unpaid) explicitly if needed
  // For now, default unknown/unhandled statuses like 'paused' to 'incomplete' or handle as error
  logger.warn(`Unhandled Stripe subscription status "${stripeStatus}" received. Mapping to 'incomplete'.`);
  return 'incomplete'; // Or choose another default like 'active' or throw an error
}

/**
 * Service for handling Stripe webhook events
 */
export class WebhookService {
  /**
   * Process a webhook event from Stripe
   * @param event The webhook event from Stripe
   */
  async processWebhookEvent(event: Stripe.Event): Promise<void> {
    logger.info(`Processing webhook event: ${event.type}`);

    switch (event.type) {
      case 'checkout.session.completed':
        await this.handleCheckoutSessionCompleted(event.data.object as Stripe.Checkout.Session);
        break;
      case 'customer.subscription.created':
        await this.handleSubscriptionCreated(event.data.object as EnhancedStripeSubscription);
        break;
      case 'customer.subscription.updated':
        await this.handleSubscriptionUpdated(event.data.object as EnhancedStripeSubscription);
        break;
      case 'customer.subscription.deleted':
        await this.handleSubscriptionDeleted(event.data.object as EnhancedStripeSubscription);
        break;
      case 'invoice.paid':
        await this.handleInvoicePaid(event.data.object as EnhancedStripeInvoice);
        break;
      case 'invoice.payment_failed':
        await this.handleInvoicePaymentFailed(event.data.object as EnhancedStripeInvoice);
        break;
      default:
        logger.info(`Unhandled event type: ${event.type}`);
    }
  }

  /**
   * Handle checkout.session.completed event
   * This event is sent when a customer completes the checkout process
   */
  private async handleCheckoutSessionCompleted(session: Stripe.Checkout.Session): Promise<void> {
    logger.info(`Checkout session completed: ${session.id}`);

    if (!session.customer || !session.subscription) {
      logger.error('Missing customer or subscription in session', session);
      return;
    }

    const customerEmail = session.customer_email;
    if (!customerEmail) {
      logger.error('Missing customer email in session', session);
      return;
    }

    // Find the user by email
    const user = await db.query.profiles.findFirst({
      where: eq(profiles.email, customerEmail),
    });

    if (!user) {
      logger.error(`User not found with email: ${customerEmail}`);
      return;
    }

    // The subscription and metadata will be processed in the subscription.created event
    logger.info(`User ${user.id} has completed checkout for subscription ${session.subscription}`);
  }

  /**
   * Handle customer.subscription.created event
   * This event is sent when a subscription is created
   */
  private async handleSubscriptionCreated(subscription: EnhancedStripeSubscription): Promise<void> {
    logger.info(`Subscription created: ${subscription.id}`);

    const stripeCustomerId = subscription.customer as string;
    const priceId = subscription.items.data[0]?.price.id;

    if (!priceId) {
      logger.error('Missing price ID in subscription', { subscriptionId: subscription.id });
      return;
    }

    // Find the user by Stripe customer ID
    const user = await db.query.profiles.findFirst({
      where: eq(profiles.stripeCustomerId, stripeCustomerId),
    });

    if (!user) {
      logger.error(`User not found with Stripe customer ID: ${stripeCustomerId}`, { subscriptionId: subscription.id });
      return;
    }

    // Find the plan by Stripe Price ID
    const plan = await db.query.subscriptionPlans.findFirst({
      where: eq(subscriptionPlans.id, priceId),
    });

    if (!plan) {
      logger.error(`Plan not found with Stripe price ID: ${priceId}`, { subscriptionId: subscription.id, userId: user.id });
      return;
    }

    // Create a new subscription record
    await db.insert(customerSubscriptions).values({
      id: subscription.id,
      userId: user.id,
      planId: plan.id,
      stripeCustomerId,
      status: mapStripeStatusToDbStatus(subscription.status),
      currentPeriodStart: new Date(subscription.current_period_start * 1000),
      currentPeriodEnd: new Date(subscription.current_period_end * 1000),
      cancelAtPeriodEnd: subscription.cancel_at_period_end,
    });

    logger.info(`Created customer subscription record for user ${user.id}`, { subscriptionId: subscription.id });

    // Update profile table
    try {
      await db.update(profiles).set({
        subscriptionStatus: mapStripeStatusToDbStatus(subscription.status),
        subscriptionPlan: plan.tier,
        subscriptionRenewalDate: new Date(subscription.current_period_end * 1000),
        updatedAt: new Date(),
      }).where(eq(profiles.id, user.id));
      
      logger.info(`Updated profile ${user.id} based on subscription creation`, { subscriptionId: subscription.id, status: subscription.status, planTier: plan.tier });
    } catch (profileUpdateError) {
      logger.error(`Failed to update profile ${user.id} after subscription creation`, { subscriptionId: subscription.id, error: profileUpdateError });
    }
  }

  /**
   * Handle customer.subscription.updated event
   * This event is sent when a subscription is updated
   */
  private async handleSubscriptionUpdated(subscription: EnhancedStripeSubscription): Promise<void> {
    logger.info(`Subscription updated: ${subscription.id}`);

    // Find the subscription record in our database
    const existingSubscription = await db.query.customerSubscriptions.findFirst({
      where: eq(customerSubscriptions.id, subscription.id),
    });

    if (!existingSubscription) {
      logger.error(`Subscription ${subscription.id} updated event received, but no existing record found in customerSubscriptions.`);
      return;
    }

    // Get the new price ID and plan details
    const priceId = subscription.items.data[0]?.price.id;
    let newPlanTier: typeof subscriptionPlans.$inferSelect['tier'] | null = null;
    let renewalDate = new Date(subscription.current_period_end * 1000);

    if (priceId) {
      const plan = await db.query.subscriptionPlans.findFirst({
        where: eq(subscriptionPlans.id, priceId),
      });
      if (plan) {
        newPlanTier = plan.tier;
      } else {
        logger.warn(`Plan not found with Stripe price ID: ${priceId} during subscription update`, { subscriptionId: subscription.id, userId: existingSubscription.userId });
      }
    } else {
      logger.warn(`Missing price ID in subscription update event`, { subscriptionId: subscription.id, userId: existingSubscription.userId });
    }

    // Update the customer subscription record
    await db
      .update(customerSubscriptions)
      .set({
        status: mapStripeStatusToDbStatus(subscription.status),
        planId: priceId ? priceId : existingSubscription.planId,
        currentPeriodStart: new Date(subscription.current_period_start * 1000),
        currentPeriodEnd: renewalDate,
        cancelAtPeriodEnd: subscription.cancel_at_period_end,
        updatedAt: new Date(),
      })
      .where(eq(customerSubscriptions.id, subscription.id));

    logger.info(`Updated customer subscription record ${subscription.id}`, { userId: existingSubscription.userId });
    
    // Update profile table
    try {
      const updatePayload: Partial<typeof profiles.$inferSelect> = {
        subscriptionStatus: mapStripeStatusToDbStatus(subscription.status),
        subscriptionRenewalDate: renewalDate,
        updatedAt: new Date(),
      };
      if (newPlanTier) {
        updatePayload.subscriptionPlan = newPlanTier;
      }

      await db.update(profiles).set(updatePayload).where(eq(profiles.id, existingSubscription.userId));
      logger.info(`Updated profile ${existingSubscription.userId} based on subscription update`, { subscriptionId: subscription.id, status: subscription.status, planTier: newPlanTier ?? '(unchanged)' });
    } catch (profileUpdateError) {
      logger.error(`Failed to update profile ${existingSubscription.userId} after subscription update`, { subscriptionId: subscription.id, error: profileUpdateError });
    }
  }

  /**
   * Handle customer.subscription.deleted event
   * This event is sent when a subscription is canceled or expires
   */
  private async handleSubscriptionDeleted(subscription: EnhancedStripeSubscription): Promise<void> {
    logger.info(`Subscription deleted: ${subscription.id}`);

    // Find the subscription record
    const existingSubscription = await db.query.customerSubscriptions.findFirst({
      where: eq(customerSubscriptions.id, subscription.id),
    });

    if (!existingSubscription) {
      logger.warn(`Subscription ${subscription.id} deleted event received, but no existing record found in customerSubscriptions.`);
      return;
    }

    // Update the customer subscription record status
    await db
      .update(customerSubscriptions)
      .set({
        status: mapStripeStatusToDbStatus(subscription.status),
        updatedAt: new Date(),
        currentPeriodStart: null,
        currentPeriodEnd: null,
        cancelAtPeriodEnd: false,
      })
      .where(eq(customerSubscriptions.id, subscription.id));

    logger.info(`Updated customer subscription record ${subscription.id} to status: ${subscription.status}`, { userId: existingSubscription.userId });

    // Update profile table to 'free' plan
    try {
      await db.update(profiles).set({
        subscriptionStatus: mapStripeStatusToDbStatus(subscription.status) === 'canceled' ? 'canceled' : 'free',
        subscriptionPlan: 'free',
        subscriptionRenewalDate: null,
        updatedAt: new Date(),
      }).where(eq(profiles.id, existingSubscription.userId));

      logger.info(`Updated profile ${existingSubscription.userId} to free/canceled state based on subscription deletion`, { subscriptionId: subscription.id });
    } catch (profileUpdateError) {
      logger.error(`Failed to update profile ${existingSubscription.userId} after subscription deletion`, { subscriptionId: subscription.id, error: profileUpdateError });
    }
  }

  /**
   * Handle invoice.paid event
   * This event is sent when an invoice is paid successfully
   */
  private async handleInvoicePaid(invoice: EnhancedStripeInvoice): Promise<void> {
    logger.info(`Invoice paid: ${invoice.id}`);

    if (!invoice.customer || !invoice.subscription) {
      logger.error('Missing customer or subscription in invoice', { invoiceId: invoice.id });
      return;
    }

    const stripeCustomerId = invoice.customer as string;
    const stripeSubscriptionId = invoice.subscription as string;

    // Find the user by Stripe customer ID
    const user = await db.query.profiles.findFirst({
      where: eq(profiles.stripeCustomerId, stripeCustomerId),
    });

    if (!user) {
      logger.error(`User not found with Stripe customer ID: ${stripeCustomerId}`, { invoiceId: invoice.id, subscriptionId: stripeSubscriptionId });
      return;
    }

    // Create a payment history record
    await db.insert(paymentHistory).values({
      id: typeof invoice.payment_intent === 'string' ? invoice.payment_intent : `invoice-${invoice.id}`,
      userId: user.id,
      subscriptionId: stripeSubscriptionId,
      amount: String(Number(invoice.amount_paid) / 100),
      currency: invoice.currency,
      status: 'succeeded',
      paymentMethod: invoice.collection_method || 'unknown',
      receiptUrl: invoice.hosted_invoice_url || null,
    });

    logger.info(`Created payment history record for user ${user.id}`, { invoiceId: invoice.id, subscriptionId: stripeSubscriptionId });
    
    // Fetch subscription details and update profile
    try {
      // Fetch the full subscription object from Stripe to get current details
      const stripeSubscriptionResponse = await stripeService.getSubscription(stripeSubscriptionId);
      // --- Corrected: Cast via unknown to EnhancedStripeSubscription --- 
      const stripeSubscription = stripeSubscriptionResponse as unknown as EnhancedStripeSubscription; 

      if (!stripeSubscription || typeof stripeSubscription.current_period_end !== 'number') {
         logger.error('Fetched subscription is missing required fields (e.g., current_period_end)', { invoiceId: invoice.id, subscriptionId: stripeSubscriptionId, userId: user.id });
         throw new Error('Fetched subscription missing required fields');
      }
      
      // Now we know current_period_end is a number due to the interface/cast and check
      const renewalDate = new Date(stripeSubscription.current_period_end * 1000);
      
      // --- Rest of the logic using stripeSubscription --- 
      const priceId = stripeSubscription.items.data[0]?.price.id;
      let planTier: typeof subscriptionPlans.$inferSelect['tier'] | null = null;
      
      if (priceId) {
        const plan = await db.query.subscriptionPlans.findFirst({
          where: eq(subscriptionPlans.id, priceId),
        });
        if (plan) {
          planTier = plan.tier;
        } else {
          logger.warn(`Plan not found with Stripe price ID: ${priceId} during invoice.paid handling`, { invoiceId: invoice.id, subscriptionId: stripeSubscriptionId, userId: user.id });
        }
      } else {
        logger.warn(`Missing price ID in fetched subscription during invoice.paid handling`, { invoiceId: invoice.id, subscriptionId: stripeSubscriptionId, userId: user.id });
      }

      const updatePayload: Partial<typeof profiles.$inferSelect> = {
        subscriptionStatus: 'active',
        subscriptionRenewalDate: renewalDate,
        updatedAt: new Date(),
      };
      if (planTier) {
        updatePayload.subscriptionPlan = planTier;
      }

      await db.update(profiles).set(updatePayload).where(eq(profiles.id, user.id));
      
      logger.info(`Updated profile ${user.id} status to active following invoice payment.`, { invoiceId: invoice.id, subscriptionId: stripeSubscriptionId, planTier: planTier ?? '(unchanged)' });
    } catch (profileUpdateError) {
      logger.error(`Failed to update profile ${user.id} after invoice payment`, { invoiceId: invoice.id, subscriptionId: stripeSubscriptionId, error: profileUpdateError });
    }
  }

  /**
   * Handle invoice.payment_failed event
   * This event is sent when an invoice payment fails
   */
  private async handleInvoicePaymentFailed(invoice: EnhancedStripeInvoice): Promise<void> {
    logger.info(`Invoice payment failed: ${invoice.id}`);

    if (!invoice.customer || !invoice.subscription) {
      logger.error('Missing customer or subscription in invoice', { invoiceId: invoice.id });
      return;
    }

    const stripeCustomerId = invoice.customer as string;
    const stripeSubscriptionId = invoice.subscription as string;

    // Find the user by Stripe customer ID
    const user = await db.query.profiles.findFirst({
      where: eq(profiles.stripeCustomerId, stripeCustomerId),
    });

    if (!user) {
      logger.error(`User not found with Stripe customer ID: ${stripeCustomerId}`, { invoiceId: invoice.id, subscriptionId: stripeSubscriptionId });
      return;
    }

    // Create a payment history record
    await db.insert(paymentHistory).values({
      id: typeof invoice.payment_intent === 'string' ? invoice.payment_intent : `failed-${invoice.id}`,
      userId: user.id,
      subscriptionId: stripeSubscriptionId,
      amount: String(Number(invoice.amount_due) / 100),
      currency: invoice.currency,
      status: 'failed',
      paymentMethod: invoice.collection_method || 'unknown',
      receiptUrl: invoice.hosted_invoice_url || null,
    });
    logger.info(`Created failed payment history record for user ${user.id}`, { invoiceId: invoice.id, subscriptionId: stripeSubscriptionId });

    // Update the customer subscription status
    await db
      .update(customerSubscriptions)
      .set({
        status: 'past_due',
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(customerSubscriptions.stripeCustomerId, stripeCustomerId),
          eq(customerSubscriptions.id, stripeSubscriptionId)
        )
      );
    logger.info(`Updated customer subscription ${stripeSubscriptionId} status to past_due`, { userId: user.id, invoiceId: invoice.id });

    // Update profile status
    try {
      await db.update(profiles).set({
        subscriptionStatus: 'past_due',
        updatedAt: new Date(),
      }).where(eq(profiles.id, user.id));
      
      logger.info(`Updated profile ${user.id} status to past_due following invoice payment failure.`, { invoiceId: invoice.id, subscriptionId: stripeSubscriptionId });
    } catch (profileUpdateError) {
      logger.error(`Failed to update profile ${user.id} after invoice payment failure`, { invoiceId: invoice.id, subscriptionId: stripeSubscriptionId, error: profileUpdateError });
    }
  }
} 