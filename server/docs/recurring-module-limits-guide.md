# Guide: Implementing Recurring Monthly Custom Module Limits

This guide outlines the steps required to change the custom reading module creation limit from a fixed total per plan tier to a recurring monthly allowance that resets each billing cycle.

**Goal:** Allow admins on paid tiers to create a specific number of custom modules each month (e.g., 50 per month), with the count resetting at the start of their next billing period.

**Current System:** Checks the *total* number of custom modules ever created against a fixed limit in the subscription plan.
**New System:** Checks the number of custom modules created *within the current billing period* against the limit and resets this count monthly.

---

## Step 1: Modify Database Schema

We need to add a way to track the number of modules created within the current billing period for each subscription.

1.  **Add Column:** Add a new integer column named `custom_modules_created_this_period` to the `customer_subscriptions` table.
    *   **Table:** `customer_subscriptions`
    *   **Column Name:** `custom_modules_created_this_period`
    *   **Data Type:** `INTEGER`
    *   **Default Value:** `0`
    *   **Constraint:** `NOT NULL`

2.  **Generate Migration (Drizzle):**
    *   Open your `server/src/db/schema/customer-subscriptions.ts` file.
    *   Add the new column definition to the `pgTable` schema:
        ```typescript
        import { integer, //... other imports } from 'drizzle-orm/pg-core';
        // ... other code ...

        export const customerSubscriptions = pgTable('customer_subscriptions', {
          // ... existing columns ...
          stripeCustomerId: text('stripe_customer_id').notNull(), // Assuming this exists
          // --- ADD THIS LINE ---
          customModulesCreatedThisPeriod: integer('custom_modules_created_this_period').notNull().default(0),
        });
        ```
    *   Run the Drizzle Kit command to generate the migration SQL file:
        ```bash
        npm run db:generate
        # or yarn db:generate
        ```
    *   Review the generated SQL file in the `drizzle` (or similarly named) migrations folder to ensure it correctly adds the column with the default value.

3.  **Apply Migration:**
    *   Run the migration script to apply the change to your database:
        ```bash
        npm run db:migrate
        # or yarn db:migrate
        # or tsx src/db/migrate.ts (depending on your setup)
        ```

---

## Step 2: Update Backend Service Logic (`ReadingModuleService`)

Modify the `createModule` function in `server/src/modules/reading-modules/services/reading.service.ts` to use the new counter and increment it.

**🚨 Prerequisite:** Before proceeding, ensure your `SubscriptionService.getCurrentSubscription` method (located in `server/src/modules/subscription/services/subscription.service.ts`) is modified or verified to fetch and return the full `customerSubscriptions` record (or at least include the new `customModulesCreatedThisPeriod` field) when it returns the `subscription` object. The logic below relies on accessing `subscription.customModulesCreatedThisPeriod`.

