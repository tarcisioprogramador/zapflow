"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const vitest_1 = require("vitest");
const helpers_1 = require("./helpers");
const tracking_1 = __importDefault(require("../routes/tracking"));
function simulateRequest(method, path, req, res) {
    const route = tracking_1.default.stack.find((layer) => {
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
(0, vitest_1.describe)('Tracking Routes', () => {
    (0, vitest_1.beforeEach)(() => {
        (0, helpers_1.mockPrismaClear)();
    });
    (0, vitest_1.describe)('POST /lead', () => {
        (0, vitest_1.it)('should capture a new lead with UTM parameters', async () => {
            const req = (0, helpers_1.mockAuthRequest)({
                body: {
                    name: 'Web Visitor',
                    phone: '+5511999999991',
                    email: 'visitor@email.com',
                    utmSource: 'google_ads',
                    utmMedium: 'cpc',
                    utmCampaign: 'summer_sale',
                    adId: 'ad-123',
                    adTitle: 'Summer Promo',
                },
            });
            const res = (0, helpers_1.mockResponse)();
            helpers_1.prismaMock.contact.findFirst.mockResolvedValue(null);
            helpers_1.prismaMock.contact.create.mockResolvedValue({
                id: 'lead-1',
                name: 'Web Visitor',
                phone: '+5511999999991',
                email: 'visitor@email.com',
                company: null,
                tags: '[]',
                notes: null,
                utmSource: 'google_ads',
                utmMedium: 'cpc',
                utmCampaign: 'summer_sale',
                adId: 'ad-123',
                adTitle: 'Summer Promo',
                userId: 'test-user-id',
                createdAt: new Date(),
                updatedAt: new Date(),
            });
            await simulateRequest('post', '/lead', req, res);
            (0, vitest_1.expect)(res.status).toHaveBeenCalledWith(201);
            (0, vitest_1.expect)(res.json).toHaveBeenCalledWith(vitest_1.expect.objectContaining({
                success: true,
                contactId: 'lead-1',
                message: vitest_1.expect.any(String),
            }));
        });
        (0, vitest_1.it)('should update existing contact when phone matches', async () => {
            const req = (0, helpers_1.mockAuthRequest)({
                body: {
                    name: 'Returning Visitor',
                    phone: '+5511999999991',
                    utmSource: 'facebook',
                },
            });
            const res = (0, helpers_1.mockResponse)();
            helpers_1.prismaMock.contact.findFirst.mockResolvedValue({
                id: 'existing-contact',
                name: 'Old Name',
                phone: '+5511999999991',
                email: 'old@email.com',
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
            });
            helpers_1.prismaMock.contact.update.mockResolvedValue({
                id: 'existing-contact',
                name: 'Returning Visitor',
                phone: '+5511999999991',
                email: 'old@email.com',
                company: null,
                tags: '[]',
                notes: null,
                utmSource: 'facebook',
                utmMedium: null,
                utmCampaign: null,
                adId: null,
                adTitle: null,
                userId: 'test-user-id',
                createdAt: new Date(),
                updatedAt: new Date(),
            });
            await simulateRequest('post', '/lead', req, res);
            (0, vitest_1.expect)(res.status).toHaveBeenCalledWith(201);
            (0, vitest_1.expect)(helpers_1.prismaMock.contact.update).toHaveBeenCalled();
            (0, vitest_1.expect)(helpers_1.prismaMock.contact.create).not.toHaveBeenCalled();
        });
        (0, vitest_1.it)('should reject lead without phone or email', async () => {
            const req = (0, helpers_1.mockAuthRequest)({ body: { name: 'No Contact' } });
            const res = (0, helpers_1.mockResponse)();
            await simulateRequest('post', '/lead', req, res);
            (0, vitest_1.expect)(res.status).toHaveBeenCalledWith(400);
            (0, vitest_1.expect)(res.json).toHaveBeenCalledWith(vitest_1.expect.objectContaining({ error: 'Telefone ou email são obrigatórios' }));
        });
        (0, vitest_1.it)('should reject invalid email format', async () => {
            const req = (0, helpers_1.mockAuthRequest)({
                body: { email: 'invalid-email', name: 'Bad Email' },
            });
            const res = (0, helpers_1.mockResponse)();
            await simulateRequest('post', '/lead', req, res);
            (0, vitest_1.expect)(res.status).toHaveBeenCalledWith(400);
            (0, vitest_1.expect)(res.json).toHaveBeenCalledWith(vitest_1.expect.objectContaining({ error: 'Email inválido' }));
        });
        (0, vitest_1.it)('should clean phone number formatting', async () => {
            const req = (0, helpers_1.mockAuthRequest)({
                body: { phone: '+55 (11) 99999-9991', name: 'Formatted Phone' },
            });
            const res = (0, helpers_1.mockResponse)();
            helpers_1.prismaMock.contact.findFirst.mockResolvedValue(null);
            helpers_1.prismaMock.contact.create.mockResolvedValue({
                id: 'lead-1',
                name: 'Formatted Phone',
                phone: '+5511999999991',
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
            });
            await simulateRequest('post', '/lead', req, res);
            (0, vitest_1.expect)(helpers_1.prismaMock.contact.create).toHaveBeenCalledWith(vitest_1.expect.objectContaining({
                data: vitest_1.expect.objectContaining({ phone: '+5511999999991' }),
            }));
        });
    });
    (0, vitest_1.describe)('GET /stats', () => {
        (0, vitest_1.it)('should return tracking statistics', async () => {
            const req = (0, helpers_1.mockAuthRequest)();
            const res = (0, helpers_1.mockResponse)();
            helpers_1.prismaMock.contact.count.mockResolvedValue(100);
            helpers_1.prismaMock.contact.groupBy.mockResolvedValue([
                { utmSource: 'google_ads', _count: 30 },
                { utmSource: 'facebook', _count: 20 },
                { utmSource: 'organic', _count: 50 },
            ]);
            await simulateRequest('get', '/stats', req, res);
            (0, vitest_1.expect)(res.json).toHaveBeenCalledWith(vitest_1.expect.objectContaining({
                totalLeads: 100,
                leadsWithUTM: vitest_1.expect.any(Number),
                leadsBySource: vitest_1.expect.arrayContaining([
                    vitest_1.expect.objectContaining({ source: 'google_ads', count: 30 }),
                    vitest_1.expect.objectContaining({ source: 'facebook', count: 20 }),
                ]),
            }));
        });
    });
    (0, vitest_1.describe)('Error handling', () => {
        (0, vitest_1.it)('should handle database errors gracefully on lead capture', async () => {
            const req = (0, helpers_1.mockAuthRequest)({ body: { phone: '+5511999999991' } });
            const res = (0, helpers_1.mockResponse)();
            helpers_1.prismaMock.contact.findFirst.mockRejectedValue(new Error('DB Error'));
            await simulateRequest('post', '/lead', req, res);
            (0, vitest_1.expect)(res.status).toHaveBeenCalledWith(500);
        });
        (0, vitest_1.it)('should handle errors on stats endpoint', async () => {
            const req = (0, helpers_1.mockAuthRequest)();
            const res = (0, helpers_1.mockResponse)();
            helpers_1.prismaMock.contact.count.mockRejectedValue(new Error('DB Error'));
            await simulateRequest('get', '/stats', req, res);
            (0, vitest_1.expect)(res.status).toHaveBeenCalledWith(500);
        });
    });
});
//# sourceMappingURL=tracking.test.js.map