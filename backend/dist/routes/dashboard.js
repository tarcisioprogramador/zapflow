"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const database_1 = __importDefault(require("../config/database"));
const redis_1 = require("../config/redis");
const auth_1 = require("../middleware/auth");
const router = (0, express_1.Router)();
router.use(auth_1.authenticate);
const CACHE_TTL = 60; // 1 minute cache for dashboard metrics
async function getCachedOrFetch(key, fetchFn, ttl = CACHE_TTL) {
    const cached = await redis_1.redis.get(key);
    if (cached)
        return JSON.parse(cached);
    const data = await fetchFn();
    await redis_1.redis.setex(key, ttl, JSON.stringify(data));
    return data;
}
// GET /api/dashboard/metrics
router.get('/metrics', async (req, res) => {
    try {
        const userId = req.user.userId;
        const cacheKey = `dashboard:metrics:${userId}`;
        const data = await getCachedOrFetch(cacheKey, async () => {
            const user = await database_1.default.user.findUnique({ where: { id: userId } });
            const orgId = user?.organizationId;
            const now = new Date();
            const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
            const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
            // Get WhatsApp number IDs for the org
            const orgNumbers = orgId
                ? await database_1.default.whatsAppNumber.findMany({ where: { organizationId: orgId }, select: { id: true } })
                : [];
            const numberIds = orgNumbers.map((n) => n.id);
            // Total messages (last 30 days)
            const totalMessages = numberIds.length > 0
                ? await database_1.default.message.count({
                    where: {
                        conversation: { whatsappNumberId: { in: numberIds } },
                        createdAt: { gte: thirtyDaysAgo },
                    },
                })
                : 0;
            // Active conversations
            const activeConversations = numberIds.length > 0
                ? await database_1.default.conversation.count({
                    where: {
                        whatsappNumberId: { in: numberIds },
                        status: 'open',
                    },
                })
                : 0;
            // Total contacts
            const totalContacts = await database_1.default.contact.count({
                where: { userId },
            });
            // Active flows
            const activeFlows = await database_1.default.flow.count({
                where: { userId, isActive: true },
            });
            // Messages per day (last 7 days) - PostgreSQL compatible
            let messagesPerDay = [];
            if (numberIds.length > 0) {
                const messages = await database_1.default.message.findMany({
                    where: {
                        conversation: { whatsappNumberId: { in: numberIds } },
                        createdAt: { gte: sevenDaysAgo },
                    },
                    select: { createdAt: true },
                    orderBy: { createdAt: 'asc' },
                });
                const grouped = {};
                for (const msg of messages) {
                    const date = msg.createdAt.toISOString().split('T')[0];
                    grouped[date] = (grouped[date] || 0) + 1;
                }
                messagesPerDay = Object.entries(grouped).map(([date, count]) => ({
                    date,
                    count,
                }));
            }
            // Total campaigns
            const totalCampaigns = await database_1.default.campaign.count({
                where: { userId },
            });
            // Cards by stage (CRM summary)
            const cardsByStage = orgId
                ? await database_1.default.crmCard.groupBy({
                    by: ['stageId'],
                    where: { board: { organizationId: orgId } },
                    _count: true,
                    _sum: { value: true },
                })
                : [];
            const stageIds = cardsByStage.map((c) => c.stageId);
            const stages = stageIds.length > 0
                ? await database_1.default.crmStage.findMany({ where: { id: { in: stageIds } } })
                : [];
            const stageMap = new Map(stages.map((s) => [s.id, s.name]));
            const pipelineData = cardsByStage.map((c) => ({
                stage: stageMap.get(c.stageId) || 'Desconhecido',
                count: c._count,
                value: c._sum.value || 0,
            }));
            // Conversion rate (cards in "Fechado" stage / total cards)
            const totalCards = await database_1.default.crmCard.count({
                where: { board: orgId ? { organizationId: orgId } : undefined },
            });
            const closedCards = totalCards > 0
                ? await database_1.default.crmCard.count({
                    where: {
                        board: orgId ? { organizationId: orgId } : undefined,
                        stage: { name: 'Fechado' },
                    },
                })
                : 0;
            const conversionRate = totalCards > 0 ? ((closedCards / totalCards) * 100).toFixed(1) : '0';
            return {
                totalMessages,
                activeConversations,
                totalContacts,
                activeFlows,
                totalCampaigns,
                conversionRate: parseFloat(conversionRate),
                messagesPerDay,
                pipelineData,
            };
        });
        res.json(data);
    }
    catch (error) {
        console.error('Dashboard error:', error);
        res.status(500).json({ error: 'Erro ao buscar métricas' });
    }
});
// GET /api/dashboard/activity - Recent activity
router.get('/activity', async (req, res) => {
    try {
        const user = await database_1.default.user.findUnique({ where: { id: req.user.userId } });
        const orgId = user?.organizationId;
        const orgNumbers = orgId
            ? await database_1.default.whatsAppNumber.findMany({ where: { organizationId: orgId }, select: { id: true } })
            : [];
        const numberIds = orgNumbers.map((n) => n.id);
        const recentMessages = await database_1.default.message.findMany({
            where: {
                conversation: { whatsappNumberId: { in: numberIds } },
            },
            include: {
                conversation: {
                    include: { contact: { select: { name: true, phone: true } } },
                },
            },
            orderBy: { createdAt: 'desc' },
            take: 20,
        });
        res.json(recentMessages);
    }
    catch (error) {
        res.status(500).json({ error: 'Erro ao buscar atividade' });
    }
});
exports.default = router;
//# sourceMappingURL=dashboard.js.map