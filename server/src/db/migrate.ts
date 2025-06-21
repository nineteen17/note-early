import { drizzle } from 'drizzle-orm/postgres-js';
import { migrate } from 'drizzle-orm/postgres-js/migrator';
import postgres from 'postgres';
import { env } from '../config/env.js';
import { UserRole, SubscriptionPlan, SubscriptionStatus } from '../db/schema/profiles';

// For migrations, we need a different connection instance that doesn't use pooling
const migrationClient = postgres(env.DATABASE_URL, { max: 1 });

async function main() {
  try {
    const db = drizzle(migrationClient);

    console.log('Starting migrations...');
    await migrate(db, { migrationsFolder: 'drizzle' });
    console.log('Migrations completed successfully');

    // We're going to skip the enum initialization as they are already handled by PostgreSQL
    // The enums in our case are defined at the database level as enum types
    // No need to insert values into them like regular tables
    
    // --- ADDED: Gracefully close the connection ---
    await migrationClient.end();
    console.log('Migration client connection closed.');

    process.exit(0);
  } catch (error) {
    console.error('Migration failed:', error);
    // --- ADDED: Close connection on error too ---
    await migrationClient.end(); 
    process.exit(1);
  }
}

// We don't need this function anymore as the enums are PostgreSQL enum types, not tables
// async function initializeEnums(db: any) {
//   // Initialize user roles
//   await db.insert(userRoleEnum).values([
//     { value: 'admin' },
//     { value: 'student' }
//   ]).onConflictDoNothing();
//
//   // Initialize subscription plans
//   await db.insert(subscriptionPlanEnum).values([
//     { value: 'free' },
//     { value: 'pro' }
//   ]).onConflictDoNothing();
//
//   // Initialize module types
//   await db.insert(moduleTypeEnum).values([
//     { value: 'curated' },
//     { value: 'custom' }
//   ]).onConflictDoNothing();
//
//   // Initialize reading levels (1-10)
//   await db.insert(readingLevelEnum).values(
//     Array.from({ length: 10 }, (_, i) => ({ value: i + 1 }))
//   ).onConflictDoNothing();
// }

main(); 