// ============================================
// worker.js (FIXED)
// ============================================
import dotenv from "dotenv";
dotenv.config();

import mongoose from "mongoose";
import Groq from "groq-sdk";
import { questionQueue, exportQueue } from "./config/queue.js";
import { Session } from "./models/session.model.js";
import { Question } from "./models/question.model.js";
import { CacheService } from "./services/cacheService.js";
import { ExportService } from "./services/exportService.js";
import { NotificationService } from "./services/notificationService.js";
import { AnalyticsService } from "./services/analyticsService.js";
import { getRedisClient, closeRedis } from "./config/redis.js";

let groqInstance = null;

const getGroqClient = () => {
    if (groqInstance) return groqInstance;
    const apiKey = process.env.GROQ_API_KEY?.trim();
    if (!apiKey) throw new Error('GROQ API key missing');
    groqInstance = new Groq({ apiKey });
    return groqInstance;
};

const connectDB = async () => {
    try {
        await mongoose.connect(process.env.MONGO_URI, {
            maxPoolSize: 10,
            serverSelectionTimeoutMS: 5000,
            socketTimeoutMS: 45000,
        });
        console.log('✅ Worker: MongoDB Connected');
    } catch (error) {
        console.error('❌ Worker: MongoDB Connection Error:', error.message);
        process.exit(1);
    }
};

questionQueue.process(5, async (job) => {
    try {
        const { role, experience, topicsToFocus, sessionId, userId, cacheKey } = job.data;

        await job.progress(10);

        const groq = getGroqClient();
        const topicsString = topicsToFocus.join(', ');

        const prompt = `Generate exactly 5 interview questions for:

Role: ${role}
Experience: ${experience}
Topics: ${topicsString}

Return ONLY valid JSON array. No markdown, no explanations.
Format: [{"question": "...", "answer": "..."}]`;

        await job.progress(30);

        const completion = await groq.chat.completions.create({
            model: "llama-3.1-8b-instant",
            messages: [
                { role: "system", content: "Expert technical interviewer. Generate valid JSON arrays only." },
                { role: "user", content: prompt }
            ],
            temperature: 0.7,
            max_tokens: 2000,
            stream: false
        });

        await job.progress(60);

        let rawText = completion.choices[0]?.message?.content;
        if (!rawText) throw new Error('Empty AI response');

        rawText = rawText.replace(/```json|```/gi, "").trim();
        const match = rawText.match(/\[([\s\S]*?)\]/);
        
        if (!match) throw new Error('Invalid AI response format');

        const data = JSON.parse(match[0]);

        if (!Array.isArray(data) || data.length === 0) {
            throw new Error('Invalid AI data');
        }

        const validQuestions = data.filter(q => 
            q && 
            typeof q === 'object' && 
            q.question && 
            typeof q.question === 'string' && 
            q.question.trim() !== '' &&
            q.answer && 
            typeof q.answer === 'string' && 
            q.answer.trim() !== ''
        ).slice(0, 5);

        if (validQuestions.length === 0) {
            throw new Error('No valid questions generated');
        }

        await job.progress(80);

        await CacheService.set(cacheKey, validQuestions);

        const createdQuestions = await Question.insertMany(
            validQuestions.map(q => ({
                session: sessionId,
                question: q.question.trim(),
                answer: q.answer.trim(),
                isPinned: false
            }))
        );

        await Session.findByIdAndUpdate(
            sessionId,
            { $push: { questions: { $each: createdQuestions.map(q => q._id) } } }
        );

        // Track analytics
        await AnalyticsService.trackActivity(userId, 'question_generated', {
            sessionId,
            count: createdQuestions.length,
            role,
            experience
        });

        // Increment topic popularity
        await AnalyticsService.incrementTopicPopularity(topicsToFocus);

        // Send notification
        await NotificationService.notifyJobComplete(
            userId,
            'question-generation',
            job.id,
            { count: createdQuestions.length }
        );

        await job.progress(100);

        return {
            success: true,
            count: createdQuestions.length,
            questions: createdQuestions
        };
    } catch (error) {
        console.error('[Question Generation Error]', error);
        
        // Send failure notification
        if (job.data.userId) {
            await NotificationService.notifyJobFailed(
                job.data.userId,
                'question-generation',
                job.id,
                error.message
            );
        }
        
        throw error;
    }
});

exportQueue.process(3, async (job) => {
    try {
        const { sessionId, userId, format } = job.data;

        await job.progress(10);

        let filename;

        if (format === 'pdf') {
            filename = await ExportService.generatePDF(sessionId, userId);
        } else if (format === 'csv') {
            filename = await ExportService.generateCSV(sessionId, userId);
        } else if (format === 'docx') {
            filename = await ExportService.generateDOCX(sessionId, userId);
        } else {
            throw new Error('Invalid format');
        }

        await job.progress(100);

        // Track analytics
        await AnalyticsService.trackActivity(userId, 'export_generated', {
            sessionId,
            format
        });

        // Send notification
        await NotificationService.notifyJobComplete(
            userId,
            'export-generation',
            job.id,
            { filename, format }
        );

        return { filename };
    } catch (error) {
        console.error('[Export Generation Error]', error);
        
        // Send failure notification
        if (job.data.userId) {
            await NotificationService.notifyJobFailed(
                job.data.userId,
                'export-generation',
                job.id,
                error.message
            );
        }
        
        throw error;
    }
});

const startWorker = async () => {
    try {
        const requiredEnvVars = ['MONGO_URI', 'GROQ_API_KEY', 'REDIS_HOST'];
        const missingEnvVars = requiredEnvVars.filter(varName => !process.env[varName]);
        
        if (missingEnvVars.length > 0) {
            throw new Error(`Missing: ${missingEnvVars.join(', ')}`);
        }

        await connectDB();
        getRedisClient();

        console.log('\n🔧 ================================');
        console.log('✅ Worker Started');
        console.log('✅ Listening for jobs...');
        console.log('🔧 ================================\n');
    } catch (error) {
        console.error('❌ Worker Start Error:', error);
        process.exit(1);
    }
};

startWorker();

const gracefulShutdown = async (signal) => {
    console.log(`\n${signal} received, closing worker...`);
    try {
        await questionQueue.close();
        await exportQueue.close();
        await closeRedis();
        await mongoose.connection.close();
        console.log('✅ Worker shutdown complete');
        process.exit(0);
    } catch (error) {
        console.error('❌ Shutdown error:', error);
        process.exit(1);
    }
};

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

process.on('unhandledRejection', (reason, promise) => {
    console.error('❌ Unhandled Rejection:', reason);
    gracefulShutdown('UNHANDLED_REJECTION');
});

process.on('uncaughtException', (error) => {
    console.error('❌ Uncaught Exception:', error);
    gracefulShutdown('UNCAUGHT_EXCEPTION');
});