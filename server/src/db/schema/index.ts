// Export all schemas and their relationships
export * from './profiles';
export * from './reading-modules';
export * from './student-progress';
export * from './subscription-plans';
export * from './customer-subscriptions';
export * from './payment-history';
export * from './paragraph-submissions';

// Export schema types
import { profiles } from './profiles';
import { readingModules } from './reading-modules';
import { studentProgress } from './student-progress';
import { subscriptionPlans } from './subscription-plans';
import { customerSubscriptions } from './customer-subscriptions';
import { paymentHistory } from './payment-history';
import { paragraphSubmissions } from './paragraph-submissions';
import { vocabulary } from './vocabulary';

// Infer types from schemas
export type Profile = typeof profiles.$inferSelect;
export type NewProfile = typeof profiles.$inferInsert;

export type ReadingModule = typeof readingModules.$inferSelect;
export type NewReadingModule = typeof readingModules.$inferInsert;

export type StudentProgress = typeof studentProgress.$inferSelect;
export type NewStudentProgress = typeof studentProgress.$inferInsert;

export type SubscriptionPlan = typeof subscriptionPlans.$inferSelect;
export type NewSubscriptionPlan = typeof subscriptionPlans.$inferInsert;

export type CustomerSubscription = typeof customerSubscriptions.$inferSelect;
export type NewCustomerSubscription = typeof customerSubscriptions.$inferInsert;

export type PaymentHistoryRecord = typeof paymentHistory.$inferSelect;
export type NewPaymentHistoryRecord = typeof paymentHistory.$inferInsert;

export type ParagraphSubmission = typeof paragraphSubmissions.$inferSelect;
export type NewParagraphSubmission = typeof paragraphSubmissions.$inferInsert;

export type Vocabulary = typeof vocabulary.$inferSelect;
export type NewVocabulary = typeof vocabulary.$inferInsert;

// Export all schemas and relations
export {
  customerSubscriptions,
  paymentHistory,
  subscriptionPlans,
  profiles,
  readingModules,
  studentProgress,
  paragraphSubmissions,
  vocabulary
}; 