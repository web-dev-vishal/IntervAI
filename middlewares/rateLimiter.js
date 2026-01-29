import rateLimit from "express-rate-limit";
import RedisStore from "rate-limit-redis";
import { getRedisClient } from "../config/redis.js";

const createLimiter = (windowMs, max, message, skipSuccessfulRequests = false) => {
    return rateLimit({
        windowMs,
        max,
        message: { success: false, message },
        standardHeaders: 'draft-7', // Use draft-7 instead of true
        legacyHeaders: false,
        skipSuccessfulRequests, // Prevent double counting for successful requests
        skipFailedRequests: false,
        store: new RedisStore({
            sendCommand: (...args) => getRedisClient().call(...args),
            prefix: 'rl:'
        }),
        skip: (req) => process.env.NODE_ENV === 'development',
        // Add handler to prevent double counting
        handler: (req, res) => {
            res.status(429).json({
                success: false,
                message: message
            });
        }
    });
};

export const generalLimiter = createLimiter(
    15 * 60 * 1000, // 15 minutes
    100,
    'Too many requests. Try again in 15 minutes',
    false // Don't skip successful requests for general limiter
);

export const questionGenerationLimiter = createLimiter(
    60 * 60 * 1000, // 1 hour
    20,
    'AI generation limit reached. Try again in 1 hour',
    true // Skip successful requests to avoid double counting with general limiter
);

export const authLimiter = createLimiter(
    15 * 60 * 1000, // 15 minutes
    10,
    'Too many login attempts. Try again in 15 minutes',
    true // Skip successful requests to avoid double counting with general limiter
);

export const togglePinLimiter = createLimiter(
    1 * 60 * 1000, // 1 minute
    30,
    'Too many pin/unpin requests. Slow down',
    true // Skip successful requests to avoid double counting with general limiter
);

export const exportLimiter = createLimiter(
    10 * 60 * 1000, // 10 minutes
    5,
    'Too many export requests. Try again in 10 minutes',
    true // Skip successful requests to avoid double counting with general limiter
);