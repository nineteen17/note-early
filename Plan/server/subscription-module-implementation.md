# Subscription Module Implementation Plan

## Overview

This document outlines the implementation plan for the NoteEarly subscription module, which will enable freemium business model with tiered access to content and features.

## Architecture Components

1. **Database Schema**
2. **Stripe Integration**
3. **API Endpoints**
4. **Admin UI for Subscription Management**
5. **Student/User UI for Plan Selection**
6. **Webhook Handling for Stripe Events**

## 1. Database Schema

We'll need to extend our existing database schema with the following tables:

### Subscription Plans Table

```typescript
// src/db/schema/subscription-plans.ts
export const subscriptionPlans = pgTable("subscription_plans", {
  id: text("id").primaryKey(), // Matches Stripe price ID
  name: text("name").notNull(),
  description: text("description"),
  price: numeric("price").notNull(),
  interval: text("interval").notNull(), // 'month' or 'year'
  tier: text("tier").notNull(), // 'free', 'pro'
  studentLimit: integer("student_limit").notNull(),
  moduleLimit: integer("module_limit").notNull(),
  customModuleLimit: integer("custom_module_limit").notNull(),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});
```

### Customer Subscriptions Table

```typescript
// src/db/schema/customer-subscriptions.ts
export const customerSubscriptions = pgTable("customer_subscriptions", {
  id: text("id").primaryKey(), // Subscription ID from Stripe
  userId: text("user_id")
    .notNull()
    .references(() => profiles.id),
  planId: text("plan_id")
    .notNull()
    .references(() => subscriptionPlans.id),
  stripeCustomerId: text("stripe_customer_id").notNull(),
  status: text("status").notNull(), // active, canceled, past_due, etc.
  currentPeriodStart: timestamp("current_period_start"),
  currentPeriodEnd: timestamp("current_period_end"),
  cancelAtPeriodEnd: boolean("cancel_at_period_end").default(false),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});
```

### Payment History Table

```typescript
// src/db/schema/payment-history.ts
export const paymentHistory = pgTable("payment_history", {
  id: text("id").primaryKey(), // Payment intent ID from Stripe
  userId: text("user_id")
    .notNull()
    .references(() => profiles.id),
  subscriptionId: text("subscription_id").references(
    () => customerSubscriptions.id
  ),
  amount: numeric("amount").notNull(),
  currency: text("currency").notNull(),
  status: text("status").notNull(), // succeeded, pending, failed
  paymentMethod: text("payment_method"), // card, bank_transfer
  receiptUrl: text("receipt_url"),
  createdAt: timestamp("created_at").defaultNow(),
});
```

## 2. Stripe Integration

### Setup Requirements

1. Stripe account configuration
2. API keys (publishable and secret)
3. Webhook secret key
4. Product and Price setup in Stripe Dashboard

### Integration Steps

1. Install Stripe SDK

   ```bash
   npm install stripe
   ```

2. Create Stripe service

   ```typescript
   // src/modules/subscription/services/stripe.service.ts
   import Stripe from "stripe";
   import { env } from "@/config/env";

   const stripe = new Stripe(env.STRIPE_SECRET_KEY, {
     apiVersion: "2023-10-16",
   });

   export { stripe };
   ```

## 3. API Endpoints

### Subscription Controller & Routes

```typescript
// src/modules/subscription/controllers/subscription.controller.ts
export class SubscriptionController {
  private subscriptionService: SubscriptionService;

  constructor() {
    this.subscriptionService = new SubscriptionService();
  }

  // Get available plans
  async getPlans(req: Request, res: Response) {}

  // Get current user subscription
  async getCurrentSubscription(req: Request, res: Response) {}

  // Create checkout session
  async createCheckoutSession(req: Request, res: Response) {}

  // Cancel subscription
  async cancelSubscription(req: Request, res: Response) {}

  // Reactivate canceled subscription
  async reactivateSubscription(req: Request, res: Response) {}

  // Get payment history
  async getPaymentHistory(req: Request, res: Response) {}

  // Handle Stripe webhook
  async handleWebhook(req: Request, res: Response) {}
}
```

