// ============================================
// config/logger.js - Production Logger
// ============================================

/**
 * Simple production-ready logger
 * Can be extended with Winston or Pino for advanced logging
 */
class Logger {
    static info(message, meta = {}) {
        console.log(JSON.stringify({
            level: 'info',
            message,
            timestamp: new Date().toISOString(),
            ...meta
        }));
    }

    static error(message, error = null, meta = {}) {
        console.error(JSON.stringify({
            level: 'error',
            message,
            error: error ? {
                message: error.message,
                stack: error.stack,
                name: error.name
            } : null,
            timestamp: new Date().toISOString(),
            ...meta
        }));
    }

    static warn(message, meta = {}) {
        console.warn(JSON.stringify({
            level: 'warn',
            message,
            timestamp: new Date().toISOString(),
            ...meta
        }));
    }

    static debug(message, meta = {}) {
        if (process.env.NODE_ENV !== 'production') {
            console.debug(JSON.stringify({
                level: 'debug',
                message,
                timestamp: new Date().toISOString(),
                ...meta
            }));
        }
    }
}

export default Logger;
