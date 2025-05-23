import { SubscriptionService } from '../src/modules/subscription/services/subscription.service';
// Note: This script now imports directly from the source TypeScript files using a relative path.
// You can run it using a tool like tsx (e.g., `npx tsx server/scripts/sync-stripe-plans.ts`)

async function runSync() {
  console.log('Attempting to sync subscription plans from Stripe to the database...');
  const subscriptionService = new SubscriptionService();

  try {
    await subscriptionService.syncPlansFromStripe();
    console.log('✅ Successfully synced subscription plans from Stripe.');
    process.exit(0); // Exit with success code
  } catch (error) {
    console.error('❌ Error syncing plans from Stripe:');
    // Log the specific error message and stack trace if available
    if (error instanceof Error) {
        console.error(error.message);
        if (error.stack) {
            console.error(error.stack);
        }
    } else {
        console.error(error); // Log unknown error types
    }
    process.exit(1); // Exit with error code
  }
}

runSync(); 