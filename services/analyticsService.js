// ============================================
// services/analyticsService.js - Analytics & Metrics
// ============================================
import { getRedisClient } from '../config/redis.js';
import { Session } from '../models/session.model.js';
import { Question } from '../models/question.model.js';

/**
 * Analytics Service for tracking user activity and generating insights
 */
export class AnalyticsService {
    /**
     * Track user activity in Redis
     */
    static async trackActivity(userId, activityType, metadata = {}) {
        try {
            const redis = getRedisClient();
            const key = `analytics:user:${userId}:${activityType}`;
            const timestamp = Date.now();
            
            await redis.zadd(key, timestamp, JSON.stringify({ ...metadata, timestamp }));
            await redis.expire(key, 30 * 24 * 60 * 60); // 30 days
            
            // Increment daily counter
            const dateKey = `analytics:daily:${activityType}:${new Date().toISOString().split('T')[0]}`;
            await redis.incr(dateKey);
            await redis.expire(dateKey, 90 * 24 * 60 * 60); // 90 days
            
            return true;
        } catch (error) {
            console.error('[Analytics Track Error]', error);
            return false;
        }
    }

    /**
     * Get user statistics
     */
    static async getUserStats(userId) {
        try {
            const [totalSessions, totalQuestions, pinnedQuestions] = await Promise.all([
                Session.countDocuments({ user: userId }),
                Question.countDocuments({ 
                    session: { $in: await Session.find({ user: userId }).select('_id') }
                }),
                Question.countDocuments({ 
                    session: { $in: await Session.find({ user: userId }).select('_id') },
                    isPinned: true
                })
            ]);

            const recentSessions = await Session.find({ user: userId })
                .sort({ createdAt: -1 })
                .limit(5)
                .select('role experience status createdAt')
                .lean();

            return {
                totalSessions,
                totalQuestions,
                pinnedQuestions,
                averageQuestionsPerSession: totalSessions > 0 ? Math.round(totalQuestions / totalSessions) : 0,
                recentSessions
            };
        } catch (error) {
            console.error('[Get User Stats Error]', error);
            throw error;
        }
    }

    /**
     * Get session analytics
     */
    static async getSessionAnalytics(sessionId) {
        try {
            const session = await Session.findById(sessionId).lean();
            if (!session) throw new Error('Session not found');

            const questions = await Question.find({ session: sessionId }).lean();
            
            const difficultyBreakdown = {
                easy: questions.filter(q => q.difficulty === 'easy').length,
                medium: questions.filter(q => q.difficulty === 'medium').length,
                hard: questions.filter(q => q.difficulty === 'hard').length
            };

            const avgAnswerLength = questions.length > 0
                ? Math.round(questions.reduce((sum, q) => sum + q.answer.length, 0) / questions.length)
                : 0;

            return {
                sessionId,
                totalQuestions: questions.length,
                pinnedQuestions: questions.filter(q => q.isPinned).length,
                difficultyBreakdown,
                avgAnswerLength,
                topics: session.topicsToFocus,
                role: session.role,
                experience: session.experience
            };
        } catch (error) {
            console.error('[Get Session Analytics Error]', error);
            throw error;
        }
    }

    /**
     * Get trending topics from Redis
     */
    static async getTrendingTopics(limit = 10) {
        try {
            const redis = getRedisClient();
            const topics = await redis.zrevrange('analytics:trending:topics', 0, limit - 1, 'WITHSCORES');
            
            const result = [];
            for (let i = 0; i < topics.length; i += 2) {
                result.push({
                    topic: topics[i],
                    count: parseInt(topics[i + 1])
                });
            }
            
            return result;
        } catch (error) {
            console.error('[Get Trending Topics Error]', error);
            return [];
        }
    }

    /**
     * Increment topic popularity
     */
    static async incrementTopicPopularity(topics) {
        try {
            const redis = getRedisClient();
            for (const topic of topics) {
                await redis.zincrby('analytics:trending:topics', 1, topic.toLowerCase());
            }
            await redis.expire('analytics:trending:topics', 7 * 24 * 60 * 60); // 7 days
            return true;
        } catch (error) {
            console.error('[Increment Topic Popularity Error]', error);
            return false;
        }
    }
}