```typescript
// src/modules/subscription/routes/subscription.routes.ts
const router = Router();
const subscriptionController = new SubscriptionController();

// Public routes
router.get("/plans", subscriptionController.getPlans);

// Authenticated routes
router.get(
  "/current",
  authenticateUser,
  subscriptionController.getCurrentSubscription
);
router.post(
  "/checkout",
  authenticateUser,
  subscriptionController.createCheckoutSession
);
router.post(
  "/cancel",
  authenticateUser,
  subscriptionController.cancelSubscription
);
router.post(
  "/reactivate",
  authenticateUser,
  subscriptionController.reactivateSubscription
);
router.get(
  "/payment-history",
  authenticateUser,
  subscriptionController.getPaymentHistory
);

// Webhook route
router.post(
  "/webhook",
  express.raw({ type: "application/json" }),
  subscriptionController.handleWebhook
);

export default router;
```

## 4. Subscription Service

```typescript
// src/modules/subscription/services/subscription.service.ts
export class SubscriptionService {
  // Get available plans
  async getPlans() {}

  // Get user's current subscription
  async getCurrentSubscription(userId: string) {}

  // Create checkout session
  async createCheckoutSession(userId: string, planId: string) {}

  // Cancel subscription
  async cancelSubscription(userId: string) {}

  // Reactivate subscription
  async reactivateSubscription(userId: string) {}

  // Process Stripe webhook events
  async processWebhook(event: Stripe.Event) {}

  // Get payment history
  async getPaymentHistory(userId: string) {}
}
```

## 5. Webhook Handler

We'll need to handle these Stripe events:

- `checkout.session.completed` - When a customer completes checkout
- `customer.subscription.created` - When subscription is created
- `customer.subscription.updated` - When subscription details change
- `customer.subscription.deleted` - When subscription is canceled
- `invoice.paid` - When invoice is paid
- `invoice.payment_failed` - When payment fails

```typescript
// src/modules/subscription/services/webhook.service.ts
export class WebhookService {
  async handleCheckoutSessionCompleted(event: Stripe.Event) {}

  async handleSubscriptionCreated(event: Stripe.Event) {}

  async handleSubscriptionUpdated(event: Stripe.Event) {}

  async handleSubscriptionDeleted(event: Stripe.Event) {}

  async handleInvoicePaid(event: Stripe.Event) {}

  async handleInvoicePaymentFailed(event: Stripe.Event) {}
}
```

## 6. Feature Access Control

We'll need utilities to check if a user has access to certain premium features:

```typescript
// src/modules/subscription/utils/feature-access.ts
export function canCreateCustomModule(userId: string): Promise<boolean> {}

export function canAddMoreStudents(userId: string): Promise<boolean> {}

export function hasAccessToAllModules(userId: string): Promise<boolean> {}
```

## 7. User Interface Requirements

### Admin Dashboard

- Subscription overview
- User subscription status list
- Manual subscription management (for support)

### User Portal

- Current plan display
- Upgrade/downgrade options
- Billing history
- Payment method management

## 8. Implementation Phases

### Phase 1: Core Subscription Infrastructure

1. Set up Stripe account and products/prices
2. Create database schema
3. Implement basic API endpoints (get plans, current subscription)
4. Create checkout flow

### Phase 2: Subscription Management

1. Implement cancel/reactivate functionality
2. Set up webhook handling
3. Create payment history endpoints

### Phase 3: Frontend Integration

1. Build subscription selection UI
2. Create account/billing pages
3. Implement feature gating based on subscription

### Phase 4: Testing & Optimization

1. Test end-to-end subscription flow
2. Handle edge cases (failed payments, etc.)
3. Create admin tools for subscription management

## 9. Dependencies

- Stripe API
- Authentication/authorization system (already implemented)
- User profile system (already implemented)

## 10. Security Considerations

- Secure storage of Stripe API keys
- Webhook signature verification
- Authorization checks on all endpoints
- HTTPS for all API calls

## 11. Testing Plan

- Unit tests for subscription service
- Integration tests for Stripe API calls
- Mock webhook events for testing handlers
- E2E tests for subscription flows

## 12. Conclusion

The subscription module will be a crucial part of NoteEarly's business model, enabling monetization through a freemium approach. By carefully implementing the components described in this plan, we'll create a robust, secure, and user-friendly subscription system that allows for flexible subscription management and reliable billing.
