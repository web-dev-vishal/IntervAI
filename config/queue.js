import Queue from 'bull';

/**
 * Redis configuration for Bull queues
 */
const REDIS_CONFIG = {
    host: process.env.REDIS_HOST || 'localhost',
    port: process.env.REDIS_PORT || 6379,
    password: process.env.REDIS_PASSWORD || undefined,
    maxRetriesPerRequest: null,
    enableReadyCheck: false
};

/**
 * Question Generation Queue
 * Handles AI-powered interview question generation
 */
export const questionQueue = new Queue('question-generation', {
    redis: REDIS_CONFIG,
    defaultJobOptions: {
        attempts: 3,
        backoff: {
            type: 'exponential',
            delay: 2000
        },
        removeOnComplete: 100,
        removeOnFail: 50,
        timeout: 120000 // 2 minutes
    }
});

/**
 * Export Generation Queue
 * Handles PDF, CSV, and DOCX export generation
 */
export const exportQueue = new Queue('export-generation', {
    redis: REDIS_CONFIG,
    defaultJobOptions: {
        attempts: 2,
        backoff: {
            type: 'fixed',
            delay: 3000
        },
        removeOnComplete: 50,
        removeOnFail: 25,
        timeout: 60000 // 1 minute
    }
});

/**
 * Email Notification Queue (Future use)
 * Handles email notifications
 */
export const emailQueue = new Queue('email-notifications', {
    redis: REDIS_CONFIG,
    defaultJobOptions: {
        attempts: 3,
        backoff: {
            type: 'exponential',
            delay: 5000
        },
        removeOnComplete: 20,
        removeOnFail: 10,
        timeout: 30000 // 30 seconds
    }
});

// Event Listeners for Question Queue
questionQueue.on('completed', (job, result) => {
    console.log(`✅ Question Job ${job.id} completed - Generated ${result.count} questions`);
});

questionQueue.on('failed', (job, err) => {
    console.error(`❌ Question Job ${job.id} failed:`, err.message);
});

questionQueue.on('stalled', (job) => {
    console.warn(`⚠️  Question Job ${job.id} stalled`);
});

// Event Listeners for Export Queue
exportQueue.on('completed', (job, result) => {
    console.log(`✅ Export Job ${job.id} completed - File: ${result.filename}`);
});

exportQueue.on('failed', (job, err) => {
    console.error(`❌ Export Job ${job.id} failed:`, err.message);
});

exportQueue.on('stalled', (job) => {
    console.warn(`⚠️  Export Job ${job.id} stalled`);
});

// Event Listeners for Email Queue
emailQueue.on('completed', (job) => {
    console.log(`✅ Email Job ${job.id} completed`);
});

emailQueue.on('failed', (job, err) => {
    console.error(`❌ Email Job ${job.id} failed:`, err.message);
});