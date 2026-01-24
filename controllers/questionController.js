import Groq from "groq-sdk";
import { Session } from "../models/session.model.js";
import { Question } from "../models/question.model.js";
import mongoose from "mongoose";

// Singleton instance for Groq client
let groqInstance = null;

/**
 * Get or create Groq client instance
 * @returns {Groq|null} Groq client instance or null if API key is invalid
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

/**
 * Generate interview questions using Groq AI
 * @route POST /api/questions/generate
 * @access Private (requires authentication)
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

        // Validation - all fields required
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

        // Validate role and experience are non-empty strings
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

        // Validate topicsToFocus is array and not empty
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

        // Validate sessionId is a valid MongoDB ObjectId
        if (!mongoose.Types.ObjectId.isValid(sessionId)) {
            return res.status(400).json({
                message: "Invalid session ID format",
                success: false
            });
        }

        // Check if session exists
        const session = await Session.findById(sessionId);
        if (!session) {
            return res.status(404).json({
                message: "Session not found",
                success: false
            });
        }

        // Authorization check - ensure session belongs to logged-in user
        if (session.user.toString() !== req.id) {
            return res.status(403).json({
                message: "You don't have permission to generate questions for this session",
                success: false
            });
        }

        // Check if session already has questions (prevent duplicates)
        if (session.questions && session.questions.length >= 50) {
            return res.status(400).json({
                message: "Session has reached maximum number of questions (50)",
                success: false,
                currentCount: session.questions.length
            });
        }

        // Create prompt for Groq
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
        
        // Call Groq API with error handling
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
            // Handle specific error types
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

        // Get response text
        let rawText = completion.choices[0]?.message?.content;

        if (!rawText) {
            return res.status(500).json({
                message: "Failed to generate questions from AI - empty response",
                success: false
            });
        }

        // Clean the response - remove markdown code blocks and extra whitespace
        rawText = rawText.replace(/```json|```/gi, "").trim();
        
        // Extract JSON array from text
        const match = rawText.match(/\[([\s\S]*?)\]/);
        if (match) {
            rawText = match[0];
        } else {
            return res.status(500).json({
                message: "AI response did not contain a valid JSON array",
                success: false
            });
        }

        // Parse JSON with error handling
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

        // Validate parsed data is an array
        if (!Array.isArray(data)) {
            return res.status(500).json({
                message: "AI did not return a valid array",
                success: false
            });
        }

        // Validate data is not empty
        if (data.length === 0) {
            return res.status(500).json({
                message: "AI returned an empty array",
                success: false
            });
        }

        // Validate each question has required fields
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

        // Update session with question references
        try {
            session.questions.push(...createdQuestions.map(q => q._id));
            await session.save();
        } catch (saveError) {
            console.error('Error updating session:', saveError);
        }

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
 * Get all questions for a specific session
 * @route GET /api/questions/session/:sessionId
 * @access Private (requires authentication)
 */
