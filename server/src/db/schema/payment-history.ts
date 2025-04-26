import { numeric, pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core';
import { profiles } from './profiles';
import { customerSubscriptions } from './customer-subscriptions';

export const paymentHistory = pgTable('payment_history', {
  id: text('id').primaryKey(), // Payment intent ID from Stripe
  userId: uuid('user_id')
    .notNull()
    .references(() => profiles.id),
  subscriptionId: text('subscription_id').references(
    () => customerSubscriptions.id
  ),
  amount: numeric('amount').notNull(),
  currency: text('currency').notNull(),
  status: text('status').notNull(), // succeeded, pending, failed
  paymentMethod: text('payment_method'), // card, bank_transfer
  receiptUrl: text('receipt_url'),
  createdAt: timestamp('created_at').defaultNow(),
}); 