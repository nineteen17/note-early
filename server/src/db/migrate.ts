import { drizzle } from 'drizzle-orm/postgres-js';
import { migrate } from 'drizzle-orm/postgres-js/migrator';
import postgres from 'postgres';
import { readFileSync } from 'fs';
import { join } from 'path';
import { env } from '../config/env.js';

const migrationClient = postgres(env.DATABASE_URL, { max: 1 });

async function main() {
  try {
    const db = drizzle(migrationClient);

    console.log('Starting migrations...');
    await migrate(db, { migrationsFolder: 'drizzle' });
    console.log('Migrations completed successfully');

    // Execute the admin profile creation function
    console.log('Creating admin profile function...');
    const sqlPath = join(process.cwd(), 'drizzle', '0004_auto_admin_profile_creation.sql');
    const sqlContent = readFileSync(sqlPath, 'utf8');
    
    await migrationClient.unsafe(sqlContent);
    console.log('Admin profile function created successfully');

    await migrationClient.end();
    console.log('Migration client connection closed.');
    process.exit(0);
  } catch (error) {
    console.error('Migration failed:', error);
    await migrationClient.end();
    process.exit(1);
  }
}

main();