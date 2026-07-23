"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getWhatsappWorker = getWhatsappWorker;
exports.getCampaignWorker = getCampaignWorker;
exports.getRemarketingWorker = getRemarketingWorker;
const bullmq_1 = require("bullmq");
const ioredis_1 = __importDefault(require("ioredis"));
const database_1 = __importDefault(require("../config/database"));
const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';
let _whatsappWorker = null;
let _campaignWorker = null;
let _remarketingWorker = null;
function tryCreateWorker(name, processor) {
    try {
        const connection = new ioredis_1.default(redisUrl, {
            maxRetriesPerRequest: null,
            lazyConnect: true,
            retryStrategy: () => null, // Don't retry — fail fast
        });
        // Test connection
        connection.connect().catch(() => {
            console.warn(`[Queue] Worker "${name}" not started — Redis unavailable`);
            connection.disconnect();
            return;
        });
        const worker = new bullmq_1.Worker(name, processor, { connection: connection });
        worker.on('failed', (job, err) => {
            if (job) {
                console.error(`[${name}] Job ${job.id} failed:`, err.message);
            }
        });
        worker.on('error', (err) => {
            const redisErr = err;
            if (redisErr.code === 'ECONNREFUSED') {
                // Silently ignore connection refused errors — Redis is optional
                return;
            }
            console.error(`[${name}] Worker error:`, err.message);
        });
        console.log(`[Queue] Worker "${name}" started`);
        return worker;
    }
    catch (err) {
        console.warn(`[Queue] Worker "${name}" unavailable — running without it`);
        return null;
    }
}
// Lazy initialization — workers only created on first access
function getWhatsappWorker() {
    if (_whatsappWorker === null) {
        _whatsappWorker = tryCreateWorker('whatsapp-messages', async (job) => {
            const { to, message, messageId } = job.data;
            console.log(`[WhatsApp] Sending message to ${to}: ${message}`);
            await new Promise((resolve) => setTimeout(resolve, 1000));
            await database_1.default.message.update({
                where: { id: messageId },
                data: { status: 'SENT' },
            });
            return { success: true };
        });
    }
    return _whatsappWorker;
}
function getCampaignWorker() {
    if (_campaignWorker === null) {
        _campaignWorker = tryCreateWorker('campaign-messages', async (job) => {
            const { campaignId, contactId, phone, message } = job.data;
            console.log(`[Campaign] Sending to ${phone}: ${message}`);
            await new Promise((resolve) => setTimeout(resolve, 2000));
            await database_1.default.campaignContact.update({
                where: { id: contactId },
                data: { status: 'sent', sentAt: new Date() },
            });
            await database_1.default.campaign.update({
                where: { id: campaignId },
                data: { totalSent: { increment: 1 } },
            });
            return { success: true };
        });
    }
    return _campaignWorker;
}
function getRemarketingWorker() {
    if (_remarketingWorker === null) {
        _remarketingWorker = tryCreateWorker('remarketing', async (job) => {
            const { executionId, contactId } = job.data;
            console.log(`[Remarketing] Sending follow-up to contact ${contactId}`);
            await new Promise((resolve) => setTimeout(resolve, 1000));
            await database_1.default.remarketingExecution.update({
                where: { id: executionId },
                data: { status: 'sent' },
            });
            return { success: true };
        });
    }
    return _remarketingWorker;
}
//# sourceMappingURL=queue.js.map