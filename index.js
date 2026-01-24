import dotenv from "dotenv";
dotenv.config();

import express from "express";
import cookieParser from "cookie-parser";
import { connectDB } from "./config/db.js";
import userRouter from "./routes/user.routes.js";
import sessionRouter from "./routes/session.routes.js";
import questionRoute from "./routes/question.routes.js";
import { authLimiter, generalLimiter, questionGenerationLimiter } from "./config/rateLimiter.js";

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(express.json());
app.use(cookieParser());
app.use(express.urlencoded({ extended: true }));

// Rate Limiter
app.use(generalLimiter)

// Routes
app.use("/api/v1/user", authLimiter ,userRouter);
app.use("/api/v1/session", sessionRouter);
app.use("/api/v1/question", questionGenerationLimiter , questionRoute);

// Health check route
app.get('/health', (req, res) => {
    res.json({
        status: 'OK',
        message: 'Server is running',
        timestamp: new Date().toISOString(),
        environment: {
            PORT: !!process.env.PORT,
            MONGO_URI: !!process.env.MONGO_URI,
            JWT_SECRET: !!process.env.JWT_SECRET,
            GROQ_API: !!process.env.GROQ_API
        }
    });
});

// Start server
app.listen(PORT, () => {
    connectDB();
    console.log(`Server running at http://localhost:${PORT}`);
});

// Error handling
process.on('unhandledRejection', (err) => {
    console.error('Unhandled Rejection:', err);
    process.exit(1);
});

process.on('uncaughtException', (err) => {
    console.error('Uncaught Exception:', err);
    process.exit(1);
});