1.  **Locate:** Find the `createModule` method within the `ReadingModuleService` class.
2.  **Modify Limit Check:** Find the section starting with `if (input.type === ModuleType.CUSTOM) { ... }`.
3.  **Replace Logic:** Replace the existing limit check logic with the following:

    ```typescript
    if (input.type === ModuleType.CUSTOM) {
      // --- BEGIN Updated Subscription Limit Check (Monthly Allowance) ---
      if (!input.adminId) {
        throw new AppError('Admin ID is required for custom modules.', 400);
      }

      // 1. Get admin's current subscription AND plan details
      // NOTE: Ensure SubscriptionService.getCurrentSubscription fetches the
      // customerSubscriptions record including `customModulesCreatedThisPeriod`.
      // You might need to adjust its return type or query.
      const { plan, subscription } = await this.subscriptionService.getCurrentSubscription(input.adminId);

      if (!plan) {
        // Should not happen if free plan exists, but good check
        throw new AppError('Could not determine subscription plan for admin.', 500);
      }

      // Handle free plan (no custom modules allowed)
      if (plan.tier === 'free') {
        throw new AppError(
          'Custom module creation is not allowed on the Free plan. Please upgrade.',
          403 // Forbidden
        );
      }

      // Check if the user actually has a subscription record (should exist for paid plans)
      if (!subscription) {
         logger.error('Paid plan tier found but no subscription record exists for admin', { adminId: input.adminId, planTier: plan.tier });
         throw new AppError('Subscription data inconsistent. Cannot verify module limit.', 500);
      }

      // 2. Check against plan limit using the period counter
      if (subscription.customModulesCreatedThisPeriod >= plan.customModuleLimit) {
        throw new AppError(
          `Monthly custom module limit (${plan.customModuleLimit}) for your current plan ('${plan.tier}') has been reached. Limit resets on your next billing date.`,
          403 // Forbidden
        );
      }
      // --- END Updated Limit Check ---

      // If limit check passes, proceed to create the module...
      // [Original module insertion try/catch block follows]
      // ...

      // --- ADD INCREMENT STEP ---
      // AFTER successful module creation (inside the try block, after returning()),
      // increment the counter for this period.
      try {
          const [newDbModule] = await this.db
              .insert(schema.readingModules)
              // ... .values({...}) ...
              .returning();

          if (!newDbModule) {
              throw new AppError('Failed to create module.', 500);
          }

          // <<< INCREMENT THE COUNTER >>>
          await this.db.update(schema.customerSubscriptions)
              .set({
                  customModulesCreatedThisPeriod: sql`${schema.customerSubscriptions.customModulesCreatedThisPeriod} + 1`
              })
              .where(eq(schema.customerSubscriptions.id, subscription.id)); // Use the subscription ID

          logger.info('Custom module created and monthly count incremented', { moduleId: newDbModule.id, adminId: input.adminId, newCount: subscription.customModulesCreatedThisPeriod + 1 });

          return newDbModule;

      } catch (error) {
         // [Original error handling]
      }
      // --- END INCREMENT STEP ---

    } // End of CUSTOM module check

    // [Rest of the createModule function for CURATED type etc.]
    ```

    *   **Key Changes:**
        *   Fetches the `subscription` record (containing `customModulesCreatedThisPeriod`) along with the `plan`.
        *   Compares `subscription.customModulesCreatedThisPeriod` to `plan.customModuleLimit`.
        *   Uses `sql`${schema.customerSubscriptions.customModulesCreatedThisPeriod} + 1`` to safely increment the counter in the database *after* the module is successfully created.
        *   Updates the error message to mention the *monthly* limit.
    *   **Important:** Reiterating the prerequisite - ensure `SubscriptionService.getCurrentSubscription` provides the `subscription` object with the `customModulesCreatedThisPeriod` field.

---

## Step 3: Implement Monthly Reset Mechanism

This is crucial. The `custom_modules_created_this_period` count must be reset to `0` when the user's subscription renews. Choose **one** of the following methods:

### Option A: Stripe Webhooks (Recommended)

1.  **Endpoint:** Ensure you have a webhook endpoint configured in your server (e.g., `/api/v1/subscriptions/stripe-webhook` seen in `subscription.routes.ts`).
2.  **Event Listener:** Configure Stripe to send `invoice.paid` events to your endpoint. This event typically signifies a successful subscription payment/renewal.
3.  **Webhook Handler Logic (`SubscriptionController.handleWebhook` / `SubscriptionService`):**
    *   Verify the incoming webhook signature using `stripe.webhooks.constructEvent`.
    *   Check if `event.type === 'invoice.paid'`.
    *   If it is, extract the `subscription` ID and `customer` ID from the event data (`event.data.object`).
    *   **Important:** Determine if this specific `invoice.paid` event represents a subscription renewal (it might also be for one-time payments). You might need to check the invoice's `billing_reason` (e.g., `subscription_cycle` or `subscription_update`).
    *   If it *is* a renewal for an active subscription:
        *   Use the `subscription` ID or `customer` ID to find the corresponding record in your `customerSubscriptions` table.
        *   Update that record, setting `custom_modules_created_this_period = 0`.
        ```typescript
        // Inside your webhook handler service logic:
        if (event.type === 'invoice.paid') {
          const invoice = event.data.object as Stripe.Invoice;
          // Add logic to confirm this is a subscription renewal invoice
          if (invoice.subscription && invoice.billing_reason?.includes('subscription')) {
             await db.update(schema.customerSubscriptions)
               .set({ customModulesCreatedThisPeriod: 0 })
               .where(eq(schema.customerSubscriptions.id, invoice.subscription as string)); // Use Stripe subscription ID
             logger.info('Reset monthly module count due to invoice.paid webhook', { subscriptionId: invoice.subscription });
          }
        }
        ```
