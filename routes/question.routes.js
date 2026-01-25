//import express
import express from "express";

// import middleware
import { AuthMiddleware } from "../middlewares/auth.middleware.js";

// import ratelimiter
import { questionGenerationLimiter, togglePinLimiter } from "../middlewares/rateLimiter.js";

//import controller
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

// adding routes
const router = express.Router();

// Generate 5 interview questions from AI
router.post('/generate', AuthMiddleware, questionGenerationLimiter, generateInterviewQuestion);

// ReGenerate interview questions from AI
router.post('/:id/regenerate', AuthMiddleware, questionGenerationLimiter, regenerateQuestion);

/*
All are Get routes 
Get all questions for a session
 */
router.get('/session/:sessionId', AuthMiddleware, getQuestionsBySession);

// Get pinned questions for a session
router.get('/session/:sessionId/pinned', AuthMiddleware, getPinnedQuestions);

// Get question statistics for a sessionId
router.get('/session/:sessionId/stats', AuthMiddleware, getQuestionStats);

// Search questions across all user sessions
// searchQuery with Term&limit of 20
router.get('/search', AuthMiddleware, searchQuestions);

// Get single question by ID
router.get('/:id', AuthMiddleware, getQuestionById);

// Add custom question manually (without AI)
router.post('/custom', AuthMiddleware, addCustomQuestion);

// Update a question with Id
router.put('/:id', AuthMiddleware, updateQuestion);

// Toggle pin status of a question
router.patch('/:id/toggle-pin', AuthMiddleware, togglePinLimiter, togglePinQuestion);

// Delete (Single) a question with Id
router.delete('/:id', AuthMiddleware, deleteQuestion);

//exporting routes
export default router;