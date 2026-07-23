import Redis from 'ioredis';
import { Queue } from 'bullmq';
import { WhatsAppJob, CampaignJob, RemarketingJob } from '../types';

const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';

// Module-level caches — start as undefined so first access triggers creation
let _redis: Redis | undefined;
let _whatsappQueue: Queue<WhatsAppJob> | undefined;
let _campaignQueue: Queue<CampaignJob> | undefined;
let _remarketingQueue: Queue<RemarketingJob> | undefined;

const warnOnce = (() => {
  const warned = new Set<string>();
  return (label: string, err: unknown) => {
    if (!warned.has(label)) {
      warned.add(label);
      const error = err as Error | null;
      console.warn(`[Redis] ${label} unavailable — running without it. ${error?.message || ''}`);
    }
  };
})();

function createRedis(): Redis | undefined {
  try {
    const client = new Redis(redisUrl, {
      maxRetriesPerRequest: null,
      lazyConnect: true,
      retryStrategy: () => null,
    });
    client.on('error', (err: Error) => {
      const redisErr = err as { code?: string };
      if (redisErr.code === 'ECONNREFUSED' || redisErr.code === 'ENOTFOUND') {
        warnOnce('Client', err);
        _redis = undefined;
        return;
      }
      console.error('[Redis] Client error:', err.message);
    });
    return client;
  } catch (err) {
    warnOnce('Client', err);
    return undefined;
  }
}

function getRedis(): Redis | undefined {
  if (_redis === undefined) {
    _redis = createRedis();
  }
  return _redis;
}

// Proxy object that gracefully handles Redis being unavailable
export const redis = {
  async get(key: string): Promise<string | null> {
    const r = getRedis();
    if (!r) return null;
    try { return await r.get(key); } catch { return null; }
  },
  async setex(key: string, ttl: number, value: string): Promise<void> {
    const r = getRedis();
    if (!r) return;
    try { await r.setex(key, ttl, value); } catch { /* ignore */ }
  },
  async del(key: string): Promise<void> {
    const r = getRedis();
    if (!r) return;
    try { await r.del(key); } catch { /* ignore */ }
  },
};

function createQueue<T>(name: string): Queue<T> | undefined {
  try {
    const connection = new Redis(redisUrl, {
      maxRetriesPerRequest: null,
      lazyConnect: true,
      retryStrategy: () => null,
    });
    connection.on('error', (err: Error) => {
      const redisErr = err as { code?: string };
      if (redisErr.code === 'ECONNREFUSED' || redisErr.code === 'ENOTFOUND') {
        warnOnce(`Queue ${name}`, err);
        return;
      }
      console.error(`[Redis] Queue "${name}" error:`, err.message);
    });

    const defaultJobOptions =
      name !== 'remarketing'
        ? { attempts: 3, backoff: { type: 'exponential' as const, delay: 2000 } }
        : {};

    return new Queue<T>(name, {
      connection: connection as any,
      defaultJobOptions,
    });
  } catch (err) {
    warnOnce(`Queue ${name}`, err);
    return undefined;
  }
}

export function getWhatsappQueue(): Queue<WhatsAppJob> | undefined {
  if (_whatsappQueue === undefined) _whatsappQueue = createQueue<WhatsAppJob>('whatsapp-messages');
  return _whatsappQueue;
}

export function getCampaignQueue(): Queue<CampaignJob> | undefined {
  if (_campaignQueue === undefined) _campaignQueue = createQueue<CampaignJob>('campaign-messages');
  return _campaignQueue;
}

export function getRemarketingQueue(): Queue<RemarketingJob> | undefined {
  if (_remarketingQueue === undefined) _remarketingQueue = createQueue<RemarketingJob>('remarketing');
  return _remarketingQueue;
}
