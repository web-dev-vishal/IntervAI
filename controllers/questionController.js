import Groq from "groq-sdk";
import { Session } from "../models/session.model.js";
import { Question } from "../models/question.model.js";
import mongoose from "mongoose";

let groqInstance = null;

const getGroqClient = () => {
    if (groqInstance) return groqInstance;

    const apiKey = process.env.GROQ_API_KEY?.trim();

    if (!apiKey) {
        console.error('[GROQ] API key missing');
        return null;
    }

    if (!apiKey.startsWith('gsk_')) {
        console.warn('[GROQ] Invalid API key format');
    }

    groqInstance = new Groq({ apiKey });
    return groqInstance;
};

export const generateInterviewQuestion = async (req, res) => {
    try {
        const groq = getGroqClient();

        if (!groq) {
            return res.status(500).json({
                success: false,
                message: "AI service not configured"
            });
        }

        const { role, experience, topicsToFocus, sessionId } = req.body;

        if (!role || !experience || !topicsToFocus || !sessionId) {
            return res.status(400).json({
                success: false,
                message: "Missing required fields",
                required: ["role", "experience", "topicsToFocus", "sessionId"]
            });
        }

        if (typeof role !== 'string' || role.trim().length === 0) {
            return res.status(400).json({
                success: false,
                message: "Role must be non-empty string"
            });
        }

        if (typeof experience !== 'string' || experience.trim().length === 0) {
            return res.status(400).json({
                success: false,
                message: "Experience must be non-empty string"
            });
        }

        if (!Array.isArray(topicsToFocus) || topicsToFocus.length === 0) {
            return res.status(400).json({
                success: false,
                message: "topicsToFocus must be non-empty array"
            });
        }

        const invalidTopics = topicsToFocus.filter(t => typeof t !== 'string' || t.trim().length === 0);
        if (invalidTopics.length > 0) {
            return res.status(400).json({
                success: false,
                message: "All topics must be non-empty strings"
            });
        }

        if (!mongoose.Types.ObjectId.isValid(sessionId)) {
            return res.status(400).json({
                success: false,
                message: "Invalid session ID"
            });
        }

        const session = await Session.findById(sessionId).lean();
        if (!session) {
            return res.status(404).json({
                success: false,
                message: "Session not found"
            });
        }

        if (session.user.toString() !== req.id) {
            return res.status(403).json({
                success: false,
                message: "Unauthorized access"
            });
        }

        const questionCount = await Question.countDocuments({ session: sessionId });
        if (questionCount >= 50) {
            return res.status(400).json({
                success: false,
                message: "Session reached maximum of 50 questions",
                currentCount: questionCount
            });
        }

        const topicsString = topicsToFocus.map(t => t.trim()).join(', ');
        const prompt = `Generate exactly 5 interview questions for:

Role: ${role.trim()}
Experience: ${experience.trim()}
Topics: ${topicsString}

Return ONLY valid JSON array. No markdown, no explanations.
Format: [{"question": "...", "answer": "..."}]`;

        let completion;
        try {
            completion = await groq.chat.completions.create({
                model: "llama-3.1-8b-instant",
                messages: [
                    { role: "system", content: "Expert technical interviewer. Generate valid JSON arrays only." },
                    { role: "user", content: prompt }
                ],
                temperature: 0.7,
                max_tokens: 2000,
                top_p: 1,
                stream: false
            });
        } catch (apiError) {
            if (apiError.status === 401) {
                return res.status(500).json({ success: false, message: "AI authentication failed" });
            }
            if (apiError.status === 429) {
                return res.status(429).json({ success: false, message: "Rate limit exceeded" });
            }
            return res.status(503).json({ success: false, message: "AI service unavailable" });
        }

        let rawText = completion.choices[0]?.message?.content;
        if (!rawText) {
            return res.status(500).json({ success: false, message: "Empty AI response" });
        }

        rawText = rawText.replace(/```json|```/gi, "").trim();
        const match = rawText.match(/\[([\s\S]*?)\]/);

        if (!match) {
            return res.status(500).json({ success: false, message: "Invalid AI response format" });
        }

        let data;
        try {
            data = JSON.parse(match[0]);
        } catch (err) {
            return res.status(500).json({ success: false, message: "Failed to parse AI response" });
        }

        if (!Array.isArray(data) || data.length === 0) {
            return res.status(500).json({ success: false, message: "Invalid AI data" });
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
            return res.status(500).json({ success: false, message: "No valid questions generated" });
        }

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

        return res.status(201).json({
            success: true,
            message: "Questions generated successfully",
            count: createdQuestions.length,
            data: {
                questions: createdQuestions,
                aiModel: "llama-3.1-8b-instant",
                tokensUsed: completion.usage?.total_tokens || 0
            }
        });

    } catch (error) {
        console.error('[generateInterviewQuestion]', error);
        return res.status(500).json({
            success: false,
            message: "Internal server error"
        });
    }
};

