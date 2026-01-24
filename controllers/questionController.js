import Groq from "groq-sdk";
import { Session } from "../models/session.model.js";
import { Question } from "../models/question.model.js";
import mongoose from "mongoose";

// ============================================
// GROQ CLIENT SETUP
// ============================================

let groqInstance = null;

/**
 * Get or create Groq client instance
 */
const getGroqClient = () => {
    if (groqInstance) return groqInstance;

    const apiKey = process.env.GROQ_API_KEY || process.env.GROQ_API;
    
    if (!apiKey || apiKey.trim() === '') {
        console.error('GROQ API key is missing from environment variables');
        return null;
    }
    
    groqInstance = new Groq({ apiKey: apiKey.trim() });
    return groqInstance;
};

// ============================================
// AI GENERATION FUNCTIONS
// ============================================

/**
 * Generate interview questions using Groq AI
 * @route POST /api/questions/generate
 */
export const generateInterviewQuestion = async (req, res) => {
    try {
        const groq = getGroqClient();
        
        if (!groq) {
            return res.status(500).json({
                message: "AI service is not configured. Please add GROQ_API to your .env file",
                success: false
            });
        }

        const { role, experience, topicsToFocus, sessionId } = req.body;

        // Validate required fields
        if (!role || !experience || !topicsToFocus || !sessionId) {
            return res.status(400).json({
                message: "Please provide all required fields: role, experience, topicsToFocus, sessionId",
                success: false
            });
        }

        // Validate data types
        if (typeof role !== 'string' || role.trim().length === 0) {
            return res.status(400).json({
                message: "Role must be a non-empty string",
                success: false
            });
        }

        if (typeof experience !== 'string' || experience.trim().length === 0) {
            return res.status(400).json({
                message: "Experience must be a non-empty string",
                success: false
            });
        }

        if (!Array.isArray(topicsToFocus) || topicsToFocus.length === 0) {
            return res.status(400).json({
                message: "topicsToFocus must be a non-empty array",
                success: false
            });
        }

        // Validate MongoDB ObjectId
        if (!mongoose.Types.ObjectId.isValid(sessionId)) {
            return res.status(400).json({
                message: "Invalid session ID format",
                success: false
            });
        }

        // Check session exists and belongs to user
        const session = await Session.findById(sessionId);
        if (!session) {
            return res.status(404).json({
                message: "Session not found",
                success: false
            });
        }

        if (session.user.toString() !== req.id) {
            return res.status(403).json({
                message: "You don't have permission to generate questions for this session",
                success: false
            });
        }

        // Check question limit
        if (session.questions && session.questions.length >= 50) {
            return res.status(400).json({
                message: "Session has reached maximum number of questions (50)",
                success: false
            });
        }

        // Create prompt
        const topicsString = topicsToFocus.map(t => t.trim()).join(', ');
        const prompt = `You are an expert interview question generator.
Generate exactly 5 interview questions for the following role and experience level.

Role: ${role.trim()}
Experience Level: ${experience.trim()}
Topics to Focus: ${topicsString}

IMPORTANT: Return ONLY a valid JSON array with no additional text, explanations, or markdown formatting.
Each object must have "question" and "answer" fields.

Example format:
[
  {"question": "What is Express.js and why is it used?", "answer": "Express.js is a minimal and flexible Node.js web application framework that provides a robust set of features for web and mobile applications. It's used because it simplifies the creation of server-side applications, provides middleware support, and offers powerful routing capabilities."}
]

Now generate 5 high-quality interview questions with detailed answers:`;
        
        // Call Groq API
        let completion;
        try {
            completion = await groq.chat.completions.create({
                model: "llama-3.1-8b-instant",
                messages: [
                    {
                        role: "system",
                        content: "You are an expert technical interviewer. Generate only valid JSON arrays with no additional formatting or text."
                    },
                    {
                        role: "user",
                        content: prompt
                    }
                ],
                temperature: 0.7,
                max_tokens: 2000,
                top_p: 1,
                stream: false
            });
        } catch (apiError) {
            if (apiError.status === 401) {
                return res.status(500).json({
                    message: "AI service authentication failed. Invalid API key",
                    success: false
                });
            }

            if (apiError.status === 429) {
                return res.status(429).json({
                    message: "AI service rate limit exceeded. Please try again later",
                    success: false
                });
            }

            return res.status(503).json({
                message: "Failed to connect to AI service. Please try again later",
                success: false
            });
        }

        // Parse response
        let rawText = completion.choices[0]?.message?.content;

        if (!rawText) {
            return res.status(500).json({
                message: "Failed to generate questions from AI - empty response",
                success: false
            });
        }

        // Clean response
        rawText = rawText.replace(/```json|```/gi, "").trim();
        
        // Extract JSON array
        const arrayMatch = rawText.match(/\[[\s\S]*\]/);
        if (arrayMatch) {
            rawText = arrayMatch[0];
        }

        // Parse JSON
        let questionsData;
        try {
            questionsData = JSON.parse(rawText);
        } catch (err) {
            return res.status(500).json({
                message: "Invalid response format from AI model",
                success: false
            });
        }

        // Validate response is array
        if (!Array.isArray(questionsData)) {
            return res.status(500).json({
                message: "AI did not return an array of questions",
                success: false
            });
        }

        // Validate each question
        const validQuestions = questionsData.filter(q => 
            q.question && q.answer && 
            typeof q.question === 'string' && 
            typeof q.answer === 'string'
        );

        if (validQuestions.length === 0) {
            return res.status(500).json({
                message: "No valid questions generated by AI",
                success: false
            });
        }

        // Save questions to database
        const questionDocuments = validQuestions.map(q => ({
            session: sessionId,
            question: q.question.trim(),
            answer: q.answer.trim()
        }));

        const savedQuestions = await Question.insertMany(questionDocuments);

        // Update session with question IDs
        const questionIds = savedQuestions.map(q => q._id);
        await Session.findByIdAndUpdate(
            sessionId,
            { $push: { questions: { $each: questionIds } } }
        );

        return res.status(201).json({
            message: `Successfully generated ${savedQuestions.length} questions`,
            success: true,
            count: savedQuestions.length,
            questions: savedQuestions
        });

    } catch (error) {
        console.error('Error in generateInterviewQuestion:', error);
        return res.status(500).json({
            message: "Error generating questions",
            error: error.message,
            success: false
        });
    }
};

