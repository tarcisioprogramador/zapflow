import Redis from 'ioredis';
import { Queue } from 'bullmq';

const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';

// Module-level caches — start as undefined so first access triggers creation
let _redis: Redis | undefined;
let _whatsappQueue: Queue<any, any, string> | undefined;
let _campaignQueue: Queue<any, any, string> | undefined;
let _remarketingQueue: Queue<any, any, string> | undefined;

const warnOnce = (() => {
  const warned = new Set<string>();
  return (label: string, err: unknown) => {
    if (!warned.has(label)) {
      warned.add(label);
      console.warn(`[Redis] ${label} unavailable — running without it. ${(err as Error)?.message || ''}`);
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
      if ((err as any)?.code === 'ECONNREFUSED' || (err as any)?.code === 'ENOTFOUND') {
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

function createQueue(name: string): Queue<any, any, string> | undefined {
  try {
    const connection = new Redis(redisUrl, {
      maxRetriesPerRequest: null,
      lazyConnect: true,
      retryStrategy: () => null,
    });
    connection.on('error', (err: Error) => {
      if ((err as any)?.code === 'ECONNREFUSED' || (err as any)?.code === 'ENOTFOUND') {
        warnOnce(`Queue ${name}`, err);
        return;
      }
      console.error(`[Redis] Queue "${name}" error:`, err.message);
    });

    const defaultJobOptions: Record<string, any> =
      name !== 'remarketing'
        ? { attempts: 3, backoff: { type: 'exponential', delay: 2000 } }
        : {};

    return new Queue(name, {
      connection: connection as any,
      defaultJobOptions,
    });
  } catch (err) {
    warnOnce(`Queue ${name}`, err);
    return undefined;
  }
}

function getQueue(name: string): Queue<any, any, string> | undefined {
  if (name === 'whatsapp-messages') {
    if (_whatsappQueue === undefined) _whatsappQueue = createQueue(name);
    return _whatsappQueue;
  }
  if (name === 'campaign-messages') {
    if (_campaignQueue === undefined) _campaignQueue = createQueue(name);
    return _campaignQueue;
  }
  if (name === 'remarketing') {
    if (_remarketingQueue === undefined) _remarketingQueue = createQueue(name);
    return _remarketingQueue;
  }
  return undefined;
}

export function getWhatsappQueue()  { return getQueue('whatsapp-messages'); }
export function getCampaignQueue()  { return getQueue('campaign-messages'); }
export function getRemarketingQueue() { return getQueue('remarketing'); }