export const regenerateQuestion = async (req, res) => {
    try {
        const groq = getGroqClient();
        if (!groq) {
            return res.status(500).json({ success: false, message: "AI service not configured" });
        }

        const { id } = req.params;

        if (!mongoose.Types.ObjectId.isValid(id)) {
            return res.status(400).json({ success: false, message: "Invalid question ID" });
        }

        const question = await Question.findById(id).populate('session', 'user role experience topicsToFocus');

        if (!question) {
            return res.status(404).json({ success: false, message: "Question not found" });
        }

        if (!question.session) {
            return res.status(404).json({ success: false, message: "Session not found" });
        }

        if (question.session.user.toString() !== req.id) {
            return res.status(403).json({ success: false, message: "Unauthorized access" });
        }

        const { role, experience, topicsToFocus } = question.session;

        if (!role || !experience || !topicsToFocus) {
            return res.status(400).json({ success: false, message: "Session missing required fields" });
        }

        const topicsArray = Array.isArray(topicsToFocus) ? topicsToFocus : [String(topicsToFocus)];
        const topicsString = topicsArray.map(t => String(t).trim()).join(', ');

        const prompt = `Generate exactly 1 interview question for:

Role: ${role}
Experience: ${experience}
Topics: ${topicsString}

Return ONLY valid JSON array: [{"question": "...", "answer": "..."}]`;

        let completion;
        try {
            completion = await groq.chat.completions.create({
                model: "llama-3.1-8b-instant",
                messages: [
                    { role: "system", content: "Expert technical interviewer. Generate valid JSON arrays only." },
                    { role: "user", content: prompt }
                ],
                temperature: 0.8,
                max_tokens: 1000,
                stream: false
            });
        } catch (apiError) {
            if (apiError.status === 401) return res.status(500).json({ success: false, message: "AI authentication failed" });
            if (apiError.status === 429) return res.status(429).json({ success: false, message: "Rate limit exceeded" });
            return res.status(503).json({ success: false, message: "AI service unavailable" });
        }

        let rawText = completion.choices[0]?.message?.content;
        if (!rawText) {
            return res.status(500).json({ success: false, message: "Empty AI response" });
        }

        rawText = rawText.replace(/```json|```/gi, "").trim();
        const arrayMatch = rawText.match(/\[[\s\S]*\]/);

        if (!arrayMatch) {
            return res.status(500).json({ success: false, message: "Invalid AI response format" });
        }

        let questionsData;
        try {
            questionsData = JSON.parse(arrayMatch[0]);
        } catch (err) {
            return res.status(500).json({ success: false, message: "Failed to parse AI response" });
        }

        if (!Array.isArray(questionsData) || questionsData.length === 0) {
            return res.status(500).json({ success: false, message: "Invalid AI data" });
        }

        const data = questionsData[0];
        if (!data?.question || !data?.answer) {
            return res.status(500).json({ success: false, message: "Invalid question format" });
        }

        question.question = data.question.trim();
        question.answer = data.answer.trim();
        await question.save();

        return res.status(200).json({
            success: true,
            message: "Question regenerated successfully",
            data: { question }
        });

    } catch (error) {
        console.error('[regenerateQuestion]', error);
        return res.status(500).json({ success: false, message: "Internal server error" });
    }
};

