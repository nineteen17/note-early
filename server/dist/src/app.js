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
import bodyParser from 'body-parser';
// Initialize express app
const app = express();
// Basic middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
app.use(helmet());
app.use(morgan('dev'));
app.use(bodyParser.json());
// Rate limiting
const limiter = rateLimit({
    windowMs: env.RATE_LIMIT_WINDOW_MS,
    max: env.RATE_LIMIT_MAX_REQUESTS,
});
app.use(limiter);
const corsOptions = {
    origin: env.CLIENT_URL_IP,
    credentials: true,
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
// API routes
app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/reading-modules', readingRoutes);
app.use('/api/v1/profiles', profileRoutes);
app.use('/api/v1/progress', progressRoutes);
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
