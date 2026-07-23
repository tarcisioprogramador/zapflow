"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const vitest_1 = require("vitest");
const helpers_1 = require("./helpers");
const whatsapp_1 = __importDefault(require("../routes/whatsapp"));
// Mock the whatsapp service
vitest_1.vi.mock('../services/whatsapp', () => ({
    createInstance: vitest_1.vi.fn().mockResolvedValue({
        instance: { instanceName: 'test-instance', instanceId: 'inst-1', status: 'created' },
    }),
    getQRCode: vitest_1.vi.fn().mockResolvedValue({ base64: 'qrcode-data', code: 'abc123' }),
    getConnectionState: vitest_1.vi.fn().mockResolvedValue({
        instance: { connectionStatus: 'open' },
    }),
    logoutInstance: vitest_1.vi.fn().mockResolvedValue(undefined),
    deleteInstance: vitest_1.vi.fn().mockResolvedValue(undefined),
    sendText: vitest_1.vi.fn().mockResolvedValue({ key: { id: 'msg-1' } }),
    sendMedia: vitest_1.vi.fn().mockResolvedValue({ key: { id: 'msg-1' } }),
    setWebhook: vitest_1.vi.fn().mockResolvedValue({}),
    BASE_URL: '',
    API_KEY: '',
}));
// Mock the trial service
vitest_1.vi.mock('../services/trial', () => ({
    startUserTrial: vitest_1.vi.fn().mockResolvedValue(undefined),
    isUserTrialExpired: vitest_1.vi.fn().mockResolvedValue(false),
    getUserTrialStatus: vitest_1.vi.fn().mockResolvedValue({
        isActive: true,
        isExpired: false,
        daysRemaining: 6,
        startedAt: new Date().toISOString(),
        expiresAt: new Date(Date.now() + 7 * 86400000).toISOString(),
        plan: 'FREE',
    }),
    checkAndDisconnectExpiredTrials: vitest_1.vi.fn().mockResolvedValue(0),
}));
function simulateRequest(method, path, req, res) {
    const route = whatsapp_1.default.stack.find((layer) => {
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
(0, vitest_1.describe)('WhatsApp Routes', () => {
    (0, vitest_1.beforeEach)(() => {
        (0, helpers_1.mockPrismaClear)();
    });
    const mockNumber = {
        id: 'number-1',
        number: '5511999999999',
        name: 'Test Number',
        status: 'CONNECTED',
        instanceId: 'test-instance',
        qrcode: 'qrcode-data',
        trialExpiresAt: null,
        organizationId: 'test-org-id',
        createdAt: new Date(),
        updatedAt: new Date(),
    };
    const mockConversation = {
        id: 'conv-1',
        status: 'open',
        whatsappNumberId: 'number-1',
        contactId: 'contact-1',
        userId: 'test-user-id',
        createdAt: new Date(),
        updatedAt: new Date(),
    };
    const mockContact = {
        id: 'contact-1',
        name: 'Test Contact',
        phone: '5511999999991',
        email: null,
        company: null,
        tags: '[]',
        notes: null,
        utmSource: null,
        utmMedium: null,
        utmCampaign: null,
        adId: null,
        adTitle: null,
        userId: 'test-user-id',
        createdAt: new Date(),
        updatedAt: new Date(),
    };
    (0, vitest_1.describe)('GET /', () => {
        (0, vitest_1.it)('should list all connected numbers for the user', async () => {
            const req = (0, helpers_1.mockAuthRequest)();
            const res = (0, helpers_1.mockResponse)();
            helpers_1.prismaMock.user.findUnique.mockResolvedValue((0, helpers_1.createTestUser)());
            helpers_1.prismaMock.whatsAppNumber.findMany.mockResolvedValue([mockNumber]);
            await simulateRequest('get', '/', req, res);
            (0, vitest_1.expect)(res.json).toHaveBeenCalledWith(vitest_1.expect.arrayContaining([
                vitest_1.expect.objectContaining({
                    id: 'number-1',
                    number: '5511999999999',
                }),
            ]));
        });
        (0, vitest_1.it)('should return empty array when user has no organization', async () => {
            const req = (0, helpers_1.mockAuthRequest)();
            const res = (0, helpers_1.mockResponse)();
            helpers_1.prismaMock.user.findUnique.mockResolvedValue((0, helpers_1.createTestUser)({ organizationId: null, organization: null }));
            await simulateRequest('get', '/', req, res);
            (0, vitest_1.expect)(res.json).toHaveBeenCalledWith([]);
        });
    });
    (0, vitest_1.describe)('POST /connect', () => {
        (0, vitest_1.it)('should connect a new number successfully', async () => {
            const req = (0, helpers_1.mockAuthRequest)({
                body: { number: '5511999999999', name: 'My Number' },
            });
            const res = (0, helpers_1.mockResponse)();
            helpers_1.prismaMock.user.findUnique.mockResolvedValue((0, helpers_1.createTestUser)());
            // Mock that we're in demo mode (no EVOLUTION API configured)
            const { BASE_URL } = await vitest_1.vi.importMock('../services/whatsapp');
            helpers_1.prismaMock.whatsAppNumber.create.mockResolvedValue(mockNumber);
            await simulateRequest('post', '/connect', req, res);
            // In demo mode, should create the number and respond with 201
            (0, vitest_1.expect)(res.status).toHaveBeenCalledWith(201);
            (0, vitest_1.expect)(res.json).toHaveBeenCalledWith(vitest_1.expect.objectContaining({
                id: 'number-1',
            }));
        });
        (0, vitest_1.it)('should reject connection without number', async () => {
            const req = (0, helpers_1.mockAuthRequest)({ body: { name: 'Only Name' } });
            const res = (0, helpers_1.mockResponse)();
            helpers_1.prismaMock.user.findUnique.mockResolvedValue((0, helpers_1.createTestUser)());
            await simulateRequest('post', '/connect', req, res);
            (0, vitest_1.expect)(res.status).toHaveBeenCalledWith(400);
        });
        (0, vitest_1.it)('should reject connection without name', async () => {
            const req = (0, helpers_1.mockAuthRequest)({ body: { number: '5511999999999' } });
            const res = (0, helpers_1.mockResponse)();
            helpers_1.prismaMock.user.findUnique.mockResolvedValue((0, helpers_1.createTestUser)());
            await simulateRequest('post', '/connect', req, res);
            (0, vitest_1.expect)(res.status).toHaveBeenCalledWith(400);
        });
        (0, vitest_1.it)('should return 400 when user has no organization', async () => {
            const req = (0, helpers_1.mockAuthRequest)({
                body: { number: '5511999999999', name: 'My Number' },
            });
            const res = (0, helpers_1.mockResponse)();
            helpers_1.prismaMock.user.findUnique.mockResolvedValue((0, helpers_1.createTestUser)({ organizationId: null, organization: null }));
            await simulateRequest('post', '/connect', req, res);
            (0, vitest_1.expect)(res.status).toHaveBeenCalledWith(400);
        });
    });
    (0, vitest_1.describe)('POST /:id/send', () => {
        (0, vitest_1.it)('should send a message successfully', async () => {
            const req = (0, helpers_1.mockAuthRequest)({
                params: { id: 'number-1' },
                body: { to: '5511999999991', message: 'Hello!' },
            });
            const res = (0, helpers_1.mockResponse)();
            helpers_1.prismaMock.whatsAppNumber.findUnique.mockResolvedValue(mockNumber);
            helpers_1.prismaMock.contact.findFirst.mockResolvedValue(mockContact);
            helpers_1.prismaMock.conversation.findFirst.mockResolvedValue(mockConversation);
            helpers_1.prismaMock.message.create.mockResolvedValue({
                id: 'msg-1',
                content: 'Hello!',
                type: 'TEXT',
                from: '5511999999999',
                to: '5511999999991',
                status: 'SENT',
                mediaUrl: null,
                isFromBot: true,
                conversationId: 'conv-1',
                createdAt: new Date(),
            });
            await simulateRequest('post', '/:id/send', req, res);
            (0, vitest_1.expect)(res.json).toHaveBeenCalledWith(vitest_1.expect.objectContaining({
                content: 'Hello!',
                to: '5511999999991',
            }));
        });
        (0, vitest_1.it)('should reject sending without destination', async () => {
            const req = (0, helpers_1.mockAuthRequest)({
                params: { id: 'number-1' },
                body: { message: 'Hello!' },
            });
            const res = (0, helpers_1.mockResponse)();
            await simulateRequest('post', '/:id/send', req, res);
            (0, vitest_1.expect)(res.status).toHaveBeenCalledWith(400);
        });
        (0, vitest_1.it)('should reject sending when number is not connected', async () => {
            const req = (0, helpers_1.mockAuthRequest)({
                params: { id: 'number-1' },
                body: { to: '5511999999991', message: 'Hello!' },
            });
            const res = (0, helpers_1.mockResponse)();
            helpers_1.prismaMock.whatsAppNumber.findUnique.mockResolvedValue({
                ...mockNumber,
                status: 'DISCONNECTED',
            });
            await simulateRequest('post', '/:id/send', req, res);
            (0, vitest_1.expect)(res.status).toHaveBeenCalledWith(400);
            (0, vitest_1.expect)(res.json).toHaveBeenCalledWith(vitest_1.expect.objectContaining({ error: 'Número não conectado' }));
        });
    });
    (0, vitest_1.describe)('POST /:id/disconnect', () => {
        (0, vitest_1.it)('should disconnect a number successfully', async () => {
            const req = (0, helpers_1.mockAuthRequest)({ params: { id: 'number-1' } });
            const res = (0, helpers_1.mockResponse)();
            helpers_1.prismaMock.whatsAppNumber.findUnique.mockResolvedValue(mockNumber);
            helpers_1.prismaMock.whatsAppNumber.update.mockResolvedValue({
                ...mockNumber,
                status: 'DISCONNECTED',
                qrcode: null,
            });
            await simulateRequest('post', '/:id/disconnect', req, res);
            (0, vitest_1.expect)(res.json).toHaveBeenCalledWith(vitest_1.expect.objectContaining({ message: 'Número desconectado' }));
        });
        (0, vitest_1.it)('should return 404 when number not found', async () => {
            const req = (0, helpers_1.mockAuthRequest)({ params: { id: 'nonexistent' } });
            const res = (0, helpers_1.mockResponse)();
            helpers_1.prismaMock.whatsAppNumber.findUnique.mockResolvedValue(null);
            await simulateRequest('post', '/:id/disconnect', req, res);
            (0, vitest_1.expect)(res.status).toHaveBeenCalledWith(404);
        });
    });
    (0, vitest_1.describe)('DELETE /:id', () => {
        (0, vitest_1.it)('should delete a number successfully', async () => {
            const req = (0, helpers_1.mockAuthRequest)({ params: { id: 'number-1' } });
            const res = (0, helpers_1.mockResponse)();
            helpers_1.prismaMock.whatsAppNumber.findUnique.mockResolvedValue(mockNumber);
            helpers_1.prismaMock.whatsAppNumber.delete.mockResolvedValue(mockNumber);
            await simulateRequest('delete', '/:id', req, res);
            (0, vitest_1.expect)(res.json).toHaveBeenCalledWith(vitest_1.expect.objectContaining({ message: 'Número removido' }));
        });
    });
    (0, vitest_1.describe)('GET /:id/qrcode', () => {
        (0, vitest_1.it)('should return QR code for a number', async () => {
            const req = (0, helpers_1.mockAuthRequest)({ params: { id: 'number-1' } });
            const res = (0, helpers_1.mockResponse)();
            helpers_1.prismaMock.whatsAppNumber.findUnique.mockResolvedValue(mockNumber);
            await simulateRequest('get', '/:id/qrcode', req, res);
            (0, vitest_1.expect)(res.json).toHaveBeenCalledWith(vitest_1.expect.objectContaining({
                qrcode: 'qrcode-data',
                status: 'CONNECTED',
            }));
        });
        (0, vitest_1.it)('should return 404 when number not found', async () => {
            const req = (0, helpers_1.mockAuthRequest)({ params: { id: 'nonexistent' } });
            const res = (0, helpers_1.mockResponse)();
            helpers_1.prismaMock.whatsAppNumber.findUnique.mockResolvedValue(null);
            await simulateRequest('get', '/:id/qrcode', req, res);
            (0, vitest_1.expect)(res.status).toHaveBeenCalledWith(404);
        });
    });
    (0, vitest_1.describe)('GET /:id/status', () => {
        (0, vitest_1.it)('should return connection status', async () => {
            const req = (0, helpers_1.mockAuthRequest)({ params: { id: 'number-1' } });
            const res = (0, helpers_1.mockResponse)();
            helpers_1.prismaMock.whatsAppNumber.findUnique.mockResolvedValue(mockNumber);
            await simulateRequest('get', '/:id/status', req, res);
            (0, vitest_1.expect)(res.json).toHaveBeenCalledWith(vitest_1.expect.objectContaining({
                status: 'CONNECTED',
            }));
        });
    });
    (0, vitest_1.describe)('Error handling', () => {
        (0, vitest_1.it)('should handle database errors gracefully listing numbers', async () => {
            const req = (0, helpers_1.mockAuthRequest)();
            const res = (0, helpers_1.mockResponse)();
            helpers_1.prismaMock.user.findUnique.mockRejectedValue(new Error('DB Error'));
            await simulateRequest('get', '/', req, res);
            (0, vitest_1.expect)(res.status).toHaveBeenCalledWith(500);
        });
        (0, vitest_1.it)('should handle errors when sending message fails', async () => {
            const req = (0, helpers_1.mockAuthRequest)({
                params: { id: 'number-1' },
                body: { to: '5511999999991', message: 'Hello!' },
            });
            const res = (0, helpers_1.mockResponse)();
            helpers_1.prismaMock.whatsAppNumber.findUnique.mockRejectedValue(new Error('DB Error'));
            await simulateRequest('post', '/:id/send', req, res);
            (0, vitest_1.expect)(res.status).toHaveBeenCalledWith(500);
        });
    });
});
//# sourceMappingURL=whatsapp.test.js.map