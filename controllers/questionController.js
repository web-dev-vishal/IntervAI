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
