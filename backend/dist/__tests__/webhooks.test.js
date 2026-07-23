"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const vitest_1 = require("vitest");
const helpers_1 = require("./helpers");
// Mock DNS lookup to prevent actual DNS queries in tests (webhook URL validation)
vitest_1.vi.mock('dns', () => ({
    lookup: vitest_1.vi.fn((hostname, options, callback) => {
        if (typeof options === 'function') {
            callback = options;
            options = 4;
        }
        // Return a public IP that passes SSRF validation
        if (callback) {
            callback(null, { address: '93.184.216.34' }); // example.com
        }
        else {
            return Promise.resolve({ address: '93.184.216.34' });
        }
    }),
    promises: {
        lookup: vitest_1.vi.fn().mockResolvedValue({ address: '93.184.216.34' }),
    },
    promisify: vitest_1.vi.fn(),
}));
const webhooks_1 = __importDefault(require("../routes/webhooks"));
function simulateRequest(method, path, req, res) {
    const route = webhooks_1.default.stack.find((layer) => {
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
(0, vitest_1.describe)('Webhooks Routes', () => {
    (0, vitest_1.beforeEach)(() => {
        (0, helpers_1.mockPrismaClear)();
    });
    const mockWebhook = {
        id: 'wh-1',
        name: 'Notify Sales',
        url: 'https://hooks.example.com/sales',
        events: ['new_lead', 'new_conversation'],
        secret: 'whsec_test',
        isActive: true,
        organizationId: 'test-org-id',
        createdAt: new Date(),
        updatedAt: new Date(),
    };
    (0, vitest_1.describe)('GET /', () => {
        (0, vitest_1.it)('should list all webhooks for the organization', async () => {
            const req = (0, helpers_1.mockAuthRequest)();
            const res = (0, helpers_1.mockResponse)();
            helpers_1.prismaMock.user.findUnique.mockResolvedValue((0, helpers_1.createTestUser)());
            helpers_1.prismaMock.webhook.findMany.mockResolvedValue([mockWebhook]);
            await simulateRequest('get', '/', req, res);
            (0, vitest_1.expect)(res.json).toHaveBeenCalledWith(vitest_1.expect.arrayContaining([
                vitest_1.expect.objectContaining({ id: 'wh-1', name: 'Notify Sales' }),
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
    (0, vitest_1.describe)('POST /', () => {
        (0, vitest_1.it)('should create a new webhook', async () => {
            const req = (0, helpers_1.mockAuthRequest)({
                body: {
                    name: 'New Webhook',
                    url: 'https://api.example.com/webhook',
                    events: ['new_message', 'campaign_completed'],
                    secret: 'mysecret',
                },
            });
            const res = (0, helpers_1.mockResponse)();
            helpers_1.prismaMock.user.findUnique.mockResolvedValue((0, helpers_1.createTestUser)());
            helpers_1.prismaMock.webhook.create.mockResolvedValue({
                ...mockWebhook,
                id: 'wh-2',
                name: 'New Webhook',
                url: 'https://api.example.com/webhook',
                events: ['new_message', 'campaign_completed'],
            });
            await simulateRequest('post', '/', req, res);
            (0, vitest_1.expect)(res.status).toHaveBeenCalledWith(201);
            (0, vitest_1.expect)(res.json).toHaveBeenCalledWith(vitest_1.expect.objectContaining({ name: 'New Webhook' }));
        });
        (0, vitest_1.it)('should reject creation with invalid URL', async () => {
            const req = (0, helpers_1.mockAuthRequest)({
                body: {
                    name: 'Bad Webhook',
                    url: 'http://localhost:3000/internal',
                    events: ['test'],
                },
            });
            const res = (0, helpers_1.mockResponse)();
            helpers_1.prismaMock.user.findUnique.mockResolvedValue((0, helpers_1.createTestUser)());
            await simulateRequest('post', '/', req, res);
            (0, vitest_1.expect)(res.status).toHaveBeenCalledWith(400);
            (0, vitest_1.expect)(res.json).toHaveBeenCalledWith(vitest_1.expect.objectContaining({ error: vitest_1.expect.any(String) }));
        });
        (0, vitest_1.it)('should reject creation when user has no organization', async () => {
            const req = (0, helpers_1.mockAuthRequest)({
                body: { name: 'Test', url: 'https://example.com' },
            });
            const res = (0, helpers_1.mockResponse)();
            helpers_1.prismaMock.user.findUnique.mockResolvedValue((0, helpers_1.createTestUser)({ organizationId: null, organization: null }));
            await simulateRequest('post', '/', req, res);
            (0, vitest_1.expect)(res.status).toHaveBeenCalledWith(400);
            (0, vitest_1.expect)(res.json).toHaveBeenCalledWith(vitest_1.expect.objectContaining({ error: 'Sem organização' }));
        });
        (0, vitest_1.it)('should validate URL against SSRF', async () => {
            const req = (0, helpers_1.mockAuthRequest)({
                body: {
                    name: 'SSRF Test',
                    url: 'http://localhost:3000',
                    events: ['test'],
                },
            });
            const res = (0, helpers_1.mockResponse)();
            helpers_1.prismaMock.user.findUnique.mockResolvedValue((0, helpers_1.createTestUser)());
            await simulateRequest('post', '/', req, res);
            (0, vitest_1.expect)(res.status).toHaveBeenCalledWith(400);
            (0, vitest_1.expect)(res.json).toHaveBeenCalledWith(vitest_1.expect.objectContaining({ error: vitest_1.expect.any(String) }));
        });
    });
    (0, vitest_1.describe)('PUT /:id', () => {
        (0, vitest_1.it)('should update a webhook', async () => {
            const req = (0, helpers_1.mockAuthRequest)({
                params: { id: 'wh-1' },
                body: { name: 'Updated Webhook', isActive: false },
            });
            const res = (0, helpers_1.mockResponse)();
            helpers_1.prismaMock.webhook.findUnique.mockResolvedValue(mockWebhook);
            helpers_1.prismaMock.user.findUnique.mockResolvedValue((0, helpers_1.createTestUser)());
            helpers_1.prismaMock.webhook.update.mockResolvedValue({ ...mockWebhook, name: 'Updated Webhook', isActive: false });
            await simulateRequest('put', '/:id', req, res);
            (0, vitest_1.expect)(res.json).toHaveBeenCalledWith(vitest_1.expect.objectContaining({ name: 'Updated Webhook', isActive: false }));
        });
        (0, vitest_1.it)('should return 404 when webhook not found', async () => {
            const req = (0, helpers_1.mockAuthRequest)({ params: { id: 'nonexistent' }, body: { name: 'Updated' } });
            const res = (0, helpers_1.mockResponse)();
            helpers_1.prismaMock.webhook.findUnique.mockResolvedValue(null);
            await simulateRequest('put', '/:id', req, res);
            (0, vitest_1.expect)(res.status).toHaveBeenCalledWith(404);
        });
    });
    (0, vitest_1.describe)('DELETE /:id', () => {
        (0, vitest_1.it)('should delete a webhook', async () => {
            const req = (0, helpers_1.mockAuthRequest)({ params: { id: 'wh-1' } });
            const res = (0, helpers_1.mockResponse)();
            helpers_1.prismaMock.webhook.findUnique.mockResolvedValue(mockWebhook);
            helpers_1.prismaMock.user.findUnique.mockResolvedValue((0, helpers_1.createTestUser)());
            helpers_1.prismaMock.webhook.delete.mockResolvedValue(mockWebhook);
            await simulateRequest('delete', '/:id', req, res);
            (0, vitest_1.expect)(res.json).toHaveBeenCalledWith(vitest_1.expect.objectContaining({ message: 'Webhook removido' }));
        });
    });
    (0, vitest_1.describe)('POST /:id/test', () => {
        (0, vitest_1.it)('should test a webhook by sending a payload', async () => {
            const req = (0, helpers_1.mockAuthRequest)({ params: { id: 'wh-1' } });
            const res = (0, helpers_1.mockResponse)();
            helpers_1.prismaMock.webhook.findUnique.mockResolvedValue(mockWebhook);
            helpers_1.prismaMock.user.findUnique.mockResolvedValue((0, helpers_1.createTestUser)());
            // Mock fetch to succeed
            global.fetch = vitest_1.vi.fn().mockResolvedValue({ ok: true });
            await simulateRequest('post', '/:id/test', req, res);
            (0, vitest_1.expect)(res.json).toHaveBeenCalledWith(vitest_1.expect.objectContaining({ success: true, message: vitest_1.expect.any(String) }));
        });
        (0, vitest_1.it)('should return 404 when webhook not found', async () => {
            const req = (0, helpers_1.mockAuthRequest)({ params: { id: 'nonexistent' } });
            const res = (0, helpers_1.mockResponse)();
            helpers_1.prismaMock.webhook.findUnique.mockResolvedValue(null);
            await simulateRequest('post', '/:id/test', req, res);
            (0, vitest_1.expect)(res.status).toHaveBeenCalledWith(404);
        });
    });
    (0, vitest_1.describe)('Error handling', () => {
        (0, vitest_1.it)('should handle database errors gracefully', async () => {
            const req = (0, helpers_1.mockAuthRequest)();
            const res = (0, helpers_1.mockResponse)();
            helpers_1.prismaMock.user.findUnique.mockRejectedValue(new Error('DB Error'));
            await simulateRequest('get', '/', req, res);
            (0, vitest_1.expect)(res.status).toHaveBeenCalledWith(500);
        });
    });
});
//# sourceMappingURL=webhooks.test.js.map