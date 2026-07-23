"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const vitest_1 = require("vitest");
const helpers_1 = require("./helpers");
const campaigns_1 = __importDefault(require("../routes/campaigns"));
function simulateRequest(method, path, req, res) {
    const route = campaigns_1.default.stack.find((layer) => {
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
(0, vitest_1.describe)('Campaigns Routes', () => {
    (0, vitest_1.beforeEach)(() => {
        (0, helpers_1.mockPrismaClear)();
    });
    const mockCampaign = {
        id: 'campaign-1',
        name: 'Test Campaign',
        message: 'Hello {{name}}! This is a test message.',
        mediaUrl: null,
        status: 'DRAFT',
        scheduledAt: null,
        sentAt: null,
        totalSent: 0,
        totalFailed: 0,
        userId: 'test-user-id',
        createdAt: new Date(),
        updatedAt: new Date(),
        _count: { contacts: 3 },
        contacts: [
            { id: 'contact-1', phone: '5511999999991', name: 'Contact 1', status: 'pending', sentAt: null, campaignId: 'campaign-1' },
            { id: 'contact-2', phone: '5511999999992', name: 'Contact 2', status: 'pending', sentAt: null, campaignId: 'campaign-1' },
        ],
    };
    (0, vitest_1.describe)('GET /', () => {
        (0, vitest_1.it)('should list all campaigns for the authenticated user', async () => {
            const req = (0, helpers_1.mockAuthRequest)();
            const res = (0, helpers_1.mockResponse)();
            helpers_1.prismaMock.campaign.findMany.mockResolvedValue([mockCampaign]);
            await simulateRequest('get', '/', req, res);
            (0, vitest_1.expect)(res.json).toHaveBeenCalledWith(vitest_1.expect.arrayContaining([
                vitest_1.expect.objectContaining({ id: 'campaign-1', name: 'Test Campaign' }),
            ]));
            (0, vitest_1.expect)(helpers_1.prismaMock.campaign.findMany).toHaveBeenCalledWith(vitest_1.expect.objectContaining({
                where: { userId: 'test-user-id' },
            }));
        });
        (0, vitest_1.it)('should return empty array when no campaigns exist', async () => {
            const req = (0, helpers_1.mockAuthRequest)();
            const res = (0, helpers_1.mockResponse)();
            helpers_1.prismaMock.campaign.findMany.mockResolvedValue([]);
            await simulateRequest('get', '/', req, res);
            (0, vitest_1.expect)(res.json).toHaveBeenCalledWith([]);
        });
    });
    (0, vitest_1.describe)('GET /:id', () => {
        (0, vitest_1.it)('should return a specific campaign by id', async () => {
            const req = (0, helpers_1.mockAuthRequest)({ params: { id: 'campaign-1' } });
            const res = (0, helpers_1.mockResponse)();
            helpers_1.prismaMock.campaign.findUnique.mockResolvedValue(mockCampaign);
            await simulateRequest('get', '/:id', req, res);
            (0, vitest_1.expect)(res.json).toHaveBeenCalledWith(vitest_1.expect.objectContaining({ id: 'campaign-1', name: 'Test Campaign' }));
        });
        (0, vitest_1.it)('should return 404 when campaign not found', async () => {
            const req = (0, helpers_1.mockAuthRequest)({ params: { id: 'nonexistent' } });
            const res = (0, helpers_1.mockResponse)();
            helpers_1.prismaMock.campaign.findUnique.mockResolvedValue(null);
            await simulateRequest('get', '/:id', req, res);
            (0, vitest_1.expect)(res.status).toHaveBeenCalledWith(404);
            (0, vitest_1.expect)(res.json).toHaveBeenCalledWith(vitest_1.expect.objectContaining({ error: 'Campanha não encontrado' }));
        });
    });
    (0, vitest_1.describe)('POST /', () => {
        (0, vitest_1.it)('should create a new campaign', async () => {
            const req = (0, helpers_1.mockAuthRequest)({
                body: {
                    name: 'New Campaign',
                    message: 'Welcome {{name}}!',
                    contacts: [
                        { phone: '5511999999991', name: 'Contact 1' },
                        { phone: '5511999999992', name: 'Contact 2' },
                    ],
                },
            });
            const res = (0, helpers_1.mockResponse)();
            helpers_1.prismaMock.campaign.create.mockResolvedValue({
                ...mockCampaign,
                id: 'new-campaign',
                name: 'New Campaign',
            });
            await simulateRequest('post', '/', req, res);
            (0, vitest_1.expect)(res.status).toHaveBeenCalledWith(201);
            (0, vitest_1.expect)(res.json).toHaveBeenCalledWith(vitest_1.expect.objectContaining({ name: 'New Campaign' }));
        });
        (0, vitest_1.it)('should reject creation without name', async () => {
            const req = (0, helpers_1.mockAuthRequest)({
                body: { message: 'Just a message' },
            });
            const res = (0, helpers_1.mockResponse)();
            await simulateRequest('post', '/', req, res);
            (0, vitest_1.expect)(res.status).toHaveBeenCalledWith(400);
            (0, vitest_1.expect)(res.json).toHaveBeenCalledWith(vitest_1.expect.objectContaining({ error: 'Nome e mensagem são obrigatórios' }));
        });
        (0, vitest_1.it)('should reject creation without message', async () => {
            const req = (0, helpers_1.mockAuthRequest)({
                body: { name: 'Campaign Only' },
            });
            const res = (0, helpers_1.mockResponse)();
            await simulateRequest('post', '/', req, res);
            (0, vitest_1.expect)(res.status).toHaveBeenCalledWith(400);
        });
    });
    (0, vitest_1.describe)('PUT /:id', () => {
        (0, vitest_1.it)('should update a campaign', async () => {
            const req = (0, helpers_1.mockAuthRequest)({
                params: { id: 'campaign-1' },
                body: { name: 'Updated Campaign', message: 'Updated message' },
            });
            const res = (0, helpers_1.mockResponse)();
            // Must mock findUnique for ownership verification
            helpers_1.prismaMock.campaign.findUnique.mockResolvedValue(mockCampaign);
            helpers_1.prismaMock.campaign.update.mockResolvedValue({
                ...mockCampaign,
                name: 'Updated Campaign',
                message: 'Updated message',
            });
            await simulateRequest('put', '/:id', req, res);
            (0, vitest_1.expect)(res.json).toHaveBeenCalledWith(vitest_1.expect.objectContaining({
                name: 'Updated Campaign',
                message: 'Updated message',
            }));
        });
    });
    (0, vitest_1.describe)('PUT /:id/status', () => {
        (0, vitest_1.it)('should update campaign status to RUNNING', async () => {
            const req = (0, helpers_1.mockAuthRequest)({
                params: { id: 'campaign-1' },
                body: { status: 'RUNNING' },
            });
            const res = (0, helpers_1.mockResponse)();
            // Must mock findUnique for ownership verification
            helpers_1.prismaMock.campaign.findUnique.mockResolvedValue(mockCampaign);
            helpers_1.prismaMock.campaign.update.mockResolvedValue({
                ...mockCampaign,
                status: 'RUNNING',
                sentAt: new Date(),
            });
            await simulateRequest('put', '/:id/status', req, res);
            (0, vitest_1.expect)(res.json).toHaveBeenCalledWith(vitest_1.expect.objectContaining({ status: 'RUNNING' }));
        });
    });
    (0, vitest_1.describe)('DELETE /:id', () => {
        (0, vitest_1.it)('should delete a campaign', async () => {
            const req = (0, helpers_1.mockAuthRequest)({ params: { id: 'campaign-1' } });
            const res = (0, helpers_1.mockResponse)();
            // Must mock findUnique for ownership verification first
            helpers_1.prismaMock.campaign.findUnique.mockResolvedValue(mockCampaign);
            helpers_1.prismaMock.campaign.delete.mockResolvedValue(mockCampaign);
            await simulateRequest('delete', '/:id', req, res);
            (0, vitest_1.expect)(res.json).toHaveBeenCalledWith(vitest_1.expect.objectContaining({ message: 'Campanha removida' }));
        });
    });
    (0, vitest_1.describe)('Error handling', () => {
        (0, vitest_1.it)('should handle database errors gracefully', async () => {
            const req = (0, helpers_1.mockAuthRequest)();
            const res = (0, helpers_1.mockResponse)();
            helpers_1.prismaMock.campaign.findMany.mockRejectedValue(new Error('DB Error'));
            await simulateRequest('get', '/', req, res);
            (0, vitest_1.expect)(res.status).toHaveBeenCalledWith(500);
            (0, vitest_1.expect)(res.json).toHaveBeenCalledWith(vitest_1.expect.objectContaining({ error: vitest_1.expect.any(String) }));
        });
    });
});
//# sourceMappingURL=campaigns.test.js.map