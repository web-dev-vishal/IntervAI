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
 * @desc    Generate interview questions using AI
 * @access  Private
 * @body    { role, experience, topicsToFocus, sessionId }
 */
questionRoute.post('/generate', AuthMiddleware, generateInterviewQuestion);

/**
 * @route   POST /api/questions/:id/regenerate
 * @desc    Regenerate a single question using AI
 * @access  Private
 */
questionRoute.post('/:id/regenerate', AuthMiddleware, regenerateQuestion);

// ============================================
// CRUD ROUTES
// ============================================

/**
 * @route   GET /api/questions/session/:sessionId
 * @desc    Get all questions for a specific session
 * @access  Private
 * @query   ?isPinned=true&search=react&sortBy=createdAt&order=desc
 */
questionRoute.get('/session/:sessionId', AuthMiddleware, getQuestionsBySession);

/**
 * @route   GET /api/questions/:id
 * @desc    Get a single question by ID
 * @access  Private
 */
questionRoute.get('/:id', AuthMiddleware, getQuestionById);

/**
 * @route   POST /api/questions/custom
 * @desc    Add a custom question manually (without AI)
 * @access  Private
 * @body    { sessionId, question, answer }
 */
questionRoute.post('/custom', AuthMiddleware, addCustomQuestion);

/**
 * @route   PUT /api/questions/:id
 * @desc    Update a question
 * @access  Private
 * @body    { question?, answer? }
 */
questionRoute.put('/:id', AuthMiddleware, updateQuestion);

/**
 * @route   DELETE /api/questions/:id
 * @desc    Delete a single question
 * @access  Private
 */
questionRoute.delete('/:id', AuthMiddleware, deleteQuestion);

/**
 * @route   DELETE /api/questions/bulk
 * @desc    Delete multiple questions
 * @access  Private
 * @body    { questionIds: [] }
 */
questionRoute.delete('/bulk/delete', AuthMiddleware, bulkDeleteQuestions);

// ============================================
// PIN MANAGEMENT ROUTES
// ============================================

/**
 * @route   PATCH /api/questions/:id/toggle-pin
 * @desc    Toggle pin status of a question
 * @access  Private
 */
questionRoute.patch('/:id/toggle-pin', AuthMiddleware, togglePinQuestion);

/**
 * @route   GET /api/questions/session/:sessionId/pinned
 * @desc    Get only pinned questions for a session
 * @access  Private
 */
questionRoute.get('/session/:sessionId/pinned', AuthMiddleware, getPinnedQuestions);

// ============================================
// ANALYTICS & UTILITY ROUTES
// ============================================

/**
 * @route   GET /api/questions/session/:sessionId/stats
 * @desc    Get question statistics for a session
 * @access  Private
 */
questionRoute.get('/session/:sessionId/stats', AuthMiddleware, getQuestionStats);

/**
 * @route   GET /api/questions/search
 * @desc    Search questions across all user sessions
 * @access  Private
 * @query   ?q=searchTerm&limit=20
 */
questionRoute.get('/search/all', AuthMiddleware, searchQuestions);

export default questionRoute;