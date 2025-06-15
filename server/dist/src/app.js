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
// --- Enhanced Rate Limiting with Error Handling ---
const limiter = rateLimit({
    windowMs: env.RATE_LIMIT_WINDOW_MS,
    max: env.RATE_LIMIT_MAX_REQUESTS,
    message: {
        status: 'error',
        message: `Too many requests from this IP. Rate limit: ${env.RATE_LIMIT_MAX_REQUESTS} requests per ${Math.floor(env.RATE_LIMIT_WINDOW_MS / 1000 / 60)} minutes. Please try again later.`,
        rateLimitInfo: {
            windowMs: env.RATE_LIMIT_WINDOW_MS,
            maxRequests: env.RATE_LIMIT_MAX_REQUESTS,
            resetTime: new Date(Date.now() + env.RATE_LIMIT_WINDOW_MS).toISOString()
        }
    },
    standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
    legacyHeaders: false, // Disable the `X-RateLimit-*` headers
    // Custom handler for rate limit exceeded
    handler: (req, res) => {
        console.error(`[RATE LIMIT EXCEEDED] IP: ${req.ip}, Path: ${req.path}, Method: ${req.method}, Headers:`, {
            origin: req.get('Origin'),
            userAgent: req.get('User-Agent'),
            referer: req.get('Referer')
        });
        res.status(429).json({
            status: 'error',
            error: 'RATE_LIMIT_EXCEEDED',
            message: `Rate limit exceeded. Maximum ${env.RATE_LIMIT_MAX_REQUESTS} requests allowed per ${Math.floor(env.RATE_LIMIT_WINDOW_MS / 1000 / 60)} minutes.`,
            details: {
                limit: env.RATE_LIMIT_MAX_REQUESTS,
                windowMs: env.RATE_LIMIT_WINDOW_MS,
                resetTime: new Date(Date.now() + env.RATE_LIMIT_WINDOW_MS).toISOString(),
                clientIP: req.ip,
                requestedPath: req.path,
                method: req.method
            }
        });
    }
});
app.use(limiter);
// --- Enhanced CORS with Detailed Error Handling ---
const corsOptions = {
    origin: function (origin, callback) {
        const allowedOrigins = [
            env.FRONTEND_URL || 'http://localhost:3000',
            'http://localhost:3000',
            'http://127.0.0.1:3000',
            // Add any additional origins you might need for development
            ...(env.NODE_ENV === 'development' ? ['http://192.168.1.7:3000', 'http://10.0.0.1:3000'] : [])
        ];
        // Only log CORS checks in development or when there are issues
        if (env.NODE_ENV === 'development') {
            console.log(`[CORS CHECK] Origin: ${origin}, Allowed origins:`, allowedOrigins);
        }
        // Allow requests with no origin (like mobile apps or curl requests)
        if (!origin) {
            if (env.NODE_ENV === 'development') {
                console.log('[CORS] Request with no origin - allowing');
            }
            return callback(null, true);
        }
        if (allowedOrigins.includes(origin)) {
            if (env.NODE_ENV === 'development') {
                console.log(`[CORS] Origin ${origin} is allowed`);
            }
            callback(null, true);
        }
        else {
            console.error(`[CORS BLOCKED] Origin ${origin} is not allowed. Allowed origins:`, allowedOrigins);
            const error = new Error(`CORS policy violation: Origin ${origin} is not allowed. Allowed origins: ${allowedOrigins.join(', ')}`);
            error.statusCode = 403;
            error.type = 'CORS_ERROR';
            callback(error, false);
        }
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept'],
    exposedHeaders: ['Set-Cookie'],
    maxAge: 86400, // 24 hours
    // Enhanced preflight handling
    preflightContinue: false,
    optionsSuccessStatus: 200
};
app.use(cors(corsOptions));
// --- CORS Error Handler Middleware ---
const corsErrorHandler = (err, req, res, next) => {
    if (err && err.type === 'CORS_ERROR') {
        console.error('[CORS ERROR HANDLER]', {
            origin: req.get('Origin'),
            method: req.method,
            path: req.path,
            headers: req.headers,
            error: err.message
        });
        res.status(403).json({
            status: 'error',
            error: 'CORS_POLICY_VIOLATION',
            message: err.message,
            details: {
                origin: req.get('Origin'),
                allowedOrigins: [
                    env.FRONTEND_URL || 'http://localhost:3000',
                    'http://localhost:3000',
                    'http://127.0.0.1:3000'
                ],
                method: req.method,
                path: req.path,
                timestamp: new Date().toISOString()
            }
        });
        return;
    }
    next(err);
};
app.use(corsErrorHandler);
// --- Request Logger for Debugging (Development Only) ---
if (env.NODE_ENV === 'development') {
    app.use((req, res, next) => {
        console.log(`[REQUEST] ${req.method} ${req.path}`, {
            origin: req.get('Origin'),
            userAgent: req.get('User-Agent'),
            authorization: req.get('Authorization') ? 'Present' : 'Missing',
            contentType: req.get('Content-Type'),
            timestamp: new Date().toISOString()
        });
        next();
    });
}
// Swagger documentation setup
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));
app.get('/swagger.json', (req, res) => {
    res.json(swaggerSpec);
});
// Health check endpoints
app.get('/health', (req, res) => {
    res.status(200).json({ status: 'ok' });
});
app.get('/api/v1/health', (req, res) => {
    res.status(200).json({
        status: 'ok',
        timestamp: new Date().toISOString(),
        environment: env.NODE_ENV,
        corsOrigins: [
            env.FRONTEND_URL || 'http://localhost:3000',
            'http://localhost:3000',
            'http://127.0.0.1:3000'
        ]
    });
});
// API routes (These will use the express.json() middleware defined above)
app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/reading-modules', readingRoutes);
app.use('/api/v1/profiles', profileRoutes);
app.use('/api/v1/progress', progressRoutes);
// Apply the rest of the subscription routes (which should no longer contain the webhook)
app.use('/api/v1/subscriptions', subscriptionRoutes);
app.use('/api/v1/analytics', analyticsRoutes);
// Enhanced Error handling middleware
app.use((err, req, res, next) => {
    console.error("[Global Error Handler]:", {
        error: err.message,
        stack: err.stack,
        type: err.type,
        statusCode: err.statusCode,
        path: req.path,
        method: req.method,
        origin: req.get('Origin'),
        timestamp: new Date().toISOString()
    });
    const statusCode = err.statusCode || 500;
    const message = err.message || 'Internal Server Error';
    const status = err.status || 'error';
    const errorType = err.type || 'UNKNOWN_ERROR';
    res.status(statusCode).json({
        status,
        error: errorType,
        message,
        details: {
            path: req.path,
            method: req.method,
            timestamp: new Date().toISOString(),
            ...(env.NODE_ENV === 'development' && {
                stack: err.stack,
                headers: req.headers
            })
        }
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
