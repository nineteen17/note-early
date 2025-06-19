import { relations } from 'drizzle-orm';
import { pgTable, text, varchar, timestamp, pgEnum, uuid } from 'drizzle-orm/pg-core';
import { readingModules } from './reading-modules.js';
import { studentProgress } from './student-progress.js';
import { integer } from 'drizzle-orm/pg-core';
// Define Enums based on Plan (and existing UserRole)
export const UserRole = pgEnum('user_role', ['ADMIN', 'STUDENT', 'SUPER_ADMIN']);
export const SubscriptionStatus = pgEnum('subscription_status', ['free', 'active', 'canceled', 'past_due', 'incomplete', 'incomplete_expired']);
export const SubscriptionPlan = pgEnum('subscription_plan', ['free', 'home', 'pro']);
export const profiles = pgTable('profiles', {
    id: uuid('id').primaryKey().defaultRandom(),
    role: UserRole('role').notNull(),
    fullName: varchar('full_name', { length: 100 }),
    email: varchar('email', { length: 255 }).unique(),
    avatarUrl: text('avatar_url'),
    stripeCustomerId: varchar('stripe_customer_id', { length: 255 }).unique(),
    subscriptionStatus: SubscriptionStatus('subscription_status').default('free'),
    subscriptionPlan: SubscriptionPlan('subscription_plan').default('free'),
    subscriptionRenewalDate: timestamp('subscription_renewal_date', { mode: 'date' }),
    createdAt: timestamp('created_at', { mode: 'date' }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { mode: 'date' }).defaultNow().notNull(),
    pin: text('pin'),
    adminId: uuid('admin_id').references(() => profiles.id, { onDelete: 'set null' }),
    age: integer('age'),
    readingLevel: integer('reading_level'),
});
// Define indexes separately
// Commenting out for testing purposes - seems to cause issues in Vitest environment
// export const profilesEmailIdx = uniqueIndex('email_idx').on(profiles.email);
// export const profilesStripeCustIdIdx = uniqueIndex('stripe_cust_id_idx').on(profiles.stripeCustomerId);
// export const profilesAdminIdIdx = index('admin_id_idx').on(profiles.adminId); 
export const profilesRelations = relations(profiles, ({ one, many }) => ({
    admin: one(profiles, {
        fields: [profiles.adminId],
        references: [profiles.id],
        relationName: 'student_admin',
    }),
    students: many(profiles, {
        relationName: 'admin_students',
    }),
    createdReadingModules: many(readingModules, {
        relationName: 'admin_created_modules'
    }),
    progressRecords: many(studentProgress, {
        relationName: 'student_progress'
    })
}));
