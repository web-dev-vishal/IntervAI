// ============================================
// routes/analytics.routes.js
// ============================================
import express from 'express';
import { AuthMiddleware } from '../middlewares/auth.middleware.js';
import {
    getUserAnalytics,
    getSessionAnalytics,
    getTrendingTopics
} from '../controllers/analyticsController.js';

const router = express.Router();

// Get user analytics and statistics
router.get('/user', AuthMiddleware, getUserAnalytics);

// Get session-specific analytics
router.get('/session/:sessionId', AuthMiddleware, getSessionAnalytics);

// Get trending topics across platform
router.get('/trending', getTrendingTopics);

export default router;
