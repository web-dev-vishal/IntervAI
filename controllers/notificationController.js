// ============================================
// controllers/notificationController.js
// ============================================
import { NotificationService } from '../services/notificationService.js';

/**
 * Get user notifications
 */
export const getNotifications = async (req, res) => {
    try {
        const userId = req.id;
        const { limit = 20 } = req.query;

        const notifications = await NotificationService.getUserNotifications(
            userId,
            parseInt(limit)
        );

        return res.status(200).json({
            success: true,
            message: 'Notifications retrieved successfully',
            count: notifications.length,
            data: { notifications }
        });
    } catch (error) {
        console.error('[getNotifications]', error);
        return res.status(500).json({
            success: false,
            message: 'Error retrieving notifications'
        });
    }
};

/**
 * Mark notifications as read
 */
export const markNotificationsRead = async (req, res) => {
    try {
        const userId = req.id;
        const { notificationIds } = req.body;

        if (!Array.isArray(notificationIds) || notificationIds.length === 0) {
            return res.status(400).json({
                success: false,
                message: 'notificationIds array is required'
            });
        }

        await NotificationService.markAsRead(userId, notificationIds);

        return res.status(200).json({
            success: true,
            message: 'Notifications marked as read'
        });
    } catch (error) {
        console.error('[markNotificationsRead]', error);
        return res.status(500).json({
            success: false,
            message: 'Error marking notifications as read'
        });
    }
};

/**
 * Clear all notifications
 */
export const clearNotifications = async (req, res) => {
    try {
        const userId = req.id;
        await NotificationService.clearNotifications(userId);

        return res.status(200).json({
            success: true,
            message: 'All notifications cleared'
        });
    } catch (error) {
        console.error('[clearNotifications]', error);
        return res.status(500).json({
            success: false,
            message: 'Error clearing notifications'
        });
    }
};