export const getQuestionsBySession = async (req, res) => {
    try {
        const { sessionId } = req.params;

        if (!mongoose.Types.ObjectId.isValid(sessionId)) {
            return res.status(400).json({ success: false, message: "Invalid session ID" });
        }

        const session = await Session.findById(sessionId).select('user').lean();
        if (!session) {
            return res.status(404).json({ success: false, message: "Session not found" });
        }
        if (session.user.toString() !== req.id) {
            return res.status(403).json({ success: false, message: "Unauthorized access" });
        }

        const questions = await Question.find({ session: sessionId })
            .sort({ createdAt: 1 })
            .lean();

        return res.status(200).json({
            success: true,
            message: "Questions retrieved successfully",
            count: questions.length,
            data: { questions }
        });

    } catch (error) {
        console.error('[getQuestionsBySession]', error);
        return res.status(500).json({ success: false, message: "Internal server error" });
    }
}

export const getQuestionById = async (req, res) => {
    try {
        const { id } = req.params;
        if (!mongoose.Types.ObjectId.isValid(id)) {
            return res.status(400).json({ success: false, message: "Invalid question ID" });
        }

        const question = await Question.findById(id).populate('session', 'user role experience topicsToFocus');

        if (!question) {
            return res.status(404).json({ success: false, message: "Question not found" });
        }

        if (!question.session || question.session.user.toString() !== req.id) {
            return res.status(403).json({ success: false, message: "Unauthorized access" });
        }

        return res.status(200).json({
            success: true,
            message: "Question retrieved successfully",
            data: { question }
        });

    } catch (error) {
        console.error('[getQuestionById]', error);
        return res.status(500).json({ success: false, message: "Internal server error" });
    }
};

export const searchQuestions = async (req, res) => {
    try {
        const { q, limit = 20 } = req.query;
        if (!q || q.trim().length === 0) {
            return res.status(400).json({ success: false, message: "Search query required" });
        }

        const userSessions = await Session.find({ user: req.id }).select('_id').lean();
        const sessionIds = userSessions.map(s => s._id);

        if (sessionIds.length === 0) {
            return res.status(200).json({
                success: true,
                message: "No sessions found",
                count: 0,
                data: { questions: [] }
            });
        }

        const questions = await Question.find({
            session: { $in: sessionIds },
            $or: [
                { question: { $regex: q.trim(), $options: 'i' } },
                { answer: { $regex: q.trim(), $options: 'i' } }
            ]
        })
            .populate('session', 'role experience topicsToFocus')
            .limit(Math.min(parseInt(limit), 100))
            .sort({ createdAt: -1 })
            .lean();

        return res.status(200).json({
            success: true,
            message: "Search completed",
            count: questions.length,
            data: { questions, searchQuery: q }
        });

    } catch (error) {
        console.error('[searchQuestions]', error);
        return res.status(500).json({ success: false, message: "Internal server error" });
    }
};

export const getPinnedQuestions = async (req, res) => {
    try {
        const { sessionId } = req.params;
        if (!mongoose.Types.ObjectId.isValid(sessionId)) {
            return res.status(400).json({ success: false, message: "Invalid session ID" });
        }

        const session = await Session.findById(sessionId).select('user').lean();
        if (!session) {
            return res.status(404).json({ success: false, message: "Session not found" });
        }

        if (session.user.toString() !== req.id) {
            return res.status(403).json({ success: false, message: "Unauthorized access" });
        }

        const questions = await Question.find({
            session: sessionId,
            isPinned: true
        })
            .sort({ createdAt: -1 })
            .lean();

        return res.status(200).json({
            success: true,
            message: "Pinned questions retrieved",
            count: questions.length,
            data: { questions }
        });

    } catch (error) {
        console.error('[getPinnedQuestions]', error);
        return res.status(500).json({ success: false, message: "Internal server error" });
    }
};

