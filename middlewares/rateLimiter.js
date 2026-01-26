import rateLimit from "express-rate-limit";
import RedisStore from "rate-limit-redis";
import { getRedisClient } from "../config/redis.js";

const createLimiter = (windowMs, max, message) => {
    return rateLimit({
        windowMs,
        max,
        message: { success: false, message },
        standardHeaders: true,
        legacyHeaders: false,
        store: new RedisStore({
            client: getRedisClient(),
            prefix: 'rl:'
        }),
        skip: (req) => process.env.NODE_ENV === 'development'
    });
};

export const generalLimiter = createLimiter(
    15 * 60 * 1000,
    100,
    'Too many requests. Try again in 15 minutes'
);

export const questionGenerationLimiter = createLimiter(
    60 * 60 * 1000,
    20,
    'AI generation limit reached. Try again in 1 hour'
);

export const authLimiter = createLimiter(
    15 * 60 * 1000,
    10,
    'Too many login attempts. Try again in 15 minutes'
);

export const togglePinLimiter = createLimiter(
    1 * 60 * 1000,
    30,
    'Too many pin/unpin requests. Slow down'
);

export const exportLimiter = createLimiter(
    10 * 60 * 1000,
    5,
    'Too many export requests. Try again in 10 minutes'
);