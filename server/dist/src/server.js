import './config/zod'; // Import this FIRST to run the Zod extension
import app from './app';
import { env } from './config/env';
const startServer = () => {
    try {
        app.listen(env.PORT, () => {
            console.log(`🚀 Server running on port ${env.PORT} in ${env.NODE_ENV} mode`);
            console.log(`📚 API Documentation available at http://localhost:${env.PORT}/api-docs`);
        });
    }
    catch (error) {
        console.error('Error starting server:', error);
        process.exit(1);
    }
};
// Handle uncaught exceptions
process.on('uncaughtException', (err) => {
    console.error('Uncaught Exception:', err);
    process.exit(1);
});
// Handle unhandled promise rejections
process.on('unhandledRejection', (err) => {
    console.error('Unhandled Rejection:', err);
    process.exit(1);
});
startServer();
