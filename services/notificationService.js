// ============================================
// services/notificationService.js - Real-time Notifications
// ============================================
import { getRedisClient } from '../config/redis.js';

/**
 * Notification Service using Redis Pub/Sub
 */
export class NotificationService {
    /**
     * Publish notification to user channel
     */
    static async publishToUser(userId, notification) {
        try {
            const redis = getRedisClient();
            const channel = `notifications:user:${userId}`;
            
            const message = JSON.stringify({
                ...notification,
                timestamp: Date.now(),
                id: `notif_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
            });
            
            await redis.publish(channel, message);
            
            // Also store in list for retrieval
            await redis.lpush(`notifications:user:${userId}:list`, message);
            await redis.ltrim(`notifications:user:${userId}:list`, 0, 99); // Keep last 100
            await redis.expire(`notifications:user:${userId}:list`, 7 * 24 * 60 * 60); // 7 days
            
            return true;
        } catch (error) {
            console.error('[Publish Notification Error]', error);
            return false;
        }
    }

    /**
     * Get user notifications
     */
    static async getUserNotifications(userId, limit = 20) {
        try {
            const redis = getRedisClient();
            const notifications = await redis.lrange(`notifications:user:${userId}:list`, 0, limit - 1);
            
            return notifications.map(n => JSON.parse(n));
        } catch (error) {
            console.error('[Get Notifications Error]', error);
            return [];
        }
    }

    /**
     * Mark notifications as read
     */
    static async markAsRead(userId, notificationIds) {
        try {
            const redis = getRedisClient();
            const key = `notifications:user:${userId}:read`;
            
            for (const id of notificationIds) {
                await redis.sadd(key, id);
            }
            
            await redis.expire(key, 30 * 24 * 60 * 60); // 30 days
            return true;
        } catch (error) {
            console.error('[Mark As Read Error]', error);
            return false;
        }
    }

    /**
     * Clear all notifications for user
     */
    static async clearNotifications(userId) {
        try {
            const redis = getRedisClient();
            await redis.del(`notifications:user:${userId}:list`);
            return true;
        } catch (error) {
            console.error('[Clear Notifications Error]', error);
            return false;
        }
    }

    /**
     * Send job completion notification
     */
    static async notifyJobComplete(userId, jobType, jobId, result) {
        return this.publishToUser(userId, {
            type: 'job_complete',
            jobType,
            jobId,
            result,
            message: `Your ${jobType} job has completed successfully`
        });
    }

    /**
     * Send job failure notification
     */
    static async notifyJobFailed(userId, jobType, jobId, error) {
        return this.publishToUser(userId, {
            type: 'job_failed',
            jobType,
            jobId,
            error,
            message: `Your ${jobType} job has failed`
        });
    }
}