4.  **Stripe CLI:** Use the Stripe CLI (`stripe listen --forward-to localhost:YOUR_PORT/your/webhook/endpoint`) for local testing of webhook events.

### Option B: Scheduled Task (Cron Job)

1.  **Install Scheduler:** Add a job scheduler library like `node-cron`:
    ```bash
    npm install node-cron
    npm install --save-dev @types/node-cron
    # or yarn add node-cron @types/node-cron
    ```
2.  **Create Job:** Set up a cron job (e.g., in your main `server.ts` or a dedicated `scheduler.ts` file) to run periodically (e.g., daily at midnight).
3.  **Job Logic:**
    *   The job needs to query `customerSubscriptions` for users whose billing cycle just renewed *today*. This requires accurately tracking the `current_period_end` or renewal date. Stripe often provides this timestamp. You might need to store and update this renewal date in your `customerSubscriptions` table via webhooks anyway.
    *   Query example (assuming you have `current_period_end` stored as a timestamp):
        ```typescript
        import cron from 'node-cron';
        import { db } from './db'; // Adjust path
        import * as schema from './db/schema'; // Adjust path
        import { eq, lte } from 'drizzle-orm';

        // Schedule to run daily (e.g., at 1 AM server time)
        cron.schedule('0 1 * * *', async () => {
          console.log('Running daily check to reset monthly module counts...');
          const now = new Date();
          try {
            // Find subscriptions whose period end date was yesterday or earlier
            // Requires current_period_end to be stored and updated accurately!
            const subscriptionsToReset = await db.select({ id: schema.customerSubscriptions.id })
              .from(schema.customerSubscriptions)
              .where(lte(schema.customerSubscriptions.currentPeriodEnd, now)); // Assuming currentPeriodEnd column exists

            if (subscriptionsToReset.length > 0) {
               const idsToReset = subscriptionsToReset.map(s => s.id);
               await db.update(schema.customerSubscriptions)
                 .set({ customModulesCreatedThisPeriod: 0 })
                 .where(inArray(schema.customerSubscriptions.id, idsToReset)); // Use inArray if available
               console.log(`Reset module count for ${idsToReset.length} subscriptions.`);
            } else {
               console.log('No subscriptions found needing module count reset today.');
            }
            // You would also need logic here to update the current_period_end for the *next* cycle.
          } catch (error) {
            console.error('Error during scheduled module count reset:', error);
          }
        });
        ```
    *   **Complexity:** This method is generally more complex to get right due to date comparisons and the need to accurately know when the billing cycle renews. Webhooks are usually preferred if possible.

---

## Step 4: Testing

Thoroughly test the new system:

1.  **Limit Check:** Create custom modules as an admin on a paid plan. Verify you are correctly blocked when `custom_modules_created_this_period` reaches `plan.customModuleLimit`.
2.  **Increment:** Check the database to ensure `custom_modules_created_this_period` increments correctly after each successful creation.
3.  **Reset:** Simulate a subscription renewal:
    *   **Webhook:** Use Stripe CLI to trigger a test `invoice.paid` event for the user. Verify the `custom_modules_created_this_period` is reset to 0 in the database.
    *   **Cron Job:** Manually trigger the job or adjust system time/renewal dates in the DB to test the reset logic.
4.  **Free Plan:** Ensure users on the free plan are still blocked from creating custom modules.

---

## Step 5: Deployment

1.  Deploy the updated backend code.
2.  Ensure the database migrations have been applied in the production environment.
3.  Configure the production Stripe webhook endpoint if using Option A.
4.  Ensure the scheduled task is configured and running in production if using Option B.

---

This guide provides the core steps. You may need to adjust details based on your specific implementation of the `SubscriptionService`, how you handle billing cycle dates, and your error handling patterns. Remember that handling the **Reset Mechanism** correctly is critical for this feature to work as intended. 