import crypto from 'crypto';
import { getRedisClient } from '../config/redis.js';

export class OTPService {
    /**
     * Generate a random 6-digit OTP
     * @returns {string} 6-digit OTP
     */
    static generateOTP() {
        return crypto.randomInt(100000, 999999).toString();
    }

    /**
     * Store OTP in Redis with expiry
     * @param {string} email - User email
     * @param {string} otp - Generated OTP
     * @param {number} expiryMinutes - TTL in minutes (default 10)
     */
    static async storeOTP(email, otp, expiryMinutes = 10) {
        try {
            const redis = getRedisClient();
            const key = `otp:${email.toLowerCase()}`;
            await redis.setex(key, expiryMinutes * 60, otp);
            console.log(`[OTP] Stored for ${email}, expires in ${expiryMinutes} minutes`);
        } catch (error) {
            console.error('[OTP Store Error]', error);
            throw error;
        }
    }

    /**
     * Retrieve OTP from Redis
     * @param {string} email - User email
     * @returns {string|null} OTP or null if expired/not found
     */
    static async getOTP(email) {
        try {
            const redis = getRedisClient();
            const key = `otp:${email.toLowerCase()}`;
            return await redis.get(key);
        } catch (error) {
            console.error('[OTP Get Error]', error);
            return null;
        }
    }

    /**
     * Verify OTP matches stored value
     * @param {string} email - User email
     * @param {string} otp - OTP to verify
     * @returns {boolean} True if valid, false otherwise
     */
    static async verifyOTP(email, otp) {
        try {
            const storedOTP = await this.getOTP(email);
            return storedOTP === otp;
        } catch (error) {
            console.error('[OTP Verify Error]', error);
            return false;
        }
    }

    /**
     * Delete OTP from Redis
     * @param {string} email - User email
     */
    static async deleteOTP(email) {
        try {
            const redis = getRedisClient();
            const key = `otp:${email.toLowerCase()}`;
            await redis.del(key);
            console.log(`[OTP] Deleted for ${email}`);
        } catch (error) {
            console.error('[OTP Delete Error]', error);
        }
    }

    /**
     * Track OTP request attempts (rate limiting)
     * @param {string} email - User email
     * @returns {number} Number of attempts in current window
     */
    static async trackOTPRequest(email) {
        try {
            const redis = getRedisClient();
            const key = `otp:attempts:${email.toLowerCase()}`;
            const attempts = await redis.incr(key);
            
            if (attempts === 1) {
                // Set 1-hour expiry on first attempt
                await redis.expire(key, 3600);
            }
            
            return attempts;
        } catch (error) {
            console.error('[OTP Track Error]', error);
            return 0;
        }
    }

    /**
     * Track OTP verification attempts
     * @param {string} email - User email
     * @returns {number} Number of verification attempts
     */
    static async trackOTPVerification(email) {
        try {
            const redis = getRedisClient();
            const key = `otp:verify:${email.toLowerCase()}`;
            const attempts = await redis.incr(key);
            
            if (attempts === 1) {
                // Set 10-minute expiry on first attempt
                await redis.expire(key, 600);
            }
            
            return attempts;
        } catch (error) {
            console.error('[OTP Verify Track Error]', error);
            return 0;
        }
    }

    /**
     * Get remaining TTL for OTP
     * @param {string} email - User email
     * @returns {number} Seconds remaining, -1 if expired, -2 if not found
     */
    static async getOTPTTL(email) {
        try {
            const redis = getRedisClient();
            const key = `otp:${email.toLowerCase()}`;
            return await redis.ttl(key);
        } catch (error) {
            console.error('[OTP TTL Error]', error);
            return -2;
        }
    }
}