export const getQuestionsBySession = async (req, res) => {
    try {
        const { sessionId } = req.params;
        const { isPinned, search, sortBy = 'createdAt', order = 'desc' } = req.query;

        // Validate sessionId
        if (!mongoose.Types.ObjectId.isValid(sessionId)) {
            return res.status(400).json({
                message: "Invalid session ID format",
                success: false
            });
        }

        // Check if session exists and belongs to user
        const session = await Session.findById(sessionId);
        if (!session) {
            return res.status(404).json({
                message: "Session not found",
                success: false
            });
        }

        // Authorization check
        if (session.user.toString() !== req.id) {
            return res.status(403).json({
                message: "You don't have permission to access these questions",
                success: false
            });
        }

        // Build query
        const query = { session: sessionId };

        // Filter by pinned status if provided
        if (isPinned !== undefined) {
            query.isPinned = isPinned === 'true';
        }

        // Search in question and answer fields
        if (search && search.trim() !== '') {
            query.$or = [
                { question: { $regex: search.trim(), $options: 'i' } },
                { answer: { $regex: search.trim(), $options: 'i' } }
            ];
        }

        // Build sort object
        const sortOrder = order === 'asc' ? 1 : -1;
        const sortObject = {};
        sortObject[sortBy] = sortOrder;

        // Fetch questions
        const questions = await Question.find(query)
            .sort(sortObject)
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
 * Get a single question by ID
 * @route GET /api/questions/:id
 * @access Private (requires authentication)
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

        // Find question and populate session
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
                message: "You don't have permission to access this question",
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
 * Add a custom question manually (without AI)
 * @route POST /api/questions/custom
 * @access Private (requires authentication)
 */
export const addCustomQuestion = async (req, res) => {
    try {
        const { sessionId, question, answer } = req.body;

        // Validation
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

        // Validate types
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

        // Validate sessionId
        if (!mongoose.Types.ObjectId.isValid(sessionId)) {
            return res.status(400).json({
                message: "Invalid session ID format",
                success: false
            });
        }

        // Check if session exists
        const session = await Session.findById(sessionId);
        if (!session) {
            return res.status(404).json({
                message: "Session not found",
                success: false
            });
        }

        // Authorization check
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

        // Create question
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

/**
 * Update a question
 * @route PUT /api/questions/:id
 * @access Private (requires authentication)
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

        // Validate at least one field to update
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

        // Build update object
        const updateData = {};
        if (question && typeof question === 'string' && question.trim().length > 0) {
            updateData.question = question.trim();
        }
        if (answer && typeof answer === 'string' && answer.trim().length > 0) {
            updateData.answer = answer.trim();
        }

        // Update question
        const updatedQuestion = await Question.findByIdAndUpdate(
            id,
            updateData,
            { new: true, runValidators: true }
        );

        return res.status(200).json({
            message: "Question updated successfully",
            success: true,
            question: updatedQuestion
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
 * Delete multiple questions (bulk delete)
 * @route DELETE /api/questions/bulk
 * @access Private (requires authentication)
 */
export const bulkDeleteQuestions = async (req, res) => {
    try {
        const { questionIds } = req.body;

        // Validation
        if (!questionIds || !Array.isArray(questionIds) || questionIds.length === 0) {
            return res.status(400).json({
                message: "Please provide an array of question IDs to delete",
                success: false
            });
        }

        // Validate all IDs
        const invalidIds = questionIds.filter(id => !mongoose.Types.ObjectId.isValid(id));
        if (invalidIds.length > 0) {
            return res.status(400).json({
                message: "One or more question IDs are invalid",
                success: false,
                invalidIds
            });
        }

        // Find all questions with authorization check
        const questions = await Question.find({
            _id: { $in: questionIds }
        }).populate({
            path: 'session',
            select: 'user'
        });

        if (questions.length === 0) {
            return res.status(404).json({
                message: "No questions found with provided IDs",
                success: false
            });
        }

        // Check authorization for all questions
        const unauthorized = questions.filter(q => q.session.user.toString() !== req.id);
        if (unauthorized.length > 0) {
            return res.status(403).json({
                message: "You don't have permission to delete one or more questions",
                success: false,
                unauthorizedCount: unauthorized.length
            });
        }

        // Group questions by session for efficient update
        const sessionMap = {};
        questions.forEach(q => {
            const sessionId = q.session._id.toString();
            if (!sessionMap[sessionId]) {
                sessionMap[sessionId] = [];
            }
            sessionMap[sessionId].push(q._id);
        });

        // Remove question references from sessions
        for (const sessionId in sessionMap) {
            await Session.findByIdAndUpdate(
                sessionId,
                { $pull: { questions: { $in: sessionMap[sessionId] } } }
            );
        }

        // Delete all questions
        const deleteResult = await Question.deleteMany({
            _id: { $in: questionIds }
        });

        return res.status(200).json({
            message: "Questions deleted successfully",
            success: true,
            deletedCount: deleteResult.deletedCount
        });

    } catch (error) {
        console.error('Error in bulkDeleteQuestions:', error);
        return res.status(500).json({
            message: "Error deleting questions",
            error: error.message,
            success: false
        });
    }
};

/**
 * Toggle pin status of a question
 * @route PATCH /api/questions/:id/toggle-pin
 * @access Private (requires authentication)
 */
export const togglePinQuestion = async (req, res) => {
    try {
        const questionId = req.params.id;

        // Validate questionId format
        if (!mongoose.Types.ObjectId.isValid(questionId)) {
            return res.status(400).json({
                message: "Invalid question ID format",
                success: false
            });
        }

        // Find question and populate session with user field
        const question = await Question.findById(questionId).populate({
            path: 'session',
            select: 'user'
        });

        if (!question) {
            return res.status(404).json({
                message: "Question not found",
                success: false
            });
        }

        // Check if session exists
        if (!question.session) {
            return res.status(404).json({
                message: "Session associated with this question not found",
                success: false
            });
        }

        // Authorization check
        if (question.session.user.toString() !== req.id) {
            return res.status(403).json({
                message: "You don't have permission to modify this question",
                success: false
            });
        }

        // Toggle pin status and update directly
        const updatedQuestion = await Question.findByIdAndUpdate(
            questionId,
            { isPinned: !question.isPinned },
            { new: true, runValidators: true }
        );

        if (!updatedQuestion) {
            return res.status(500).json({
                message: "Failed to update question",
                success: false
            });
        }

        return res.status(200).json({
            message: `Question ${updatedQuestion.isPinned ? 'pinned' : 'unpinned'} successfully`,
            success: true,
            isPinned: updatedQuestion.isPinned,
            questionId: updatedQuestion._id
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

/**
 * Get pinned questions for a session
 * @route GET /api/questions/session/:sessionId/pinned
 * @access Private (requires authentication)
 */
export const getPinnedQuestions = async (req, res) => {
    try {
        const { sessionId } = req.params;

        // Validate sessionId
        if (!mongoose.Types.ObjectId.isValid(sessionId)) {
            return res.status(400).json({
                message: "Invalid session ID format",
                success: false
            });
        }

        // Check if session exists and belongs to user
        const session = await Session.findById(sessionId);
        if (!session) {
            return res.status(404).json({
                message: "Session not found",
                success: false
            });
        }

        // Authorization check
        if (session.user.toString() !== req.id) {
            return res.status(403).json({
                message: "You don't have permission to access these questions",
                success: false
            });
        }

        // Fetch pinned questions
        const pinnedQuestions = await Question.find({
            session: sessionId,
            isPinned: true
        }).sort({ createdAt: -1 });

        return res.status(200).json({
            message: "Pinned questions retrieved successfully",
            success: true,
            count: pinnedQuestions.length,
            questions: pinnedQuestions
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
 * @access Private (requires authentication)
 */
export const getQuestionStats = async (req, res) => {
    try {
        const { sessionId } = req.params;

        // Validate sessionId
        if (!mongoose.Types.ObjectId.isValid(sessionId)) {
            return res.status(400).json({
                message: "Invalid session ID format",
                success: false
            });
        }

        // Check if session exists and belongs to user
        const session = await Session.findById(sessionId);
        if (!session) {
            return res.status(404).json({
                message: "Session not found",
                success: false
            });
        }

        // Authorization check
        if (session.user.toString() !== req.id) {
            return res.status(403).json({
                message: "You don't have permission to access these statistics",
                success: false
            });
        }

        // Get statistics using aggregation
        const stats = await Question.aggregate([
            {
                $match: { session: new mongoose.Types.ObjectId(sessionId) }
            },
            {
                $group: {
                    _id: null,
                    totalQuestions: { $sum: 1 },
                    pinnedCount: {
                        $sum: { $cond: [{ $eq: ['$isPinned', true] }, 1, 0] }
                    },
                    unpinnedCount: {
                        $sum: { $cond: [{ $eq: ['$isPinned', false] }, 1, 0] }
                    }
                }
            }
        ]);

        const statistics = stats.length > 0 ? stats[0] : {
            totalQuestions: 0,
            pinnedCount: 0,
            unpinnedCount: 0
        };

        // Remove _id field
        delete statistics._id;

        return res.status(200).json({
            message: "Question statistics retrieved successfully",
            success: true,
            stats: statistics
        });

    } catch (error) {
        console.error('Error in getQuestionStats:', error);
        return res.status(500).json({
            message: "Error retrieving question statistics",
            error: error.message,
            success: false
        });
    }
};

/**
 * Regenerate a single question using AI
 * @route POST /api/questions/:id/regenerate
 * @access Private (requires authentication)
 */
export const regenerateQuestion = async (req, res) => {
    try {
        const groq = getGroqClient();
        
        if (!groq) {
            return res.status(500).json({
                message: "AI service is not configured. Please add GROQ_API to your .env file",
                success: false,
                hint: "Add GROQ_API=gsk_... to your .env file and restart the server"
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
        if (question.session.user.toString() !== req.id) {
            return res.status(403).json({
                message: "You don't have permission to regenerate this question",
                success: false
            });
        }

        // Get session details
        const { role, experience, topicsToFocus } = question.session;
        const topicsString = topicsToFocus.map(t => t.trim()).join(', ');

        const prompt = `You are an expert interview question generator.
Generate exactly 1 interview question for the following role and experience level.

Role: ${role}
Experience Level: ${experience}
Topics to Focus: ${topicsString}

IMPORTANT: Return ONLY a valid JSON object with no additional text, explanations, or markdown formatting.
The object must have "question" and "answer" fields.

Example format:
{"question": "What is React and why is it used?", "answer": "React is a JavaScript library for building user interfaces, particularly single-page applications. It's used because it allows developers to create reusable UI components and efficiently update the DOM."}

Now generate 1 high-quality interview question with a detailed answer:`;

        // Call Groq API
        let completion;
        try {
            completion = await groq.chat.completions.create({
                model: "llama-3.1-8b-instant",
                messages: [
                    {
                        role: "system",
                        content: "You are an expert technical interviewer. Generate only valid JSON with no additional formatting or text."
                    },
                    {
                        role: "user",
                        content: prompt
                    }
                ],
                temperature: 0.8,
                max_tokens: 1000,
                top_p: 1,
                stream: false,
                stop: null
            });
        } catch (apiError) {
            if (apiError.status === 401 || apiError.error?.error?.code === 'invalid_api_key') {
                return res.status(500).json({
                    message: "AI service authentication failed",
                    success: false,
                    error: "Invalid API key"
                });
            }

            if (apiError.status === 429) {
                return res.status(429).json({
                    message: "AI service rate limit exceeded",
                    success: false,
                    error: "Rate limit exceeded"
                });
            }

            return res.status(503).json({
                message: "Failed to connect to AI service",
                success: false,
                error: apiError.message
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
        
        // Extract JSON object
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
                error: err.message,
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
            aiModel: "llama-3.1-8b-instant",
            provider: "Groq",
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

/**
 * Search questions across all sessions for a user
 * @route GET /api/questions/search
 * @access Private (requires authentication)
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

        // Find all sessions for the user
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

        // Search in questions
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