export const getQuestionStats = async (req, res) => {
    try {
        const { sessionId } = req.params;
        if (!mongoose.Types.ObjectId.isValid(sessionId)) {
            return res.status(400).json({ success: false, message: "Invalid session ID" });
        }

        const session = await Session.findById(sessionId).select('user role experience topicsToFocus').lean();
        if (!session) {
            return res.status(404).json({ success: false, message: "Session not found" });
        }

        if (session.user.toString() !== req.id) {
            return res.status(403).json({ success: false, message: "Unauthorized access" });
        }

        const [totalQuestions, pinnedQuestions] = await Promise.all([
            Question.countDocuments({ session: sessionId }),
            Question.countDocuments({ session: sessionId, isPinned: true })
        ]);

        return res.status(200).json({
            success: true,
            message: "Statistics retrieved",
            data: {
                stats: {
                    total: totalQuestions,
                    pinned: pinnedQuestions,
                    unpinned: totalQuestions - pinnedQuestions
                },
                session: {
                    role: session.role,
                    experience: session.experience,
                    topics: session.topicsToFocus
                }
            }
        });

    } catch (error) {
        console.error('[getQuestionStats]', error);
        return res.status(500).json({ success: false, message: "Internal server error" });
    }
};

export const addCustomQuestion = async (req, res) => {
    try {
        const { sessionId, question, answer } = req.body;
        if (!sessionId || !question || !answer) {
            return res.status(400).json({
                success: false,
                message: "sessionId, question, and answer required"
            });
        }

        if (typeof question !== 'string' || question.trim().length === 0) {
            return res.status(400).json({ success: false, message: "Question must be non-empty string" });
        }

        if (typeof answer !== 'string' || answer.trim().length === 0) {
            return res.status(400).json({ success: false, message: "Answer must be non-empty string" });
        }

        if (!mongoose.Types.ObjectId.isValid(sessionId)) {
            return res.status(400).json({ success: false, message: "Invalid session ID" });
        }

        const session = await Session.findById(sessionId);
        if (!session) {
            return res.status(404).json({ success: false, message: "Session not found" });
        }

        if (session.user.toString() !== req.id) {
            return res.status(403).json({ success: false, message: "Unauthorized access" });
        }

        const questionCount = await Question.countDocuments({ session: sessionId });
        if (questionCount >= 50) {
            return res.status(400).json({ success: false, message: "Session reached maximum of 50 questions" });
        }

        const newQuestion = await Question.create({
            session: sessionId,
            question: question.trim(),
            answer: answer.trim(),
            isPinned: false
        });

        await Session.findByIdAndUpdate(sessionId, { $push: { questions: newQuestion._id } });

        return res.status(201).json({
            success: true,
            message: "Custom question added",
            data: { question: newQuestion }
        });

    } catch (error) {
        console.error('[addCustomQuestion]', error);
        return res.status(500).json({ success: false, message: "Internal server error" });
    }
};

export const updateQuestion = async (req, res) => {
    try {
        const { id } = req.params;
        const { question, answer } = req.body;
        if (!mongoose.Types.ObjectId.isValid(id)) {
            return res.status(400).json({ success: false, message: "Invalid question ID" });
        }

        if (!question && !answer) {
            return res.status(400).json({ success: false, message: "Provide question or answer to update" });
        }

        if (question && (typeof question !== 'string' || question.trim().length === 0)) {
            return res.status(400).json({ success: false, message: "Question must be non-empty string" });
        }

        if (answer && (typeof answer !== 'string' || answer.trim().length === 0)) {
            return res.status(400).json({ success: false, message: "Answer must be non-empty string" });
        }

        const existingQuestion = await Question.findById(id).populate('session', 'user');

        if (!existingQuestion) {
            return res.status(404).json({ success: false, message: "Question not found" });
        }

        if (!existingQuestion.session || existingQuestion.session.user.toString() !== req.id) {
            return res.status(403).json({ success: false, message: "Unauthorized access" });
        }

        if (question) existingQuestion.question = question.trim();
        if (answer) existingQuestion.answer = answer.trim();

        await existingQuestion.save();

        return res.status(200).json({
            success: true,
            message: "Question updated",
            data: { question: existingQuestion }
        });

    } catch (error) {
        console.error('[updateQuestion]', error);
        return res.status(500).json({ success: false, message: "Internal server error" });
    }
};

