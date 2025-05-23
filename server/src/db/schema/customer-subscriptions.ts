import { boolean, pgTable, text, timestamp, uuid, integer } from 'drizzle-orm/pg-core';
import { profiles } from './profiles';
import { subscriptionPlans } from './subscription-plans';

export const customerSubscriptions = pgTable('customer_subscriptions', {
  id: text('id').primaryKey(), // Subscription ID from Stripe
  userId: uuid('user_id')
    .notNull()
    .references(() => profiles.id),
  planId: text('plan_id')
    .notNull()
    .references(() => subscriptionPlans.id),
  stripeCustomerId: text('stripe_customer_id').notNull(),
  status: text('status').notNull(), // active, canceled, past_due, etc.
  currentPeriodStart: timestamp('current_period_start'),
  currentPeriodEnd: timestamp('current_period_end'),
  cancelAtPeriodEnd: boolean('cancel_at_period_end').default(false),
  customModulesCreatedThisPeriod: integer('custom_modules_created_this_period').notNull().default(0),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
}); 