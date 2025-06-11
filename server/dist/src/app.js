import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import rateLimit from 'express-rate-limit';
import swaggerUi from 'swagger-ui-express';
import cookieParser from 'cookie-parser';
import swaggerSpec from './config/swagger.zod';
import { env } from './config/env';
// Import routes
import authRoutes from './modules/auth/routes/auth.routes';
import readingRoutes from './modules/reading-modules/routes/reading.routes';
import profileRoutes from './modules/profiles/routes/profile.routes';
import progressRoutes from './modules/progress/routes/progress.routes';
import subscriptionRoutes from './modules/subscription/routes/subscription.routes';
import analyticsRoutes from './modules/analytics/routes/analytics.routes';
// Import controller needed for direct route definition
import { SubscriptionController } from './modules/subscription/controllers/subscription.controller';
// Initialize express app
const app = express();
// --- Utility to handle async route handlers (needed for direct controller use) ---
const asyncHandler = (fn) => {
    return (req, res, next) => {
        Promise.resolve(fn(req, res, next)).catch(next);
    };
};
// Instantiate controller needed for direct route definition
const subscriptionController = new SubscriptionController();
// --- IMPORTANT: Define RAW body routes BEFORE global JSON parsing ---
// Stripe webhook - requires raw body
app.post('/api/v1/subscriptions/stripe-webhook', express.raw({ type: 'application/json' }), // Apply raw body parser ONLY to this route
asyncHandler(subscriptionController.handleWebhook.bind(subscriptionController)));
// Basic middleware (applied AFTER raw routes, BEFORE other API routes)
app.use(express.json()); // Parses JSON for routes defined AFTER this middleware
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
app.use(helmet());
app.use(morgan('dev'));
// Rate limiting
const limiter = rateLimit({
    windowMs: env.RATE_LIMIT_WINDOW_MS,
    max: env.RATE_LIMIT_MAX_REQUESTS,
});
app.use(limiter);
const corsOptions = {
    origin: env.FRONTEND_URL || 'http://localhost:3000',
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept'],
    exposedHeaders: ['Set-Cookie'],
    maxAge: 86400 // 24 hours
};
app.use(cors(corsOptions));
// Swagger documentation setup
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));
app.get('/swagger.json', (req, res) => {
    res.json(swaggerSpec);
});
// Health check endpoint
app.get('/health', (req, res) => {
    res.status(200).json({ status: 'ok' });
});
// API routes (These will use the express.json() middleware defined above)
app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/reading-modules', readingRoutes);
app.use('/api/v1/profiles', profileRoutes);
app.use('/api/v1/progress', progressRoutes);
// Apply the rest of the subscription routes (which should no longer contain the webhook)
app.use('/api/v1/subscriptions', subscriptionRoutes);
app.use('/api/v1/analytics', analyticsRoutes);
// Error handling middleware
app.use((err, req, res, next) => {
    console.error("[Global Error Handler]:", err);
    // Simple error response for now, can be enhanced
    const statusCode = err.statusCode || 500;
    const message = err.message || 'Internal Server Error';
    const status = err.status || 'error';
    res.status(statusCode).json({
        status,
        message,
        // Optionally add stack in development
        ...(env.NODE_ENV === 'development' && { stack: err.stack })
    });
});
// 404 handler
app.use((req, res) => {
    res.status(404).json({
        status: 'error',
        message: 'The requested route does not exist on this server.',
    });
});
export default app;