/**
 * Regenerate a question
 * @route POST /api/questions/:id/regenerate
 */
export const regenerateQuestion = async (req, res) => {
    try {
        const groq = getGroqClient();
        
        if (!groq) {
            return res.status(500).json({
                message: "AI service is not configured",
                success: false
            });
        }

        const { id } = req.params;

        // Validate question ID
        if (!mongoose.Types.ObjectId.isValid(id)) {
            return res.status(400).json({
                message: "Invalid question ID format",
                success: false
            });
        }

        // Find question
        const question = await Question.findById(id).populate({
            path: 'session',
            select: 'user role experience topicsToFocus'
        });

        if (!question) {
            return res.status(404).json({
                message: "Question not found",
                success: false
            });
        }

        // Authorization check
        if (question.session.user.toString() !== req.id) {
            return res.status(403).json({
                message: "You don't have permission to regenerate this question",
                success: false
            });
        }

        // Create prompt
        const { role, experience, topicsToFocus } = question.session;
        const topicsString = topicsToFocus.map(t => t.trim()).join(', ');

        const prompt = `You are an expert interview question generator.
Generate exactly 1 interview question for the following role and experience level.

Role: ${role}
Experience Level: ${experience}
Topics to Focus: ${topicsString}

IMPORTANT: Return ONLY a valid JSON object with no additional text.
The object must have "question" and "answer" fields.

Example format:
{"question": "What is middleware in Express.js?", "answer": "Middleware in Express.js are functions that have access to the request object (req), response object (res), and the next middleware function in the application's request-response cycle. They can execute code, modify request/response objects, end the request-response cycle, or call the next middleware in the stack."}

Generate 1 high-quality interview question with a detailed answer:`;

        // Call Groq API
        let completion;
        try {
            completion = await groq.chat.completions.create({
                model: "llama-3.1-8b-instant",
                messages: [
                    {
                        role: "system",
                        content: "You are an expert technical interviewer. Generate only valid JSON with no additional formatting."
                    },
                    {
                        role: "user",
                        content: prompt
                    }
                ],
                temperature: 0.8,
                max_tokens: 1000,
                top_p: 1,
                stream: false
            });
        } catch (apiError) {
            if (apiError.status === 401) {
                return res.status(500).json({
                    message: "AI service authentication failed",
                    success: false
                });
            }

            if (apiError.status === 429) {
                return res.status(429).json({
                    message: "AI service rate limit exceeded",
                    success: false
                });
            }

            return res.status(503).json({
                message: "Failed to connect to AI service",
                success: false
            });
        }

        // Parse response
        let rawText = completion.choices[0]?.message?.content;

        if (!rawText) {
            return res.status(500).json({
                message: "Failed to generate question from AI",
                success: false
            });
        }

        // Clean response
        rawText = rawText.replace(/```json|```/gi, "").trim();
        const match = rawText.match(/\{[\s\S]*?\}/);
        if (match) {
            rawText = match[0];
        }

        // Parse JSON
        let data;
        try {
            data = JSON.parse(rawText);
        } catch (err) {
            return res.status(500).json({
                message: "Invalid response format from AI model",
                success: false
            });
        }

        // Validate
        if (!data.question || !data.answer) {
            return res.status(500).json({
                message: "AI did not return valid question and answer",
                success: false
            });
        }

        // Update question
        question.question = data.question.trim();
        question.answer = data.answer.trim();
        await question.save();

        return res.status(200).json({
            message: "Question regenerated successfully",
            success: true,
            question
        });

    } catch (error) {
        console.error('Error in regenerateQuestion:', error);
        return res.status(500).json({
            message: "Error regenerating question",
            error: error.message,
            success: false
        });
    }
};

