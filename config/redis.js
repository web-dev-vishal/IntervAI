import Redis from 'ioredis';

let redisClient = null;

/**
 * Get or create Redis client instance
 * Supports password authentication and connection pooling
 */
export const getRedisClient = () => {
    if (redisClient) return redisClient;

    const config = {
        host: process.env.REDIS_HOST || 'localhost',
        port: process.env.REDIS_PORT || 6379,
        password: process.env.REDIS_PASSWORD || undefined,
        maxRetriesPerRequest: 3,
        enableReadyCheck: true,
        retryStrategy: (times) => {
            const delay = Math.min(times * 50, 2000);
            return delay;
        },
        reconnectOnError: (err) => {
            const targetError = 'READONLY';
            if (err.message.includes(targetError)) {
                return true;
            }
            return false;
        }
    };

    redisClient = new Redis(config);

    redisClient.on('connect', () => {
        console.log('✅ Redis Connected');
    });

    redisClient.on('ready', () => {
        console.log('✅ Redis Ready');
    });

    redisClient.on('error', (err) => {
        console.error('❌ Redis Error:', err.message);
    });

    redisClient.on('close', () => {
        console.log('⚠️  Redis Connection Closed');
    });

    redisClient.on('reconnecting', () => {
        console.log('🔄 Redis Reconnecting...');
    });

    return redisClient;
};

/**
 * Close Redis connection gracefully
 */
export const closeRedis = async () => {
    if (redisClient) {
        await redisClient.quit();
        redisClient = null;
        console.log('✅ Redis Connection Closed');
    }
};

/**
 * Check Redis health
 */
export const checkRedisHealth = async () => {
    try {
        const redis = getRedisClient();
        await redis.ping();
        return true;
    } catch (error) {
        console.error('❌ Redis Health Check Failed:', error);
        return false;
    }
};