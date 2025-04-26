import { drizzle } from 'drizzle-orm/node-postgres';
import pg from 'pg'; // Import the default export
const { Pool } = pg; // Destructure Pool from the default export
import { env } from '../config/env';
import * as schema from './schema'; // Import all exports from the schema index

// Create PostgreSQL connection pool
const pool = new Pool({
  connectionString: env.DATABASE_URL,
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});

// Create Drizzle ORM instance, passing the schema
export const db = drizzle(pool, { schema });

// No longer need to export individual schemas from here,
// they are accessible via the imported 'schema' object or db.query
// export * from './schema/profiles'; 

// Helper function to test database connection
export const testConnection = async () => {
  try {
    const client = await pool.connect();
    client.release();
    console.log('✅ Database connection successful');
    return true;
  } catch (error) {
    console.error('❌ Database connection failed:', error);
    return false;
  }
}; 