// ============================================
// QUERY FUNCTIONS
// ============================================

/**
 * Get all questions for a session
 * @route GET /api/questions/session/:sessionId
 */
export const getQuestionsBySession = async (req, res) => {
    try {
        const { sessionId } = req.params;

        // Validate session ID
        if (!mongoose.Types.ObjectId.isValid(sessionId)) {
            return res.status(400).json({
                message: "Invalid session ID format",
                success: false
            });
        }

        // Find session and verify ownership
        const session = await Session.findById(sessionId);
        if (!session) {
            return res.status(404).json({
                message: "Session not found",
                success: false
            });
        }

        if (session.user.toString() !== req.id) {
            return res.status(403).json({
                message: "You don't have permission to view these questions",
                success: false
            });
        }

        // Get questions
        const questions = await Question.find({ session: sessionId }).sort({ createdAt: 1 });

        return res.status(200).json({
            message: "Questions retrieved successfully",
            success: true,
            count: questions.length,
            questions
        });

    } catch (error) {
        console.error('Error in getQuestionsBySession:', error);
        return res.status(500).json({
            message: "Error retrieving questions",
            error: error.message,
            success: false
        });
    }
};

/**
 * Get single question by ID
 * @route GET /api/questions/:id
 */
export const getQuestionById = async (req, res) => {
    try {
        const { id } = req.params;

        // Validate question ID
        if (!mongoose.Types.ObjectId.isValid(id)) {
            return res.status(400).json({
                message: "Invalid question ID format",
                success: false
            });
        }

        // Find question
        const question = await Question.findById(id).populate({
            path: 'session',
            select: 'user role experience'
        });

        if (!question) {
            return res.status(404).json({
                message: "Question not found",
                success: false
            });
        }

        // Authorization check
        if (question.session.user.toString() !== req.id) {
            return res.status(403).json({
                message: "You don't have permission to view this question",
                success: false
            });
        }

        return res.status(200).json({
            message: "Question retrieved successfully",
            success: true,
            question
        });

    } catch (error) {
        console.error('Error in getQuestionById:', error);
        return res.status(500).json({
            message: "Error retrieving question",
            error: error.message,
            success: false
        });
    }
};

/**
 * Search questions across all sessions
 * @route GET /api/questions/search
 */
export const searchQuestions = async (req, res) => {
    try {
        const { q, limit = 20 } = req.query;

        // Validation
        if (!q || q.trim().length === 0) {
            return res.status(400).json({
                message: "Please provide a search query",
                success: false
            });
        }

        // Find user sessions
        const userSessions = await Session.find({ user: req.id }).select('_id');
        const sessionIds = userSessions.map(s => s._id);

        if (sessionIds.length === 0) {
            return res.status(200).json({
                message: "No sessions found for user",
                success: true,
                count: 0,
                questions: []
            });
        }

        // Search questions
        const questions = await Question.find({
            session: { $in: sessionIds },
            $or: [
                { question: { $regex: q.trim(), $options: 'i' } },
                { answer: { $regex: q.trim(), $options: 'i' } }
            ]
        })
        .populate({
            path: 'session',
            select: 'role experience'
        })
        .limit(parseInt(limit))
        .sort({ createdAt: -1 });

        return res.status(200).json({
            message: "Search completed successfully",
            success: true,
            count: questions.length,
            questions
        });

    } catch (error) {
        console.error('Error in searchQuestions:', error);
        return res.status(500).json({
            message: "Error searching questions",
            error: error.message,
            success: false
        });
    }
};

