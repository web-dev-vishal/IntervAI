import dotenv from "dotenv";
dotenv.config();

import express from "express";
import cookieParser from "cookie-parser";
import cors from "cors";
import helmet from "helmet";
import mongoose from "mongoose";
import { connectDB } from "./config/db.js";
import userRouter from "./routes/user.routes.js";
import sessionRouter from "./routes/session.routes.js";
import questionRoute from "./routes/question.routes.js";
import { generalLimiter } from "./middlewares/rateLimiter.js";

const app = express();
const PORT = process.env.PORT || 5000;
const NODE_ENV = process.env.NODE_ENV || 'development';

// SECURITY MIDDLEWARE

app.use(helmet({
    contentSecurityPolicy: NODE_ENV === 'production',
    crossOriginEmbedderPolicy: NODE_ENV === 'production'
}));

// CORS CONFIGURATION
const corsOptions = {
    origin: process.env.CLIENT_URL || 'http://localhost:3000',
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    maxAge: 86400
};
app.use(cors(corsOptions));

// BODY PARSING MIDDLEWARE

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(cookieParser());

// REQUEST LOGGING (Development)

if (NODE_ENV === 'development') {
    app.use((req, res, next) => {
        console.log(`[${new Date().toISOString()}] ${req.method} ${req.path}`);
        next();
    });
}

// GLOBAL RATE LIMITER

app.use(generalLimiter);

// HEALTH CHECK & ROOT ROUTES
app.get('/', (req, res) => {
    res.json({
        success: true,
        message: 'Interview Prep API',
        version: '1.0.0',
        endpoints: {
            health: '/health',
            users: '/api/v1/user',
            sessions: '/api/v1/session',
            questions: '/api/v1/question'
        }
    });
});

app.get('/health', (req, res) => {
    const healthcheck = {
        success: true,
        status: 'OK',
        uptime: process.uptime(),
        timestamp: new Date().toISOString(),
        environment: NODE_ENV,
        database: {
            connected: mongoose.connection.readyState === 1
        },
        config: {
            port: !!process.env.PORT,
            mongoUri: !!process.env.MONGO_URI,
            jwtSecret: !!process.env.JWT_SECRET,
            groqApiKey: !!process.env.GROQ_API
        }
    };
    
    res.status(200).json(healthcheck);
});

// ============================================
// API ROUTES
// ============================================
app.use("/api/v1/user", userRouter);
app.use("/api/v1/session", sessionRouter);
app.use("/api/v1/question", questionRoute);

// ============================================
// 404 HANDLER (Fixed - no wildcard)
// ============================================
app.use((req, res, next) => {
    res.status(404).json({
        success: false,
        message: 'Route not found',
        path: req.originalUrl,
        method: req.method
    });
});

// ============================================
// GLOBAL ERROR HANDLER
// ============================================
app.use((err, req, res, next) => {
    console.error('[Global Error Handler]', err);

    if (err.name === 'ValidationError') {
        return res.status(400).json({
            success: false,
            message: 'Validation error',
            errors: Object.values(err.errors).map(e => e.message)
        });
    }

    if (err.name === 'CastError') {
        return res.status(400).json({
            success: false,
            message: 'Invalid ID format'
        });
    }

    if (err.code === 11000) {
        const field = Object.keys(err.keyPattern)[0];
        return res.status(409).json({
            success: false,
            message: `${field} already exists`
        });
    }

    res.status(err.status || 500).json({
        success: false,
        message: NODE_ENV === 'production' ? 'Internal server error' : err.message,
        ...(NODE_ENV === 'development' && { stack: err.stack })
    });
});

// ============================================
// GRACEFUL SHUTDOWN
// ============================================
const gracefulShutdown = async (signal) => {
    console.log(`\n${signal} received. Starting graceful shutdown...`);
    
    try {
        await mongoose.connection.close();
        console.log('✅ MongoDB connection closed');
        
        process.exit(0);
    } catch (error) {
        console.error('❌ Error during shutdown:', error);
        process.exit(1);
    }
};

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

// UNHANDLED ERRORS
process.on('unhandledRejection', (reason, promise) => {
    console.error('❌ Unhandled Rejection at:', promise, 'reason:', reason);
    if (NODE_ENV === 'production') {
        gracefulShutdown('UNHANDLED_REJECTION');
    }
});

process.on('uncaughtException', (error) => {
    console.error('❌ Uncaught Exception:', error);
    if (NODE_ENV === 'production') {
        gracefulShutdown('UNCAUGHT_EXCEPTION');
    }
});

// Server Infromation
const startServer = async () => {
    try {
        // Validate environment variables
        const requiredEnvVars = ['MONGO_URI', 'JWT_SECRET', 'GROQ_API'];
        const missingEnvVars = requiredEnvVars.filter(varName => !process.env[varName]);
        
        if (missingEnvVars.length > 0) {
            throw new Error(`Missing required environment variables: ${missingEnvVars.join(', ')}`);
        }

        // Connect to database
        await connectDB();
        
        // Start listening
        app.listen(PORT, () => {
            console.log('\n🚀 ================================');
            console.log(`✅ Server running on port ${PORT}`);
            console.log(`✅ Environment: ${NODE_ENV}`);
            console.log(`✅ URL: http://localhost:${PORT}`);
            console.log('🚀 ================================\n');
        });
    } catch (error) {
        console.error('❌ Failed to start server:', error.message);
        process.exit(1);
    }
};

startServer();