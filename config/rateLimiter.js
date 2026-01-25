import rateLimit from "express-rate-limit";

// General rate limiter for all API routes
export const generalLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 25, // 25 requests per 15 minutes
    message: {
        success: false,
        message: 'Too many requests from this IP, please try again after 15 minutes'
    },
    standardHeaders: true,
    legacyHeaders: false,
});

// Strict rate limiter for AI question generation
export const questionGenerationLimiter = rateLimit({
    windowMs: 60 * 60 * 1000, // 1 hour
    max: 10, // 10 requests per hour
    message: {
        success: false,
        message: 'Too many question generation requests. Please try again after 1 hour',
        hint: 'You can generate questions 10 times per hour'
    },
    standardHeaders: true,
    legacyHeaders: false,
});

// Auth rate limiter to prevent brute force
export const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 5, // 5 attempts per 15 minutes
    message: {
        success: false,
        message: 'Too many login attempts, please try again after 15 minutes'
    },
    standardHeaders: true,
    legacyHeaders: false,
});

// Rate limiter for toggle pin operations
export const togglePinLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 10, // 10 requests per 15 minutes
    message: {
        success: false,
        message: 'Too many pin/unpin requests. Please try again later'
    },
    standardHeaders: true,
    legacyHeaders: false,
});