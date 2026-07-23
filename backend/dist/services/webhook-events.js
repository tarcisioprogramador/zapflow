"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.createEventLog = createEventLog;
exports.updateEventLog = updateEventLog;
exports.findEventByIdempotencyKey = findEventByIdempotencyKey;
exports.findRecentEventByDataId = findRecentEventByDataId;
const database_1 = __importDefault(require("../config/database"));
async function createEventLog(params) {
    try {
        return await database_1.default.webhookEvent.create({
            data: {
                source: params.source,
                eventId: params.eventId,
                eventType: params.eventType,
                dataId: params.dataId,
                status: params.status,
                requestBody: params.requestBody ? JSON.stringify(params.requestBody) : null,
                responseBody: params.responseBody ? JSON.stringify(params.responseBody) : null,
                errorMessage: params.errorMessage,
                processedAt: params.status === 'processed' || params.status === 'failed' ? new Date() : null,
            },
        });
    }
    catch (err) {
        console.error('[WebhookEvents] Failed to create log:', err);
    }
}
async function updateEventLog(id, data) {
    try {
        const updateData = { ...data };
        if (data.responseBody) {
            updateData.responseBody = JSON.stringify(data.responseBody);
        }
        if (data.status === 'processed' || data.status === 'failed') {
            updateData.processedAt = new Date();
        }
        return await database_1.default.webhookEvent.update({ where: { id }, data: updateData });
    }
    catch (err) {
        console.error('[WebhookEvents] Failed to update log:', err);
    }
}
async function findEventByIdempotencyKey(source, eventId) {
    try {
        return await database_1.default.webhookEvent.findUnique({
            where: { eventId: `${source}_${eventId}` },
        });
    }
    catch {
        return null;
    }
}
async function findRecentEventByDataId(source, dataId, withinMs = 60000) {
    const since = new Date(Date.now() - withinMs);
    try {
        return await database_1.default.webhookEvent.findFirst({
            where: {
                source,
                dataId,
                createdAt: { gte: since },
                status: { in: ['processing', 'processed'] },
            },
            orderBy: { createdAt: 'desc' },
        });
    }
    catch {
        return null;
    }
}
//# sourceMappingURL=webhook-events.js.map