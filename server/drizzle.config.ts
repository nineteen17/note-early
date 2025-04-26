import { defineConfig } from 'drizzle-kit';
import dotenv from 'dotenv';

// Load environment variables from .env file
dotenv.config();

import { env } from './src/config/env';

export default defineConfig({
  schema: './src/db/schema/*',
  out: './drizzle',
  dialect: 'postgresql',
  dbCredentials: {
    url: env.DATABASE_URL,
  },
  verbose: true,
  strict: true,
}); 