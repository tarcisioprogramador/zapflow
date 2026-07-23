"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.redis = void 0;
exports.getWhatsappQueue = getWhatsappQueue;
exports.getCampaignQueue = getCampaignQueue;
exports.getRemarketingQueue = getRemarketingQueue;
const ioredis_1 = __importDefault(require("ioredis"));
const bullmq_1 = require("bullmq");
const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';
// Module-level caches — start as undefined so first access triggers creation
let _redis;
let _whatsappQueue;
let _campaignQueue;
let _remarketingQueue;
const warnOnce = (() => {
    const warned = new Set();
    return (label, err) => {
        if (!warned.has(label)) {
            warned.add(label);
            const error = err;
            console.warn(`[Redis] ${label} unavailable — running without it. ${error?.message || ''}`);
        }
    };
})();
function createRedis() {
    try {
        const client = new ioredis_1.default(redisUrl, {
            maxRetriesPerRequest: null,
            lazyConnect: true,
            retryStrategy: () => null,
        });
        client.on('error', (err) => {
            const redisErr = err;
            if (redisErr.code === 'ECONNREFUSED' || redisErr.code === 'ENOTFOUND') {
                warnOnce('Client', err);
                _redis = undefined;
                return;
            }
            console.error('[Redis] Client error:', err.message);
        });
        return client;
    }
    catch (err) {
        warnOnce('Client', err);
        return undefined;
    }
}
function getRedis() {
    if (_redis === undefined) {
        _redis = createRedis();
    }
    return _redis;
}
// Proxy object that gracefully handles Redis being unavailable
exports.redis = {
    async get(key) {
        const r = getRedis();
        if (!r)
            return null;
        try {
            return await r.get(key);
        }
        catch {
            return null;
        }
    },
    async setex(key, ttl, value) {
        const r = getRedis();
        if (!r)
            return;
        try {
            await r.setex(key, ttl, value);
        }
        catch { /* ignore */ }
    },
    async del(key) {
        const r = getRedis();
        if (!r)
            return;
        try {
            await r.del(key);
        }
        catch { /* ignore */ }
    },
};
function createQueue(name) {
    try {
        const connection = new ioredis_1.default(redisUrl, {
            maxRetriesPerRequest: null,
            lazyConnect: true,
            retryStrategy: () => null,
        });
        connection.on('error', (err) => {
            const redisErr = err;
            if (redisErr.code === 'ECONNREFUSED' || redisErr.code === 'ENOTFOUND') {
                warnOnce(`Queue ${name}`, err);
                return;
            }
            console.error(`[Redis] Queue "${name}" error:`, err.message);
        });
        const defaultJobOptions = name !== 'remarketing'
            ? { attempts: 3, backoff: { type: 'exponential', delay: 2000 } }
            : {};
        return new bullmq_1.Queue(name, {
            connection: connection,
            defaultJobOptions,
        });
    }
    catch (err) {
        warnOnce(`Queue ${name}`, err);
        return undefined;
    }
}
function getWhatsappQueue() {
    if (_whatsappQueue === undefined)
        _whatsappQueue = createQueue('whatsapp-messages');
    return _whatsappQueue;
}
function getCampaignQueue() {
    if (_campaignQueue === undefined)
        _campaignQueue = createQueue('campaign-messages');
    return _campaignQueue;
}
function getRemarketingQueue() {
    if (_remarketingQueue === undefined)
        _remarketingQueue = createQueue('remarketing');
    return _remarketingQueue;
}
//# sourceMappingURL=redis.js.map