/**
 * Get only pinned questions for a session
 * @route GET /api/questions/session/:sessionId/pinned
 */
export const getPinnedQuestions = async (req, res) => {
    try {
        const { sessionId } = req.params;

        // Validate session ID
        if (!mongoose.Types.ObjectId.isValid(sessionId)) {
            return res.status(400).json({
                message: "Invalid session ID format",
                success: false
            });
        }

        // Find session and verify ownership
        const session = await Session.findById(sessionId);
        if (!session) {
            return res.status(404).json({
                message: "Session not found",
                success: false
            });
        }

        if (session.user.toString() !== req.id) {
            return res.status(403).json({
                message: "You don't have permission to view these questions",
                success: false
            });
        }

        // Get pinned questions
        const questions = await Question.find({ 
            session: sessionId,
            isPinned: true 
        }).sort({ createdAt: -1 });

        return res.status(200).json({
            message: "Pinned questions retrieved successfully",
            success: true,
            count: questions.length,
            questions
        });

    } catch (error) {
        console.error('Error in getPinnedQuestions:', error);
        return res.status(500).json({
            message: "Error retrieving pinned questions",
            error: error.message,
            success: false
        });
    }
};

/**
 * Get question statistics for a session
 * @route GET /api/questions/session/:sessionId/stats
 */
export const getQuestionStats = async (req, res) => {
    try {
        const { sessionId } = req.params;

        // Validate session ID
        if (!mongoose.Types.ObjectId.isValid(sessionId)) {
            return res.status(400).json({
                message: "Invalid session ID format",
                success: false
            });
        }

        // Find session and verify ownership
        const session = await Session.findById(sessionId);
        if (!session) {
            return res.status(404).json({
                message: "Session not found",
                success: false
            });
        }

        if (session.user.toString() !== req.id) {
            return res.status(403).json({
                message: "You don't have permission to view these statistics",
                success: false
            });
        }

        // Get statistics
        const totalQuestions = await Question.countDocuments({ session: sessionId });
        const pinnedQuestions = await Question.countDocuments({ 
            session: sessionId, 
            isPinned: true 
        });

        return res.status(200).json({
            message: "Statistics retrieved successfully",
            success: true,
            stats: {
                totalQuestions,
                pinnedQuestions,
                unpinnedQuestions: totalQuestions - pinnedQuestions,
                session: {
                    role: session.role,
                    experience: session.experience,
                    topics: session.topicsToFocus
                }
            }
        });

    } catch (error) {
        console.error('Error in getQuestionStats:', error);
        return res.status(500).json({
            message: "Error retrieving statistics",
            error: error.message,
            success: false
        });
    }
};

// ============================================
// CREATE FUNCTIONS
// ============================================

/**
 * Add custom question manually (without AI)
 * @route POST /api/questions/custom
 */
export const addCustomQuestion = async (req, res) => {
    try {
        const { sessionId, question, answer } = req.body;

        // Validate required fields
        if (!sessionId || !question || !answer) {
            return res.status(400).json({
                message: "Please provide sessionId, question, and answer",
                success: false
            });
        }

        // Validate sessionId
        if (!mongoose.Types.ObjectId.isValid(sessionId)) {
            return res.status(400).json({
                message: "Invalid session ID format",
                success: false
            });
        }

        // Check session exists and belongs to user
        const session = await Session.findById(sessionId);
        if (!session) {
            return res.status(404).json({
                message: "Session not found",
                success: false
            });
        }

        if (session.user.toString() !== req.id) {
            return res.status(403).json({
                message: "You don't have permission to add questions to this session",
                success: false
            });
        }

        // Check question limit
        if (session.questions && session.questions.length >= 50) {
            return res.status(400).json({
                message: "Session has reached maximum number of questions (50)",
                success: false
            });
        }

        // Create question
        const newQuestion = await Question.create({
            session: sessionId,
            question: question.trim(),
            answer: answer.trim()
        });

        // Update session
        await Session.findByIdAndUpdate(
            sessionId,
            { $push: { questions: newQuestion._id } }
        );

        return res.status(201).json({
            message: "Custom question added successfully",
            success: true,
            question: newQuestion
        });

    } catch (error) {
        console.error('Error in addCustomQuestion:', error);
        return res.status(500).json({
            message: "Error adding custom question",
            error: error.message,
            success: false
        });
    }
};

