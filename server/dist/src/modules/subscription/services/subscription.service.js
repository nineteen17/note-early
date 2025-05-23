import { db } from '@/db';
import { subscriptionPlans, customerSubscriptions, profiles, } from '@/db/schema';
import { stripeService } from './stripe.service';
import { logger } from '@/utils/logger';
import { eq } from 'drizzle-orm';
import { AppError } from '@/utils/errors';
import { env } from '@/config/env';
import { SubscriptionPlan } from '@/db/schema/profiles';
import Stripe from 'stripe';
import * as schema from '@/db/schema';
/**
 * Service for managing subscriptions
 */
export class SubscriptionService {
    constructor() {
        // Using type assertion to bypass strict type check for apiVersion
        this.stripeInstance = new Stripe(env.STRIPE_SECRET_KEY, {
            apiVersion: '2024-06-20', // Reverted to intended version with type assertion
            typescript: true,
        });
    }
    /**
     * Get all available subscription plans
     */
    async getPlans() {
        try {
            // First try to get plans from our database
            const plans = await db
                .select()
                .from(subscriptionPlans)
                .where(eq(subscriptionPlans.isActive, true));
            // If no plans in DB, sync from Stripe
            if (plans.length === 0) {
                await this.syncPlansFromStripe();
                return await db
                    .select()
                    .from(subscriptionPlans)
                    .where(eq(subscriptionPlans.isActive, true));
            }
            return plans;
        }
        catch (error) {
            logger.error('Error fetching subscription plans:', error);
            throw new AppError('Failed to fetch subscription plans', 500);
        }
    }
    /**
     * Sync subscription plans from Stripe to our database
     */
    async syncPlansFromStripe() {
        try {
            const stripePlans = await stripeService.listPlans();
            // Define allowed tier values from the enum (now imported directly)
            const allowedTiers = SubscriptionPlan.enumValues;
            // We'll process each plan from Stripe and upsert to our database
            for (const plan of stripePlans) {
                // Skip if plan has no associated product, if product is deleted, OR if plan is inactive
                if (!plan.active || !plan.product || typeof plan.product === 'string' || plan.product.deleted) {
                    continue;
                }
                // Now TypeScript knows plan.product is a Stripe.Product
                const product = plan.product;
                const metadata = product.metadata || {};
                // Validate and determine the tier
                let validatedTier = 'free'; // Default to 'free'
                const metadataTier = metadata.tier;
                if (metadataTier) {
                    if (allowedTiers.includes(metadataTier)) {
                        validatedTier = metadataTier;
                    }
                    else {
                        logger.warn(`Stripe Product ${product.id} has invalid metadata.tier: "${metadataTier}". Defaulting to 'free'. Allowed values: ${allowedTiers.join(', ')}`);
                    }
                }
                await db
                    .insert(subscriptionPlans)
                    .values({
                    id: plan.id,
                    name: product.name,
                    description: product.description || null,
                    price: plan.unit_amount ? (plan.unit_amount / 100).toString() : '0', // Convert cents to dollars string
                    interval: plan.recurring?.interval || 'month',
                    tier: validatedTier, // Use validated tier
                    studentLimit: parseInt(metadata.studentLimit || '3'),
                    moduleLimit: parseInt(metadata.moduleLimit || '3'),
                    customModuleLimit: parseInt(metadata.customModuleLimit || '1'),
                    isActive: plan.active,
                })
                    .onConflictDoUpdate({
                    target: subscriptionPlans.id,
                    set: {
                        name: product.name,
                        description: product.description || null,
                        price: plan.unit_amount ? (plan.unit_amount / 100).toString() : '0', // Convert cents to dollars string
                        interval: plan.recurring?.interval || 'month',
                        tier: validatedTier, // Use validated tier
                        studentLimit: parseInt(metadata.studentLimit || '3'),
                        moduleLimit: parseInt(metadata.moduleLimit || '3'),
                        customModuleLimit: parseInt(metadata.customModuleLimit || '1'),
                        isActive: plan.active,
                        updatedAt: new Date(),
                    },
                });
            }
            logger.info('Successfully synced plans from Stripe');
        }
        catch (error) {
            logger.error('Error syncing plans from Stripe:', error);
            throw new AppError('Failed to sync subscription plans', 500);
        }
    }
    /**
     * Get a user's current subscription
     */
    async getCurrentSubscription(userId) {
        try {
            const subscription = await db
                .select()
                .from(customerSubscriptions)
                .where(eq(customerSubscriptions.userId, userId))
                .limit(1);
            if (subscription.length === 0) {
                // User has no subscription, return the free plan
                const freePlan = await db
                    .select()
                    .from(subscriptionPlans)
                    .where(eq(subscriptionPlans.tier, 'free'))
                    .limit(1);
                if (freePlan.length === 0) {
                    throw new AppError('No free plan found', 404);
                }
                return {
                    plan: freePlan[0],
                    subscription: null,
                };
            }
            // Get the associated plan
            const plan = await db
                .select()
                .from(subscriptionPlans)
                .where(eq(subscriptionPlans.id, subscription[0].planId))
                .limit(1);
            if (plan.length === 0) {
                throw new AppError('Subscription plan not found', 404);
            }
            return {
                plan: plan[0],
                subscription: subscription[0],
            };
        }
        catch (error) {
            if (error instanceof AppError)
                throw error;
            logger.error(`Error fetching subscription for user ${userId}:`, error);
            throw new AppError('Failed to fetch subscription', 500);
        }
    }
    /**
     * Create a checkout session for a new subscription
     */
    async createCheckoutSession(userId, planId) {
        try {
            // Verify the plan exists
            const plan = await db
                .select()
                .from(subscriptionPlans)
                .where(eq(subscriptionPlans.id, planId))
                .limit(1);
            if (plan.length === 0) {
                throw new AppError('Subscription plan not found', 404);
            }
            // Get user information
            const user = await db
                .select()
                .from(profiles)
                .where(eq(profiles.id, userId))
                .limit(1);
            if (user.length === 0) {
                throw new AppError('User not found', 404);
            }
            // Check if user already has a subscription
            const existingSubscription = await db
                .select()
                .from(customerSubscriptions)
                .where(eq(customerSubscriptions.userId, userId))
                .limit(1);
            let stripeCustomerId;
            if (existingSubscription.length > 0) {
                // User already has a subscription
                stripeCustomerId = existingSubscription[0].stripeCustomerId;
                // !! IMPORTANT CHECK !!
                // Check if the existing subscription is *active* and for the *same* plan.
                // Only block if they are trying to buy the same plan they *already have active*.
                // An 'incomplete' or 'canceled' status for the same planId should probably allow re-checkout.
                if (existingSubscription[0].planId === planId &&
                    (existingSubscription[0].status === 'active' || existingSubscription[0].status === 'trialing') /* Add other active statuses if needed */) {
                    throw new AppError('User is already actively subscribed to this plan', 400);
                }
                // If the existing subscription is for a *different* plan, or the *same* plan but not active (e.g., incomplete, canceled), 
                // we should proceed to create a checkout session (Stripe handles upgrades/changes).
            }
            else {
                // Create a new Stripe customer for this user if they don't have one
                const customer = await stripeService.createCustomer(user[0].email || `user+${userId}@noteearly.com`, // Ensure valid email format
                user[0].fullName || undefined, // Pass undefined if fullName is null
                { userId } // Link Supabase user ID in Stripe metadata
                );
                stripeCustomerId = customer.id;
                // REMOVED: Do NOT create a record in our database here.
                // This should only happen after successful payment via webhook.
                // -----------------------------------------------------------
                // await db
                //   .insert(customerSubscriptions)
                //   .values({
                //     id: 'temp_' + Date.now(), 
                //     userId,
                //     planId, 
                //     stripeCustomerId,
                //     status: 'incomplete',
                //   });
                // -----------------------------------------------------------
            }
            // Get or create the Stripe Customer ID from the user profile if not found via subscription
            // This handles cases where the user exists but has no subscription record yet, 
            // or ensures we use the existing Stripe ID if profile has it.
            if (!stripeCustomerId) {
                if (user[0].stripeCustomerId) {
                    stripeCustomerId = user[0].stripeCustomerId;
                }
                else {
                    // If still no customer ID, create one (redundant if the `else` block above ran, but safe)
                    const customer = await stripeService.createCustomer(user[0].email || `user+${userId}@noteearly.com`, user[0].fullName || undefined, { userId });
                    stripeCustomerId = customer.id;
                    // Also update the profile table with the new Stripe customer ID
                    await db.update(profiles).set({ stripeCustomerId: stripeCustomerId }).where(eq(profiles.id, userId));
                }
            }
            // Create a checkout session
            const session = await stripeService.createCheckoutSession(stripeCustomerId, planId, `${env.CLIENT_URL}/subscription/success?session_id={CHECKOUT_SESSION_ID}`, // Ensure CLIENT_URL is in env.ts
            `${env.CLIENT_URL}/subscription/cancel` // Ensure CLIENT_URL is in env.ts
            );
            return session;
        }
        catch (error) {
            if (error instanceof AppError)
                throw error;
            logger.error(`Error creating checkout session for user ${userId}:`, error);
            throw new AppError('Failed to create checkout session', 500);
        }
    }
    /**
     * Cancel a user's subscription
     */
    async cancelSubscription(userId) {
        try {
            // Get the user's current subscription
            const subscription = await db
                .select()
                .from(customerSubscriptions)
                .where(eq(customerSubscriptions.userId, userId))
                .limit(1);
            if (subscription.length === 0) {
                throw new AppError('No active subscription found', 404);
            }
            // Only cancel if status is active
            if (subscription[0].status !== 'active') {
                throw new AppError('Subscription is not active', 400);
            }
            // Call Stripe to cancel the subscription (at period end by default)
            const cancelledStripeSubscription = await stripeService.cancelSubscription(subscription[0].id // Use the actual subscription ID from the DB
            );
            // Note: We rely on the webhook handler to update the DB status
            // based on the 'customer.subscription.updated' event from Stripe.
            return cancelledStripeSubscription;
        }
        catch (error) {
            if (error instanceof AppError)
                throw error;
            logger.error(`Error canceling subscription for user ${userId}:`, error);
            throw new AppError('Failed to cancel subscription', 500);
        }
    }
    /**
     * Reactivate a user's subscription
     */
    async reactivateSubscription(userId) {
        try {
            // Get the user's current subscription
            const subscription = await db
                .select()
                .from(customerSubscriptions)
                .where(eq(customerSubscriptions.userId, userId))
                .limit(1);
            if (subscription.length === 0) {
                throw new AppError('No subscription found for user', 404);
            }
            // Check if the subscription is in a state that can be reactivated
            // Typically, this means it's 'active' but set to cancel at period end,
            // or potentially 'canceled' if you allow reactivation after full cancellation.
            // For now, let's assume we only reactivate subscriptions set to cancel at period end.
            if (subscription[0].status !== 'active' || !subscription[0].cancelAtPeriodEnd) {
                throw new AppError('Subscription cannot be reactivated', 400);
            }
            // Call Stripe to reactivate (remove cancel_at_period_end)
            const reactivatedStripeSubscription = await stripeService.reactivateSubscription(subscription[0].id // Use the actual subscription ID from the DB
            );
            // Note: We rely on the webhook handler to update the DB status
            // based on the 'customer.subscription.updated' event from Stripe.
            return reactivatedStripeSubscription;
        }
        catch (error) {
            if (error instanceof AppError)
                throw error;
            logger.error(`Error reactivating subscription for user ${userId}:`, error);
            throw new AppError('Failed to reactivate subscription', 500);
        }
    }
    /**
     * Get payment history for a user
     */
    async getPaymentHistory(userId) {
        try {
            // Get the user's Stripe customer ID
            const customerSub = await db
                .select({ stripeCustomerId: customerSubscriptions.stripeCustomerId })
                .from(customerSubscriptions)
                .where(eq(customerSubscriptions.userId, userId))
                .limit(1);
            if (customerSub.length === 0 || !customerSub[0].stripeCustomerId) {
                // If user has no subscription record or customer ID, they likely have no payment history
                // Alternatively, check the profiles table if customerId might be stored there initially.
                // For now, assume no history if no subscription record found.
                logger.warn(`No Stripe customer ID found for user ${userId} when fetching payment history.`);
                return []; // Return empty array or throw specific error
            }
            const stripeCustomerId = customerSub[0].stripeCustomerId;
            // Call Stripe service to get payment history
            const paymentHistoryResult = await stripeService.getPaymentHistory(stripeCustomerId);
            // You might want to map/transform this data before returning
            return paymentHistoryResult.data;
        }
        catch (error) {
            if (error instanceof AppError)
                throw error;
            logger.error(`Error fetching payment history for user ${userId}:`, error);
            throw new AppError('Failed to fetch payment history', 500);
        }
    }
    /**
     * Create a Stripe Customer Portal session for an existing customer
     */
    async createPortalSession(userId) {
        try {
            // Find the user's profile to get their Stripe Customer ID
            const userProfile = await db
                .select({
                stripeCustomerId: profiles.stripeCustomerId,
                role: profiles.role
            })
                .from(profiles)
                .where(eq(profiles.id, userId))
                .limit(1);
            if (userProfile.length === 0) {
                throw new AppError('User profile not found', 404);
            }
            const { stripeCustomerId, role } = userProfile[0];
            // Optional: Add check if user role should have access (e.g., not STUDENTS)
            if (role === 'STUDENT') { // Assuming students shouldn't manage subscriptions
                throw new AppError('Students cannot manage subscriptions', 403);
            }
            if (!stripeCustomerId) {
                throw new AppError('Stripe customer ID not found for this user', 404);
                // This might happen if signup flow didn't create/link Stripe customer
                // Or if they are on a free plan without ever starting checkout
            }
            // Define the return URL (where user goes after portal)
            const returnUrl = `${env.FRONTEND_URL}/admin/settings/subscription`; // Corrected path
            // Call the StripeService to create the portal session
            const portalSession = await stripeService.createCustomerPortalSession(stripeCustomerId, returnUrl);
            // Return the session URL
            return { url: portalSession.url };
        }
        catch (error) {
            if (error instanceof AppError)
                throw error;
            logger.error(`Error creating portal session for user ${userId}:`, error);
            throw new AppError('Failed to create customer portal session', 500);
        }
    }
    /**
     * Handles incoming Stripe webhook events.
     * Verifies signature and processes relevant events.
     * @param payload - The raw request body from Stripe.
     * @param signature - The value of the 'stripe-signature' header.
     * @returns {Promise<{ received: boolean; message?: string }>} - Confirmation of processing.
     */
    async processWebhookEvent(payload, signature) {
        const webhookSecret = env.STRIPE_WEBHOOK_SECRET;
        let event;
        try {
            event = this.stripeInstance.webhooks.constructEvent(payload, signature, webhookSecret);
            logger.info(`Stripe webhook received: ${event.type}`);
        }
        catch (err) {
            logger.error(`❌ Webhook signature verification failed: ${err.message}`);
            throw new AppError(`Webhook Error: ${err.message}`, 400);
        }
        // Handle the event
        switch (event.type) {
            case 'invoice.paid':
                const invoice = event.data.object;
                logger.info(`Processing invoice.paid: ${invoice.id}, Reason: ${invoice.billing_reason}`);
                // Safely access subscription ID - check if the property exists and is a string
                const subscriptionIdFromInvoice = invoice.subscription;
                if (subscriptionIdFromInvoice && typeof subscriptionIdFromInvoice === 'string' &&
                    invoice.billing_reason === 'subscription_cycle') {
                    try {
                        const result = await db.update(schema.customerSubscriptions)
                            .set({ customModulesCreatedThisPeriod: 0 })
                            .where(eq(schema.customerSubscriptions.id, subscriptionIdFromInvoice))
                            .returning({ updatedId: schema.customerSubscriptions.id });
                        if (result.length > 0) {
                            logger.info(`Reset monthly module count for subscription ${subscriptionIdFromInvoice}`);
                        }
                        else {
                            logger.warn(`Subscription ${subscriptionIdFromInvoice} not found in DB for resetting module count.`);
                        }
                    }
                    catch (dbError) {
                        logger.error(`Database error resetting module count for sub ${subscriptionIdFromInvoice}:`, dbError);
                    }
                }
                break;
            // --- Handle Subscription Creation/Update/Deletion to keep DB in sync --- 
            case 'customer.subscription.created':
            case 'customer.subscription.updated':
                const subscription = event.data.object;
                logger.info(`Processing ${event.type}: ${subscription.id}`);
                try {
                    const plan = await db.query.subscriptionPlans.findFirst({ where: eq(schema.subscriptionPlans.id, subscription.items.data[0]?.price.id) });
                    if (!plan) {
                        logger.error(`Plan ${subscription.items.data[0]?.price.id} not found in DB for subscription ${subscription.id}`);
                        break;
                    }
                    // Safely access potentially missing properties
                    const currentPeriodStart = subscription.current_period_start;
                    const currentPeriodEnd = subscription.current_period_end;
                    const userId = subscription.metadata?.userId;
                    const customerId = typeof subscription.customer === 'string' ? subscription.customer : subscription.customer?.id;
                    const status = subscription.status;
                    const cancelAtEnd = subscription.cancel_at_period_end;
                    if (!userId) {
                        logger.error(`Missing userId in metadata for subscription ${subscription.id}`);
                        break; // Cannot link subscription without userId
                    }
                    if (!customerId) {
                        logger.error(`Could not determine customer ID for subscription ${subscription.id}`);
                        break; // Cannot link subscription without customerId
                    }
                    if (!currentPeriodStart || !currentPeriodEnd) {
                        logger.error(`Missing period dates for subscription ${subscription.id}`);
                        break; // Need dates for storage
                    }
                    await db.insert(schema.customerSubscriptions)
                        .values({
                        id: subscription.id,
                        userId: userId,
                        planId: plan.id,
                        stripeCustomerId: customerId,
                        status: status,
                        currentPeriodStart: new Date(currentPeriodStart * 1000),
                        currentPeriodEnd: new Date(currentPeriodEnd * 1000),
                        cancelAtPeriodEnd: cancelAtEnd,
                        customModulesCreatedThisPeriod: 0, // Initialize counter
                    })
                        .onConflictDoUpdate({
                        target: schema.customerSubscriptions.id,
                        set: {
                            planId: plan.id,
                            status: status,
                            currentPeriodStart: new Date(currentPeriodStart * 1000),
                            currentPeriodEnd: new Date(currentPeriodEnd * 1000),
                            cancelAtPeriodEnd: cancelAtEnd,
                            updatedAt: new Date()
                            // NOTE: Counter is NOT reset on general updates here, only on invoice.paid
                        }
                    });
                    logger.info(`Subscription ${subscription.id} upserted in DB.`);
                }
                catch (dbError) {
                    logger.error(`Database error upserting subscription ${subscription.id}:`, dbError);
                }
                break;
            case 'customer.subscription.deleted':
                const deletedSubscription = event.data.object;
                logger.info(`Processing customer.subscription.deleted: ${deletedSubscription.id}`);
                try {
                    await db.update(schema.customerSubscriptions)
                        .set({ status: 'canceled', updatedAt: new Date() })
                        .where(eq(schema.customerSubscriptions.id, deletedSubscription.id));
                    logger.info(`Subscription ${deletedSubscription.id} marked as canceled in DB.`);
                }
                catch (dbError) {
                    logger.error(`Database error updating deleted subscription ${deletedSubscription.id}:`, dbError);
                }
                break;
            // Add other event types as needed (e.g., checkout.session.completed)
            default:
                logger.warn(`Unhandled Stripe event type: ${event.type}`);
        }
        return { received: true };
    }
}
