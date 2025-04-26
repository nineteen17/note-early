/**
 * Basic logger utility wrapping console methods.
 * This can be replaced with a more sophisticated logger later (e.g., Winston, Pino)
 * without changing imports throughout the application.
 */
const getTimestamp = () => new Date().toISOString();
export const logger = {
    log: (...args) => {
        console.log(`[${getTimestamp()}] [LOG]   `, ...args);
    },
    info: (...args) => {
        console.info(`[${getTimestamp()}] [INFO]  `, ...args);
    },
    warn: (...args) => {
        console.warn(`[${getTimestamp()}] [WARN]  `, ...args);
    },
    error: (...args) => {
        console.error(`[${getTimestamp()}] [ERROR] `, ...args);
    },
    debug: (...args) => {
        // Only log debug messages if NODE_ENV is development (or similar)
        if (process.env.NODE_ENV === 'development') {
            console.debug(`[${getTimestamp()}] [DEBUG] `, ...args);
        }
    },
};