// ============================================
// UPDATE FUNCTIONS
// ============================================

/**
 * Update a question
 * @route PUT /api/questions/:id
 */
export const updateQuestion = async (req, res) => {
    try {
        const { id } = req.params;
        const { question, answer } = req.body;

        // Validate question ID
        if (!mongoose.Types.ObjectId.isValid(id)) {
            return res.status(400).json({
                message: "Invalid question ID format",
                success: false
            });
        }

        // At least one field must be provided
        if (!question && !answer) {
            return res.status(400).json({
                message: "Please provide at least one field to update (question or answer)",
                success: false
            });
        }

        // Find question
        const existingQuestion = await Question.findById(id).populate({
            path: 'session',
            select: 'user'
        });

        if (!existingQuestion) {
            return res.status(404).json({
                message: "Question not found",
                success: false
            });
        }

        // Authorization check
        if (existingQuestion.session.user.toString() !== req.id) {
            return res.status(403).json({
                message: "You don't have permission to update this question",
                success: false
            });
        }

        // Update fields
        if (question) existingQuestion.question = question.trim();
        if (answer) existingQuestion.answer = answer.trim();

        await existingQuestion.save();

        return res.status(200).json({
            message: "Question updated successfully",
            success: true,
            question: existingQuestion
        });

    } catch (error) {
        console.error('Error in updateQuestion:', error);
        return res.status(500).json({
            message: "Error updating question",
            error: error.message,
            success: false
        });
    }
};

/**
 * Toggle pin status of a question
 * @route PATCH /api/questions/:id/toggle-pin
 */
export const togglePinQuestion = async (req, res) => {
    try {
        const { id } = req.params;

        // Validate question ID
        if (!mongoose.Types.ObjectId.isValid(id)) {
            return res.status(400).json({
                message: "Invalid question ID format",
                success: false
            });
        }

        // Find question
        const question = await Question.findById(id).populate({
            path: 'session',
            select: 'user'
        });

        if (!question) {
            return res.status(404).json({
                message: "Question not found",
                success: false
            });
        }

        // Authorization check
        if (question.session.user.toString() !== req.id) {
            return res.status(403).json({
                message: "You don't have permission to pin this question",
                success: false
            });
        }

        // Toggle pin status
        question.isPinned = !question.isPinned;
        await question.save();

        return res.status(200).json({
            message: `Question ${question.isPinned ? 'pinned' : 'unpinned'} successfully`,
            success: true,
            isPinned: question.isPinned,
            question
        });

    } catch (error) {
        console.error('Error in togglePinQuestion:', error);
        return res.status(500).json({
            message: "Error toggling pin status",
            error: error.message,
            success: false
        });
    }
};

// ============================================
// DELETE FUNCTIONS
// ============================================

/**
 * Delete a question
 * @route DELETE /api/questions/:id
 */
export const deleteQuestion = async (req, res) => {
    try {
        const { id } = req.params;

        // Validate question ID
        if (!mongoose.Types.ObjectId.isValid(id)) {
            return res.status(400).json({
                message: "Invalid question ID format",
                success: false
            });
        }

        // Find question
        const question = await Question.findById(id).populate({
            path: 'session',
            select: 'user'
        });

        if (!question) {
            return res.status(404).json({
                message: "Question not found",
                success: false
            });
        }

        // Authorization check
        if (question.session.user.toString() !== req.id) {
            return res.status(403).json({
                message: "You don't have permission to delete this question",
                success: false
            });
        }

        // Remove question from session
        await Session.findByIdAndUpdate(
            question.session._id,
            { $pull: { questions: id } }
        );

        // Delete question
        await Question.findByIdAndDelete(id);

        return res.status(200).json({
            message: "Question deleted successfully",
            success: true
        });

    } catch (error) {
        console.error('Error in deleteQuestion:', error);
        return res.status(500).json({
            message: "Error deleting question",
            error: error.message,
            success: false
        });
    }
};