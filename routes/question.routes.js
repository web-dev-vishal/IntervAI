import express from "express";
import { 
    generateInterviewQuestion,
    regenerateQuestion,
    getQuestionsBySession,
    getQuestionById,
    addCustomQuestion,
    updateQuestion,
    deleteQuestion,
    togglePinQuestion,
    getPinnedQuestions,
    getQuestionStats,
    searchQuestions
} from "../controllers/questionController.js";
import { AuthMiddleware } from "../middlewares/auth.middleware.js";

const questionRoute = express.Router();

// ============================================
// AI GENERATION ROUTES
// ============================================

/**
 * @route   POST /api/questions/generate
 * @desc    Generate 5 interview questions using AI (Groq)
 * @access  Private
 * @body    { role: string, experience: string, topicsToFocus: string[], sessionId: ObjectId }
 */
questionRoute.post('/generate', AuthMiddleware, generateInterviewQuestion);

/**
 * @route   POST /api/questions/:id/regenerate
 * @desc    Regenerate a single question using AI
 * @access  Private
 */
questionRoute.post('/:id/regenerate', AuthMiddleware, regenerateQuestion);

// ============================================
// SEARCH & QUERY ROUTES (MUST BE BEFORE :id ROUTES)
// ============================================

/**
 * @route   GET /api/questions/search
 * @desc    Search questions across all user sessions
 * @access  Private
 * @query   ?q=searchTerm&limit=20
 */
questionRoute.get('/search', AuthMiddleware, searchQuestions);

/**
 * @route   GET /api/questions/session/:sessionId/stats
 * @desc    Get question statistics for a session
 * @access  Private
 */
questionRoute.get('/session/:sessionId/stats', AuthMiddleware, getQuestionStats);

/**
 * @route   GET /api/questions/session/:sessionId/pinned
 * @desc    Get only pinned questions for a session
 * @access  Private
 */
questionRoute.get('/session/:sessionId/pinned', AuthMiddleware, getPinnedQuestions);

/**
 * @route   GET /api/questions/session/:sessionId
 * @desc    Get all questions for a specific session
 * @access  Private
 */
questionRoute.get('/session/:sessionId', AuthMiddleware, getQuestionsBySession);

/**
 * @route   GET /api/questions/:id
 * @desc    Get a single question by ID
 * @access  Private
 */
questionRoute.get('/:id', AuthMiddleware, getQuestionById);

// ============================================
// CREATE ROUTES
// ============================================

/**
 * @route   POST /api/questions/custom
 * @desc    Add a custom question manually (without AI)
 * @access  Private
 * @body    { sessionId: ObjectId, question: string, answer: string }
 */
questionRoute.post('/custom', AuthMiddleware, addCustomQuestion);

// ============================================
// UPDATE ROUTES
// ============================================

/**
 * @route   PUT /api/questions/:id
 * @desc    Update a question's content
 * @access  Private
 * @body    { question?: string, answer?: string }
 */
questionRoute.put('/:id', AuthMiddleware, updateQuestion);

/**
 * @route   PATCH /api/questions/:id/toggle-pin
 * @desc    Toggle pin status of a question
 * @access  Private
 */
questionRoute.patch('/:id/toggle-pin', AuthMiddleware, togglePinQuestion);

// ============================================
// DELETE ROUTES
// ============================================

/**
 * @route   DELETE /api/questions/:id
 * @desc    Delete a single question
 * @access  Private
 */
questionRoute.delete('/:id', AuthMiddleware, deleteQuestion);

export default questionRoute;