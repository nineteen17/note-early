/**
 * Basic logger utility wrapping console methods.
 * This can be replaced with a more sophisticated logger later (e.g., Winston, Pino)
 * without changing imports throughout the application.
 */

const getTimestamp = (): string => new Date().toISOString();

export const logger = {
    log: (...args: any[]): void => {
        console.log(`[${getTimestamp()}] [LOG]   `, ...args);
    },
    info: (...args: any[]): void => {
        console.info(`[${getTimestamp()}] [INFO]  `, ...args);
    },
    warn: (...args: any[]): void => {
        console.warn(`[${getTimestamp()}] [WARN]  `, ...args);
    },
    error: (...args: any[]): void => {
        console.error(`[${getTimestamp()}] [ERROR] `, ...args);
    },
    debug: (...args: any[]): void => {
        // Only log debug messages if NODE_ENV is development (or similar)
        if (process.env.NODE_ENV === 'development') {
            console.debug(`[${getTimestamp()}] [DEBUG] `, ...args);
        }
    },
}; 