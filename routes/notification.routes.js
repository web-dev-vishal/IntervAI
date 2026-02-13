// ============================================
// routes/notification.routes.js
// ============================================
import express from 'express';
import { AuthMiddleware } from '../middlewares/auth.middleware.js';
import {
    getNotifications,
    markNotificationsRead,
    clearNotifications
} from '../controllers/notificationController.js';

const router = express.Router();

// Get user notifications
router.get('/', AuthMiddleware, getNotifications);

// Mark notifications as read
router.post('/read', AuthMiddleware, markNotificationsRead);

// Clear all notifications
router.delete('/clear', AuthMiddleware, clearNotifications);

export default router;
