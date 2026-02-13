// ============================================
// routes/bulk.routes.js - Bulk Operations
// ============================================
import express from 'express';
import { AuthMiddleware } from '../middlewares/auth.middleware.js';
import {
    bulkDeleteQuestions,
    bulkUpdateDifficulty,
    bulkTogglePin
} from '../controllers/bulkController.js';

const router = express.Router();

// Bulk delete multiple questions
router.post('/delete', AuthMiddleware, bulkDeleteQuestions);

// Bulk update difficulty for multiple questions
router.post('/difficulty', AuthMiddleware, bulkUpdateDifficulty);

// Bulk pin/unpin multiple questions
router.post('/toggle-pin', AuthMiddleware, bulkTogglePin);

export default router;
