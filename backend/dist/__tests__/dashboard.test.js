"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const vitest_1 = require("vitest");
const helpers_1 = require("./helpers");
const dashboard_1 = __importDefault(require("../routes/dashboard"));
// Mock redis
vitest_1.vi.mock('../config/redis', () => ({
    redis: {
        get: vitest_1.vi.fn().mockResolvedValue(null),
        setex: vitest_1.vi.fn().mockResolvedValue('OK'),
        on: vitest_1.vi.fn(),
        quit: vitest_1.vi.fn(),
    },
}));
function simulateRequest(method, path, req, res) {
    const route = dashboard_1.default.stack.find((layer) => {
        if (!layer.route)
            return false;
        return layer.route.path === path && layer.route.methods[method];
    });
    if (!route) {
        throw new Error(`Route ${method.toUpperCase()} ${path} not found`);
    }
    const handler = route.route.stack[route.route.stack.length - 1].handle;
    return handler(req, res, () => { });
}
(0, vitest_1.describe)('Dashboard Routes', () => {
    (0, vitest_1.beforeEach)(() => {
        (0, helpers_1.mockPrismaClear)();
    });
    (0, vitest_1.describe)('GET /metrics', () => {
        (0, vitest_1.it)('should return dashboard metrics for authenticated user', async () => {
            const req = (0, helpers_1.mockAuthRequest)();
            const res = (0, helpers_1.mockResponse)();
            helpers_1.prismaMock.user.findUnique.mockResolvedValue((0, helpers_1.createTestUser)());
            helpers_1.prismaMock.whatsAppNumber.findMany.mockResolvedValue([{ id: 'num-1' }]);
            helpers_1.prismaMock.message.count.mockResolvedValue(150);
            helpers_1.prismaMock.conversation.count.mockResolvedValue(12);
            helpers_1.prismaMock.contact.count.mockResolvedValue(45);
            helpers_1.prismaMock.flow.count.mockResolvedValue(3);
            helpers_1.prismaMock.campaign.count.mockResolvedValue(5);
            helpers_1.prismaMock.crmCard.groupBy.mockResolvedValue([
                { stageId: 'stage-1', _count: 10, _sum: { value: 5000 } },
                { stageId: 'stage-2', _count: 5, _sum: { value: 2000 } },
            ]);
            helpers_1.prismaMock.crmStage.findMany.mockResolvedValue([
                { id: 'stage-1', name: 'Lead', color: '#6366f1', position: 0, boardId: 'board-1', createdAt: new Date(), updatedAt: new Date() },
                { id: 'stage-2', name: 'Fechado', color: '#10b981', position: 4, boardId: 'board-1', createdAt: new Date(), updatedAt: new Date() },
            ]);
            helpers_1.prismaMock.crmCard.count.mockResolvedValue(15);
            helpers_1.prismaMock.message.findMany.mockResolvedValue([
                { createdAt: new Date('2025-07-01T10:00:00Z') },
                { createdAt: new Date('2025-07-01T14:00:00Z') },
                { createdAt: new Date('2025-07-02T09:00:00Z') },
            ]);
            await simulateRequest('get', '/metrics', req, res);
            (0, vitest_1.expect)(res.json).toHaveBeenCalledWith(vitest_1.expect.objectContaining({
                totalMessages: 150,
                activeConversations: 12,
                totalContacts: 45,
                activeFlows: 3,
                totalCampaigns: 5,
                conversionRate: vitest_1.expect.any(Number),
                messagesPerDay: vitest_1.expect.any(Array),
                pipelineData: vitest_1.expect.any(Array),
            }));
        });
        (0, vitest_1.it)('should handle user without organization', async () => {
            const req = (0, helpers_1.mockAuthRequest)();
            const res = (0, helpers_1.mockResponse)();
            helpers_1.prismaMock.user.findUnique.mockResolvedValue((0, helpers_1.createTestUser)({ organizationId: null, organization: null }));
            helpers_1.prismaMock.whatsAppNumber.findMany.mockResolvedValue([]);
            helpers_1.prismaMock.contact.count.mockResolvedValue(0);
            helpers_1.prismaMock.flow.count.mockResolvedValue(0);
            helpers_1.prismaMock.campaign.count.mockResolvedValue(0);
            helpers_1.prismaMock.crmCard.groupBy.mockResolvedValue([]);
            helpers_1.prismaMock.crmCard.count.mockResolvedValue(0);
            await simulateRequest('get', '/metrics', req, res);
            (0, vitest_1.expect)(res.json).toHaveBeenCalledWith(vitest_1.expect.objectContaining({
                totalMessages: 0,
                activeConversations: 0,
                totalContacts: 0,
            }));
        });
        (0, vitest_1.it)('should handle database errors gracefully', async () => {
            const req = (0, helpers_1.mockAuthRequest)();
            const res = (0, helpers_1.mockResponse)();
            helpers_1.prismaMock.user.findUnique.mockRejectedValue(new Error('DB Error'));
            await simulateRequest('get', '/metrics', req, res);
            (0, vitest_1.expect)(res.status).toHaveBeenCalledWith(500);
            (0, vitest_1.expect)(res.json).toHaveBeenCalledWith(vitest_1.expect.objectContaining({ error: vitest_1.expect.any(String) }));
        });
    });
    (0, vitest_1.describe)('GET /activity', () => {
        (0, vitest_1.it)('should return recent activity messages', async () => {
            const req = (0, helpers_1.mockAuthRequest)();
            const res = (0, helpers_1.mockResponse)();
            helpers_1.prismaMock.user.findUnique.mockResolvedValue((0, helpers_1.createTestUser)());
            helpers_1.prismaMock.whatsAppNumber.findMany.mockResolvedValue([{ id: 'num-1' }]);
            helpers_1.prismaMock.message.findMany.mockResolvedValue([
                {
                    id: 'msg-1',
                    content: 'Hello!',
                    type: 'TEXT',
                    status: 'SENT',
                    from: '5511999999999',
                    to: '5511999999991',
                    mediaUrl: null,
                    isFromBot: false,
                    conversationId: 'conv-1',
                    createdAt: new Date(),
                    conversation: {
                        id: 'conv-1',
                        status: 'open',
                        contact: { name: 'John Doe', phone: '5511999999991' },
                        whatsappNumberId: 'num-1',
                        contactId: 'contact-1',
                        userId: null,
                        createdAt: new Date(),
                        updatedAt: new Date(),
                    },
                },
            ]);
            await simulateRequest('get', '/activity', req, res);
            (0, vitest_1.expect)(res.json).toHaveBeenCalledWith(vitest_1.expect.arrayContaining([
                vitest_1.expect.objectContaining({
                    id: 'msg-1',
                    content: 'Hello!',
                }),
            ]));
        });
        (0, vitest_1.it)('should return empty array when user has no organization', async () => {
            const req = (0, helpers_1.mockAuthRequest)();
            const res = (0, helpers_1.mockResponse)();
            helpers_1.prismaMock.user.findUnique.mockResolvedValue((0, helpers_1.createTestUser)({ organizationId: null, organization: null }));
            helpers_1.prismaMock.whatsAppNumber.findMany.mockResolvedValue([]);
            helpers_1.prismaMock.message.findMany.mockResolvedValue([]);
            await simulateRequest('get', '/activity', req, res);
            (0, vitest_1.expect)(res.json).toHaveBeenCalledWith([]);
        });
        (0, vitest_1.it)('should handle errors gracefully', async () => {
            const req = (0, helpers_1.mockAuthRequest)();
            const res = (0, helpers_1.mockResponse)();
            helpers_1.prismaMock.user.findUnique.mockRejectedValue(new Error('DB Error'));
            await simulateRequest('get', '/activity', req, res);
            (0, vitest_1.expect)(res.status).toHaveBeenCalledWith(500);
        });
    });
});
//# sourceMappingURL=dashboard.test.js.map