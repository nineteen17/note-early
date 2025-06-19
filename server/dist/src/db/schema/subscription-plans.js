import { boolean, integer, numeric, pgTable, text, timestamp } from 'drizzle-orm/pg-core';
import { SubscriptionPlan } from './profiles.js';
export const subscriptionPlans = pgTable('subscription_plans', {
    id: text('id').primaryKey(), // Matches Stripe price ID
    name: text('name').notNull(),
    description: text('description'),
    price: numeric('price').notNull(),
    interval: text('interval').notNull(), // 'month' or 'year'
    tier: SubscriptionPlan('tier').notNull(),
    studentLimit: integer('student_limit').notNull(),
    moduleLimit: integer('module_limit').notNull(),
    customModuleLimit: integer('custom_module_limit').notNull(),
    isActive: boolean('is_active').default(true),
    createdAt: timestamp('created_at').defaultNow(),
    updatedAt: timestamp('updated_at').defaultNow(),
});
