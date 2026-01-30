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

app.use(helmet({
    contentSecurityPolicy: NODE_ENV === 'production',
    crossOriginEmbedderPolicy: NODE_ENV === 'production',
    hsts: { maxAge: 31536000, includeSubDomains: true, preload: true }
}));
app.disable('x-powered-by');
app.set('trust proxy', 1);

const allowedOrigins = process.env.CLIENT_URL 
    ? process.env.CLIENT_URL.split(',').map(url => url.trim())
    : ['http://localhost:3000', 'http://localhost:5173'];

app.use(cors({
    origin: (origin, callback) => {
        if (!origin) return callback(null, true);
        if (allowedOrigins.indexOf(origin) !== -1) {
            callback(null, true);
        } else {
            console.warn(`⚠️  Blocked CORS request from origin: ${origin}`);
            callback(new Error('Not allowed by CORS'));
        }
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
    exposedHeaders: ['Content-Range', 'X-Content-Range'],
    maxAge: 86400,
    optionsSuccessStatus: 200
}));

app.use(express.json({ 
    limit: '10mb',
    verify: (req, res, buf) => {
        try {
            JSON.parse(buf);
        } catch (e) {
            res.status(400).json({ success: false, message: 'Invalid JSON payload' });
            throw new Error('Invalid JSON');
        }
    }
}));
app.use(express.urlencoded({ extended: true, limit: '10mb', parameterLimit: 10000 }));
app.use(cookieParser());

if (NODE_ENV === 'development') {
    app.use((req, res, next) => {
        console.log(`[${new Date().toISOString()}] ${req.method} ${req.path}`);
        if (['POST', 'PUT', 'PATCH'].includes(req.method)) {
            const sanitizedBody = { ...req.body };
            if (sanitizedBody.password) sanitizedBody.password = '[REDACTED]';
            if (sanitizedBody.token) sanitizedBody.token = '[REDACTED]';
            console.log('Body:', JSON.stringify(sanitizedBody, null, 2));
        }
        next();
    });
}

app.get('/', (req, res) => {
    res.json({
        success: true,
        message: 'Interview Prep API',
        version: '1.0.0',
        status: 'Running',
        timestamp: new Date().toISOString(),
        endpoints: {
            health: '/health',
            users: '/api/v1/user',
            sessions: '/api/v1/session',
            questions: '/api/v1/question'
        }
    });
});

app.get('/health', (req, res) => {
    const dbState = mongoose.connection.readyState;
    const dbStateMap = { 0: 'disconnected', 1: 'connected', 2: 'connecting', 3: 'disconnecting' };
    res.status(dbState === 1 ? 200 : 503).json({
        success: true,
        status: dbState === 1 ? 'OK' : 'DEGRADED',
        uptime: Math.floor(process.uptime()),
        timestamp: new Date().toISOString(),
        environment: NODE_ENV,
        database: { status: dbStateMap[dbState] || 'unknown', connected: dbState === 1 }
    });
});

app.use('/api', generalLimiter);

app.use("/api/v1/user", userRouter);
app.use("/api/v1/session", sessionRouter);
app.use("/api/v1/question", questionRoute);

app.use((req, res) => {
    res.status(404).json({
        success: false,
        message: 'Route not found',
        path: req.originalUrl,
        method: req.method
    });
});

app.use((err, req, res, next) => {
    console.error('❌ Error:', err);

    if (err.name === 'ValidationError') {
        return res.status(400).json({
            success: false,
            message: 'Validation error',
            errors: Object.values(err.errors).map(e => ({ field: e.path, message: e.message }))
        });
    }
    if (err.name === 'CastError') {
        return res.status(400).json({ success: false, message: `Invalid ${err.path}: ${err.value}` });
    }
    if (err.code === 11000) {
        const field = Object.keys(err.keyPattern)[0];
        return res.status(409).json({ success: false, message: `${field} already exists` });
    }
    if (err.name === 'JsonWebTokenError') {
        return res.status(401).json({ success: false, message: 'Invalid token' });
    }
    if (err.name === 'TokenExpiredError') {
        return res.status(401).json({ success: false, message: 'Token expired' });
    }
    if (err.message === 'Not allowed by CORS') {
        return res.status(403).json({ success: false, message: 'CORS policy violation' });
    }

    res.status(err.status || 500).json({
        success: false,
        message: NODE_ENV === 'production' ? 'Internal server error' : err.message
    });
});

const gracefulShutdown = async (signal) => {
    console.log(`\n🛑 ${signal} received - shutting down gracefully...`);
    try {
        if (mongoose.connection.readyState === 1) {
            await mongoose.connection.close(false);
            console.log('✅ MongoDB closed');
        }
        process.exit(0);
    } catch (error) {
        console.error('❌ Shutdown error:', error);
        process.exit(1);
    }
};

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

process.on('unhandledRejection', (reason) => {
    console.error('❌ Unhandled Rejection:', reason);
    if (NODE_ENV === 'production') gracefulShutdown('UNHANDLED_REJECTION');
});

process.on('uncaughtException', (error) => {
    console.error('❌ Uncaught Exception:', error);
    if (NODE_ENV === 'production') gracefulShutdown('UNCAUGHT_EXCEPTION');
});

const startServer = async () => {
    try {
        console.log('\n🚀 Starting Interview Prep API...\n');

        const requiredEnvVars = ['MONGO_URI', 'JWT_SECRET', 'GROQ_API'];
        const missing = requiredEnvVars.filter(v => !process.env[v]);
        if (missing.length > 0) {
            throw new Error(`Missing env vars: ${missing.join(', ')}`);
        }

        await connectDB();
        console.log('✅ Database connected');

        app.listen(PORT, () => {
            console.log(`✅ Server running on http://localhost:${PORT}`);
            console.log(`🏥 Health: http://localhost:${PORT}/health`);
            console.log(`📚 API: http://localhost:${PORT}/api/v1\n`);
        });

    } catch (error) {
        console.error('❌ Failed to start:', error.message);
        process.exit(1);
    }
};

startServer();