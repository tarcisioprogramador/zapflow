import Redis from 'ioredis';
import { Queue } from 'bullmq';

const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';

export const redis = new Redis(redisUrl, {
  maxRetriesPerRequest: null,
});

export const whatsappQueue = new Queue('whatsapp-messages', {
  connection: new Redis(redisUrl, { maxRetriesPerRequest: null }),
  defaultJobOptions: {
    attempts: 3,
    backoff: { type: 'exponential', delay: 2000 },
  },
});

export const campaignQueue = new Queue('campaign-messages', {
  connection: new Redis(redisUrl, { maxRetriesPerRequest: null }),
  defaultJobOptions: {
    attempts: 2,
    backoff: { type: 'fixed', delay: 5000 },
  },
});

export const remarketingQueue = new Queue('remarketing', {
  connection: new Redis(redisUrl, { maxRetriesPerRequest: null }),
});
