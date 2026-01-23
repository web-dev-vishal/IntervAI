// ✅ CRITICAL: Load dotenv FIRST before any other imports
import dotenv from "dotenv";
dotenv.config();

// ✅ Debug: Verify environment variables are loaded
console.log('🔍 Environment Variables Check:');
console.log('PORT:', process.env.PORT || 'NOT SET');
console.log('MONGO_URI:', process.env.MONGO_URI ? '✅ SET' : '❌ NOT SET');
console.log('JWT_SECRET:', process.env.JWT_SECRET ? '✅ SET' : '❌ NOT SET');
console.log('GROQ_API:', process.env.GROQ_API ? '✅ SET' : '❌ NOT SET');
if (process.env.GROQ_API) {
    console.log('GROQ_API length:', process.env.GROQ_API.length);
    console.log('GROQ_API preview:', process.env.GROQ_API.substring(0, 10) + '...');
}
console.log('─'.repeat(60));

// ✅ Now import everything else (these will have access to process.env)
import express from "express";
import cookieParser from "cookie-parser";
import { connectDB } from "./config/db.js";
import userRouter from "./routes/user.routes.js";
import sessionRouter from "./routes/session.routes.js";
import questionRoute from "./routes/question.routes.js";

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(express.json());
app.use(cookieParser());
app.use(express.urlencoded({ extended: true }));

// Routes
app.use("/api/v1/user", userRouter);
app.use("/api/v1/session", sessionRouter);
app.use("/api/v1/question", questionRoute);

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
    console.log(`🚀 Server running at http://localhost:${PORT}`);
    console.log(`📊 INTERVAI API is ready!`);
});

// Error handling
process.on('unhandledRejection', (err) => {
    console.error('❌ Unhandled Rejection:', err);
    process.exit(1);
});

process.on('uncaughtException', (err) => {
    console.error('❌ Uncaught Exception:', err);
    process.exit(1);
});