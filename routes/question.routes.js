import express from "express";
import { 
    generateInterviewQuestion,
    regenerateQuestion,
    getQuestionsBySession,
    getQuestionById,
    searchQuestions,
    getPinnedQuestions,
    getQuestionStats,
    addCustomQuestion,
    updateQuestion,
    togglePinQuestion,
    deleteQuestion
} from "../controllers/questionController.js";
import { AuthMiddleware } from "../middlewares/auth.middleware.js";

const questionRoute = express.Router();

/**
 * Generate 5 interview questions using AI
 * POST /api/questions/generate
 * Body: { role, experience, topicsToFocus, sessionId }
 */
questionRoute.post('/generate', AuthMiddleware, generateInterviewQuestion);

/**
 * Regenerate a single question using AI
 * POST /api/questions/:id/regenerate
 * Params: id (question ID)
 */
questionRoute.post('/:id/regenerate', AuthMiddleware, regenerateQuestion);

// ============================================
// QUERY ROUTES (GET)
// ============================================

/**
 * Get all questions for a session
 * GET /api/questions/session/:sessionId
 * Params: sessionId
 */
questionRoute.get('/session/:sessionId', AuthMiddleware, getQuestionsBySession);

/**
 * Get pinned questions for a session
 * GET /api/questions/session/:sessionId/pinned
 * Params: sessionId
 */
questionRoute.get('/session/:sessionId/pinned', AuthMiddleware, getPinnedQuestions);

/**
 * Get question statistics for a session
 * GET /api/questions/session/:sessionId/stats
 * Params: sessionId
 */
questionRoute.get('/session/:sessionId/stats', AuthMiddleware, getQuestionStats);

/**
 * Search questions across all user sessions
 * GET /api/questions/search
 * Query: ?q=searchTerm&limit=20
 */
questionRoute.get('/search', AuthMiddleware, searchQuestions);

/**
 * Get single question by ID
 * GET /api/questions/:id
 * Params: id (question ID)
 */
questionRoute.get('/:id', AuthMiddleware, getQuestionById);

// ============================================
// CREATE ROUTES (POST)
// ============================================

/**
 * Add custom question manually (without AI)
 * POST /api/questions/custom
 * Body: { sessionId, question, answer }
 */
questionRoute.post('/custom', AuthMiddleware, addCustomQuestion);

// ============================================
// UPDATE ROUTES (PUT/PATCH)
// ============================================

/**
 * Update a question
 * PUT /api/questions/:id
 * Params: id (question ID)
 * Body: { question?, answer? }
 */
questionRoute.put('/:id', AuthMiddleware, updateQuestion);

/**
 * Toggle pin status of a question
 * PATCH /api/questions/:id/toggle-pin
 * Params: id (question ID)
 */
questionRoute.patch('/:id/toggle-pin', AuthMiddleware, togglePinQuestion);

// ============================================
// DELETE ROUTES (DELETE)
// ============================================

/**
 * Delete a question
 * DELETE /api/questions/:id
 * Params: id (question ID)
 */
questionRoute.delete('/:id', AuthMiddleware, deleteQuestion);

export default questionRoute;