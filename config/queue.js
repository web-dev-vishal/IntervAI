import Queue from 'bull';

const REDIS_CONFIG = {
    host: process.env.REDIS_HOST || 'localhost',
    port: process.env.REDIS_PORT || 6379
};

export const questionQueue = new Queue('question-generation', {
    redis: REDIS_CONFIG,
    defaultJobOptions: {
        attempts: 3,
        backoff: {
            type: 'exponential',
            delay: 2000
        },
        removeOnComplete: 100,
        removeOnFail: 50
    }
});

export const exportQueue = new Queue('export-generation', {
    redis: REDIS_CONFIG,
    defaultJobOptions: {
        attempts: 2,
        backoff: {
            type: 'fixed',
            delay: 3000
        },
        removeOnComplete: 50,
        removeOnFail: 25
    }
});

questionQueue.on('completed', (job, result) => {
    console.log(`✅ Job ${job.id} completed`);
});

questionQueue.on('failed', (job, err) => {
    console.error(`❌ Job ${job.id} failed:`, err.message);
});

exportQueue.on('completed', (job, result) => {
    console.log(`✅ Export Job ${job.id} completed`);
});

exportQueue.on('failed', (job, err) => {
    console.error(`❌ Export Job ${job.id} failed:`, err.message);
});