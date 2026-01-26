import Redis from 'ioredis';

let redisClient = null;

export const getRedisClient = () => {
    if (redisClient) return redisClient;

    const config = {
        host: process.env.REDIS_HOST || 'localhost',
        port: process.env.REDIS_PORT || 6379,
        maxRetriesPerRequest: 3,
        retryStrategy: (times) => {
            const delay = Math.min(times * 50, 2000);
            return delay;
        }
    };

    redisClient = new Redis(config);

    redisClient.on('connect', () => {
        console.log('✅ Redis Connected');
    });

    redisClient.on('error', (err) => {
        console.error('❌ Redis Error:', err);
    });

    return redisClient;
};

export const closeRedis = async () => {
    if (redisClient) {
        await redisClient.quit();
        console.log('✅ Redis Connection Closed');
    }
};