import Groq from "groq-sdk";
import { Session } from "../models/session.model.js";
import { Question } from "../models/question.model.js";
import mongoose from "mongoose";

// ============================================
// GROQ CLIENT SINGLETON
// ============================================

let groqInstance = null;

/**
 * Get or create Groq client instance
 * @returns {Groq|null} Groq client or null if API key missing
 */
const getGroqClient = () => {
    if (groqInstance) {
        return groqInstance;
    }

    const apiKey = process.env.GROQ_API_KEY || process.env.GROQ_API;
    
    if (!apiKey || apiKey.trim() === '') {
        console.error('GROQ API key is missing from environment variables');
        return null;
    }
    
    if (!apiKey.startsWith('gsk_')) {
        console.warn('GROQ API key format may be invalid. Expected format: gsk_...');
    }
    
    groqInstance = new Groq({ apiKey: apiKey.trim() });
    return groqInstance;
};

// ============================================
// AI GENERATION FUNCTIONS
// ============================================

/**
 * Generate 5 interview questions using Groq AI
 * @route POST /api/questions/generate
 * @access Private
 */
export const generateInterviewQuestion = async (req, res) => {
    try {
        const groq = getGroqClient();
        
        if (!groq) {
            return res.status(500).json({
                message: "AI service is not configured. Please add GROQ_API to your .env file",
                success: false,
                hint: "Add GROQ_API=gsk_... to your .env file and restart the server"
            });
        }

        const { role, experience, topicsToFocus, sessionId } = req.body;

        // ===== VALIDATION LAYER =====
        
        // Check all required fields exist
        if (!role || !experience || !topicsToFocus || !sessionId) {
            return res.status(400).json({
                message: "Please provide all required fields: role, experience, topicsToFocus, sessionId",
                success: false,
                missingFields: {
                    role: !role,
                    experience: !experience,
                    topicsToFocus: !topicsToFocus,
                    sessionId: !sessionId
                }
            });
        }

        // Validate role is non-empty string
        if (typeof role !== 'string' || role.trim().length === 0) {
            return res.status(400).json({
                message: "Role must be a non-empty string",
                success: false
            });
        }

        // Validate experience is non-empty string
        if (typeof experience !== 'string' || experience.trim().length === 0) {
            return res.status(400).json({
                message: "Experience must be a non-empty string",
                success: false
            });
        }

        // Validate topicsToFocus is non-empty array
        if (!Array.isArray(topicsToFocus) || topicsToFocus.length === 0) {
            return res.status(400).json({
                message: "topicsToFocus must be a non-empty array",
                success: false
            });
        }

        // Validate each topic is a non-empty string
        const invalidTopics = topicsToFocus.filter(topic => 
            typeof topic !== 'string' || topic.trim().length === 0
        );
        
        if (invalidTopics.length > 0) {
            return res.status(400).json({
                message: "All topics must be non-empty strings",
                success: false
            });
        }

        // Validate sessionId is valid MongoDB ObjectId
        if (!mongoose.Types.ObjectId.isValid(sessionId)) {
            return res.status(400).json({
                message: "Invalid session ID format",
                success: false
            });
        }

        // ===== DATABASE CHECKS =====
        
        // Check session exists
        const session = await Session.findById(sessionId);
        if (!session) {
            return res.status(404).json({
                message: "Session not found",
                success: false
            });
        }

        // Authorization check - session belongs to user
        if (session.user.toString() !== req.id) {
            return res.status(403).json({
                message: "You don't have permission to generate questions for this session",
                success: false
            });
        }

        // Check question limit (max 50 per session)
        if (session.questions && session.questions.length >= 50) {
            return res.status(400).json({
                message: "Session has reached maximum number of questions (50)",
                success: false,
                currentCount: session.questions.length
            });
        }

        // ===== AI PROMPT CREATION =====
        
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
  {"question": "What is React and why is it used?", "answer": "React is a JavaScript library for building user interfaces, particularly single-page applications. It's used because it allows developers to create reusable UI components and efficiently update the DOM."},
  {"question": "Explain the concept of Virtual DOM.", "answer": "Virtual DOM is a lightweight copy of the actual DOM. React uses it to minimize direct DOM manipulation by calculating the difference between the current and new virtual DOM, then updating only the changed parts in the real DOM."}
]

Now generate 5 high-quality interview questions with detailed answers:`;
        
        // ===== GROQ API CALL =====
        
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
                stream: false,
                stop: null
            });
        } catch (apiError) {
            // Handle API-specific errors
            if (apiError.status === 401 || apiError.error?.error?.code === 'invalid_api_key') {
                return res.status(500).json({
                    message: "AI service authentication failed. Invalid or expired API key",
                    success: false,
                    error: "Invalid API key",
                    hint: "Please verify GROQ_API in your .env file. Get a new key from https://console.groq.com/keys",
                    troubleshooting: {
                        step1: "Go to https://console.groq.com/keys",
                        step2: "Create a new API key",
                        step3: "Update GROQ_API in your .env file",
                        step4: "Restart the server"
                    }
                });
            }

            if (apiError.status === 429) {
                return res.status(429).json({
                    message: "AI service rate limit exceeded. Please try again in a moment",
                    success: false,
                    error: "Rate limit exceeded"
                });
            }

            if (apiError.status === 503 || apiError.status === 502) {
                return res.status(503).json({
                    message: "AI service is temporarily unavailable. Please try again later",
                    success: false,
                    error: "Service unavailable"
                });
            }

            return res.status(503).json({
                message: "Failed to connect to AI service. Please try again later",
                success: false,
                error: apiError.message
            });
        }

        // ===== RESPONSE PARSING =====
        
        let rawText = completion.choices[0]?.message?.content;

        if (!rawText) {
            return res.status(500).json({
                message: "Failed to generate questions from AI - empty response",
                success: false
            });
        }

        // Clean markdown formatting
        rawText = rawText.replace(/```json|```/gi, "").trim();
        
        // Extract JSON array
        const match = rawText.match(/\[([\s\S]*?)\]/);
        if (match) {
            rawText = match[0];
        } else {
            return res.status(500).json({
                message: "AI response did not contain a valid JSON array",
                success: false
            });
        }

        // Parse JSON
        let data;
        try {
            data = JSON.parse(rawText);
        } catch (err) {
            return res.status(500).json({
                message: "Invalid response format from AI model - could not parse JSON",
                error: err.message,
                success: false
            });
        }

        // ===== RESPONSE VALIDATION =====
        
        // Check it's an array
        if (!Array.isArray(data)) {
            return res.status(500).json({
                message: "AI did not return a valid array",
                success: false
            });
        }

        // Check array not empty
        if (data.length === 0) {
            return res.status(500).json({
                message: "AI returned an empty array",
                success: false
            });
        }

        // Filter valid questions
        const validQuestions = data.filter(q => {
            return q && 
                   typeof q === 'object' && 
                   q.question && 
                   typeof q.question === 'string' && 
                   q.question.trim() !== '' &&
                   q.answer && 
                   typeof q.answer === 'string' && 
                   q.answer.trim() !== '';
        });
        
        if (validQuestions.length === 0) {
            return res.status(500).json({
                message: "No valid questions generated - all questions missing required fields",
                success: false
            });
        }

        // ===== DATABASE OPERATIONS =====
        
        // Create questions in database
        let createdQuestions;
        try {
            createdQuestions = await Question.insertMany(
                validQuestions.map(q => ({
                    session: sessionId,
                    question: q.question.trim(),
                    answer: q.answer.trim(),
                    isPinned: false
                })),
                { ordered: false }
            );
        } catch (dbError) {
            // Handle partial inserts
            if (dbError.insertedDocs && dbError.insertedDocs.length > 0) {
                createdQuestions = dbError.insertedDocs;
            } else {
                return res.status(500).json({
                    message: "Failed to save questions to database",
                    error: dbError.message,
                    success: false
                });
            }
        }

        // Update session with question IDs
        try {
            session.questions.push(...createdQuestions.map(q => q._id));
            await session.save();
        } catch (saveError) {
            console.error('Error updating session:', saveError);
            // Non-critical error, continue
        }

        // ===== SUCCESS RESPONSE =====
        
        return res.status(201).json({
            message: "Questions generated successfully",
            success: true,
            count: createdQuestions.length,
            aiModel: "llama-3.1-8b-instant",
            provider: "Groq",
            tokensUsed: completion.usage?.total_tokens || 0,
            questions: createdQuestions
        });

    } catch (error) {
        console.error('Error in generateInterviewQuestion:', error);
        return res.status(500).json({
            message: "Error generating interview questions",
            error: error.message,
            success: false
        });
    }
};

/**
 * Regenerate a single question using AI
 * @route POST /api/questions/:id/regenerate
 * @access Private
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

        // ===== VALIDATION =====
        
        if (!mongoose.Types.ObjectId.isValid(id)) {
            return res.status(400).json({
                message: "Invalid question ID format",
                success: false
            });
        }

        // ===== DATABASE CHECK =====
        
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

        // Check session exists
        if (!question.session) {
            return res.status(404).json({
                message: "Session associated with this question not found",
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

        // ===== PREPARE AI PROMPT =====
        
        const { role, experience, topicsToFocus } = question.session;
        
        // Validate session has required fields
        if (!role || !experience || !topicsToFocus) {
            return res.status(400).json({
                message: "Session is missing required fields (role, experience, or topicsToFocus)",
                success: false
            });
        }

        // Safely handle topicsToFocus (might not be array in old sessions)
        const topicsArray = Array.isArray(topicsToFocus) ? topicsToFocus : [String(topicsToFocus)];
        const topicsString = topicsArray.map(t => String(t).trim()).join(', ');

        // Use ARRAY format (same as generateInterviewQuestion - proven to work)
        const prompt = `You are an expert interview question generator.
Generate exactly 1 interview question for the following role and experience level.

Role: ${role}
Experience Level: ${experience}
Topics to Focus: ${topicsString}

IMPORTANT: Return ONLY a valid JSON array with no additional text, explanations, or markdown formatting.
Each object must have "question" and "answer" fields.

Example format:
[
  {"question": "What is Express.js?", "answer": "Express.js is a minimal and flexible Node.js web application framework."}
]

Generate 1 high-quality interview question with a detailed answer:`;

        // ===== GROQ API CALL =====
        
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

        // ===== RESPONSE PARSING (SAME AS GENERATE) =====
        
        let rawText = completion.choices[0]?.message?.content;

        if (!rawText) {
            return res.status(500).json({
                message: "Failed to generate question from AI",
                success: false
            });
        }

        // Clean response
        rawText = rawText.replace(/```json|```/gi, "").trim();
        
        // Extract JSON array
        const arrayMatch = rawText.match(/\[[\s\S]*\]/);
        if (arrayMatch) {
            rawText = arrayMatch[0];
        } else {
            return res.status(500).json({
                message: "AI response did not contain a valid JSON array",
                success: false
            });
        }

        // Parse JSON
        let questionsData;
        try {
            questionsData = JSON.parse(rawText);
        } catch (err) {
            return res.status(500).json({
                message: "Invalid response format from AI model",
                error: err.message,
                success: false
            });
        }

        // ===== VALIDATION =====
        
        if (!Array.isArray(questionsData) || questionsData.length === 0) {
            return res.status(500).json({
                message: "AI did not return valid question",
                success: false
            });
        }

        const data = questionsData[0]; // Get first question

        if (!data || !data.question || !data.answer) {
            return res.status(500).json({
                message: "AI did not return valid question and answer",
                success: false
            });
        }

        // ===== UPDATE DATABASE =====
        
        question.question = data.question.trim();
        question.answer = data.answer.trim();
        await question.save();

        // ===== SUCCESS RESPONSE =====
        
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
 * @access Private
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

        // Get questions sorted by creation date
        const questions = await Question.find({ session: sessionId })
            .sort({ createdAt: 1 })
            .lean();

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
 * @access Private
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

        // Find question with session details
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
        if (!question.session || question.session.user.toString() !== req.id) {
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
 * Search questions across all user sessions
 * @route GET /api/questions/search
 * @access Private
 */
export const searchQuestions = async (req, res) => {
    try {
        const { q, limit = 20 } = req.query;

        // Validation
        if (!q || q.trim().length === 0) {
            return res.status(400).json({
                message: "Please provide a search query (q parameter)",
                success: false
            });
        }

        // Find user's sessions
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

        // Search in question and answer fields
        const questions = await Question.find({
            session: { $in: sessionIds },
            $or: [
                { question: { $regex: q.trim(), $options: 'i' } },
                { answer: { $regex: q.trim(), $options: 'i' } }
            ]
        })
        .populate({
            path: 'session',
            select: 'role experience topicsToFocus'
        })
        .limit(parseInt(limit))
        .sort({ createdAt: -1 })
        .lean();

        return res.status(200).json({
            message: "Search completed successfully",
            success: true,
            count: questions.length,
            searchQuery: q,
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
 * @access Private
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

        // Get pinned questions only
        const questions = await Question.find({ 
            session: sessionId,
            isPinned: true 
        })
        .sort({ createdAt: -1 })
        .lean();

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
 * @access Private
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
 * @access Private
 */
export const addCustomQuestion = async (req, res) => {
    try {
        const { sessionId, question, answer } = req.body;

        // ===== VALIDATION =====
        
        if (!sessionId || !question || !answer) {
            return res.status(400).json({
                message: "Please provide sessionId, question, and answer",
                success: false,
                missingFields: {
                    sessionId: !sessionId,
                    question: !question,
                    answer: !answer
                }
            });
        }

        if (typeof question !== 'string' || question.trim().length === 0) {
            return res.status(400).json({
                message: "Question must be a non-empty string",
                success: false
            });
        }

        if (typeof answer !== 'string' || answer.trim().length === 0) {
            return res.status(400).json({
                message: "Answer must be a non-empty string",
                success: false
            });
        }

        if (!mongoose.Types.ObjectId.isValid(sessionId)) {
            return res.status(400).json({
                message: "Invalid session ID format",
                success: false
            });
        }

        // ===== DATABASE CHECKS =====
        
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
                success: false,
                currentCount: session.questions.length
            });
        }

        // ===== CREATE QUESTION =====
        
        const newQuestion = await Question.create({
            session: sessionId,
            question: question.trim(),
            answer: answer.trim(),
            isPinned: false
        });

        // Update session
        session.questions.push(newQuestion._id);
        await session.save();

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

/* ✅
 * Update a question
 * @route PUT /api/questions/:id
 * @access Private
 */
export const updateQuestion = async (req, res) => {
    try {
        const { id } = req.params;
        const { question, answer } = req.body;

        // ===== VALIDATION =====
        
        if (!mongoose.Types.ObjectId.isValid(id)) {
            return res.status(400).json({
                message: "Invalid question ID format",
                success: false
            });
        }

        if (!question && !answer) {
            return res.status(400).json({
                message: "Please provide at least one field to update (question or answer)",
                success: false
            });
        }

        if (question && (typeof question !== 'string' || question.trim().length === 0)) {
            return res.status(400).json({
                message: "Question must be a non-empty string",
                success: false
            });
        }

        if (answer && (typeof answer !== 'string' || answer.trim().length === 0)) {
            return res.status(400).json({
                message: "Answer must be a non-empty string",
                success: false
            });
        }

        // ===== DATABASE CHECK =====
        
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

        if (!existingQuestion.session || existingQuestion.session.user.toString() !== req.id) {
            return res.status(403).json({
                message: "You don't have permission to update this question",
                success: false
            });
        }

        // ===== UPDATE =====
        
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

/* ✅
 * Toggle pin status of a question
 * @route PATCH /api/questions/:id/toggle-pin
 * @access Private
 */
export const togglePinQuestion = async (req, res) => {
    try {
        const { id } = req.params;

        // ===== VALIDATION =====
        
        if (!mongoose.Types.ObjectId.isValid(id)) {
            return res.status(400).json({
                message: "Invalid question ID format",
                success: false
            });
        }

        // ===== DATABASE CHECK =====
        
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

        if (!question.session) {
            return res.status(404).json({
                message: "Session associated with this question not found",
                success: false
            });
        }

        if (question.session.user.toString() !== req.id) {
            return res.status(403).json({
                message: "You don't have permission to modify this question",
                success: false
            });
        }

        // ===== TOGGLE PIN =====
        
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

/* ✅
 * Delete a question
 * @route DELETE /api/questions/:id
 * @access Private
 */
export const deleteQuestion = async (req, res) => {
    try {
        const { id } = req.params;

        // ===== VALIDATION =====
        
        if (!mongoose.Types.ObjectId.isValid(id)) {
            return res.status(400).json({
                message: "Invalid question ID format",
                success: false
            });
        }

        // ===== DATABASE CHECK =====
        
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

        if (!question.session || question.session.user.toString() !== req.id) {
            return res.status(403).json({
                message: "You don't have permission to delete this question",
                success: false
            });
        }

        // ===== DELETE =====
        
        // Remove from session
        await Session.findByIdAndUpdate(
            question.session._id,
            { $pull: { questions: id } }
        );

        // Delete question
        await Question.findByIdAndDelete(id);

        return res.status(200).json({
            message: "Question deleted successfully",
            success: true,
            deletedQuestionId: id
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