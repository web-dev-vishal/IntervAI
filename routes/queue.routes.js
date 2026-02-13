// ============================================
// routes/queue.routes.js - Queue Status & Monitoring
// ============================================
import express from 'express';
import { AuthMiddleware } from '../middlewares/auth.middleware.js';
import { getJobStatus } from '../controllers/questionController.js';
import { getExportStatus } from '../controllers/exportController.js';

const router = express.Router();

// Get question generation job status
router.get('/question/:jobId', AuthMiddleware, getJobStatus);

// Get export job status
router.get('/export/:jobId', AuthMiddleware, getExportStatus);

export default router;
