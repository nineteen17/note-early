import { z } from 'zod';
import dotenv from 'dotenv';
// Load environment variables
dotenv.config();
// Environment variables schema
const envSchema = z.object({
    // Server
    NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
    PORT: z.coerce.number().default(4000),
    // Supabase
    SUPABASE_URL: z.string().url('Supabase URL is required and must be a valid URL'),
    SUPABASE_ANON_KEY: z.string().min(1, 'Supabase Anon Key is required'),
    SUPABASE_SERVICE_ROLE_KEY: z.string().min(1, 'Supabase Service Role Key is required'),
    SUPABASE_JWT_SECRET: z.string().min(1, 'Supabase JWT Secret is required'),
    // Database
    DATABASE_URL: z.string().min(1, 'Database URL is required'),
    // JWT
    JWT_SECRET: z.string().min(1, 'JWT Secret is required'),
    JWT_EXPIRES_IN: z
        .string()
        .regex(/^\d+[smhd]$/, 'JWT_EXPIRES_IN must be in format like 1h, 30m, 7d')
        .default('1h'),
    // Rate Limiting
    RATE_LIMIT_WINDOW_MS: z.coerce.number().default(900000),
    RATE_LIMIT_MAX_REQUESTS: z.coerce.number().default(100),
    // Stripe
    STRIPE_SECRET_KEY: z.string().min(1, 'Stripe Secret Key is required'),
    STRIPE_WEBHOOK_SECRET: z.string().min(1, 'Stripe Webhook Secret is required'),
    // Storage
    STORAGE_BUCKET: z.string().min(1),
    // Client
    CLIENT_URL: z.string().url().default('http://localhost:3000'),
    // Frontend URLs
    FRONTEND_URL: z.string().url().default('http://localhost:3000'),
    FRONTEND_REDIRECT_URL: z.string().url('Frontend Redirect URL is required for OAuth'),
});
let parsedEnv;
try {
    parsedEnv = envSchema.safeParse(process.env);
    if (!parsedEnv.success) {
        console.error('❌ Invalid environment variables:', JSON.stringify(parsedEnv.error.format(), null, 4));
        process.exit(1);
    }
}
catch (error) {
    console.error('❌ Failed to parse environment variables:', error);
    process.exit(1);
}
export const env = parsedEnv.data;
