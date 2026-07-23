"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const vitest_1 = require("vitest");
const helpers_1 = require("./helpers");
const payments_1 = __importDefault(require("../routes/payments"));
// Mock the payment service
vitest_1.vi.mock('../services/payment', () => ({
    PLANS: {
        STARTER: { name: 'IA Starter', amount: 9700 },
        PRO: { name: 'IA Pro', amount: 19700 },
        ENTERPRISE: { name: 'Enterprise', amount: 49700 },
    },
    createCheckoutPreference: vitest_1.vi.fn().mockResolvedValue({
        url: 'https://checkout.mercadopago.com/test',
        preferenceId: 'pref_123',
    }),
    createSubscription: vitest_1.vi.fn().mockResolvedValue({
        url: 'https://subscription.mercadopago.com/test',
        preapprovalId: 'preapp_123',
    }),
    getPaymentInfo: vitest_1.vi.fn().mockResolvedValue({
        id: 'pay_123',
        status: 'approved',
        payer: { email: 'test@email.com' },
        metadata: { plan: 'PRO' },
    }),
    getPreapprovalInfo: vitest_1.vi.fn().mockResolvedValue({
        id: 'preapp_123',
        status: 'authorized',
    }),
    handleWebhookNotification: vitest_1.vi.fn().mockResolvedValue(undefined),
    getMpStatus: vitest_1.vi.fn().mockReturnValue({ configured: true, canCheckout: true }),
    getCustomerPanelUrl: vitest_1.vi.fn().mockReturnValue('https://www.mercadopago.com.br/subscriptions'),
    recordPayment: vitest_1.vi.fn().mockResolvedValue(undefined),
}));
function simulateRequest(method, path, req, res) {
    const route = payments_1.default.stack.find((layer) => {
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
(0, vitest_1.describe)('Payments Routes', () => {
    (0, vitest_1.beforeEach)(() => {
        (0, helpers_1.mockPrismaClear)();
    });
    const mockOrg = {
        id: 'test-org-id',
        name: 'Test Org',
        plan: 'PRO',
        logo: null,
        mpCustomerId: 'cus_test',
        mpSubscriptionId: 'sub_123',
        mpSubscriptionStatus: 'active',
        mpCurrentPeriodEnd: new Date(Date.now() + 30 * 86400000),
        createdAt: new Date(),
        updatedAt: new Date(),
    };
    (0, vitest_1.describe)('GET /config', () => {
        (0, vitest_1.it)('should return MP config with public key and plans', async () => {
            const req = (0, helpers_1.mockAuthRequest)();
            const res = (0, helpers_1.mockResponse)();
            await simulateRequest('get', '/config', req, res);
            (0, vitest_1.expect)(res.json).toHaveBeenCalledWith(vitest_1.expect.objectContaining({
                publicKey: '',
                plans: vitest_1.expect.arrayContaining([
                    vitest_1.expect.objectContaining({ id: 'STARTER', name: 'IA Starter' }),
                    vitest_1.expect.objectContaining({ id: 'PRO', name: 'IA Pro' }),
                    vitest_1.expect.objectContaining({ id: 'ENTERPRISE', name: 'Enterprise' }),
                ]),
            }));
        });
    });
    (0, vitest_1.describe)('GET /status', () => {
        (0, vitest_1.it)('should return Mercado Pago configuration status', async () => {
            const req = (0, helpers_1.mockAuthRequest)();
            const res = (0, helpers_1.mockResponse)();
            await simulateRequest('get', '/status', req, res);
            (0, vitest_1.expect)(res.json).toHaveBeenCalledWith(vitest_1.expect.objectContaining({ configured: true }));
        });
    });
    (0, vitest_1.describe)('GET /subscription', () => {
        (0, vitest_1.it)('should return current subscription info', async () => {
            const req = (0, helpers_1.mockAuthRequest)();
            const res = (0, helpers_1.mockResponse)();
            helpers_1.prismaMock.user.findUnique.mockResolvedValue((0, helpers_1.createTestUser)({ organization: mockOrg }));
            await simulateRequest('get', '/subscription', req, res);
            (0, vitest_1.expect)(res.json).toHaveBeenCalledWith(vitest_1.expect.objectContaining({
                plan: 'FREE',
                planName: 'FREE',
                hasSubscription: true,
                subscriptionId: 'sub_123',
                subscriptionStatus: 'active',
                daysRemaining: vitest_1.expect.any(Number),
            }));
        });
        (0, vitest_1.it)('should return 401 when user not authenticated', async () => {
            const req = (0, helpers_1.mockAuthRequest)({ user: undefined });
            const res = (0, helpers_1.mockResponse)();
            await simulateRequest('get', '/subscription', req, res);
            (0, vitest_1.expect)(res.status).toHaveBeenCalledWith(401);
        });
    });
    (0, vitest_1.describe)('GET /history', () => {
        (0, vitest_1.it)('should return paginated payment history', async () => {
            const req = (0, helpers_1.mockAuthRequest)();
            const res = (0, helpers_1.mockResponse)();
            helpers_1.prismaMock.user.findUnique.mockResolvedValue({
                id: 'test-user-id',
                organizationId: 'test-org-id',
            });
            helpers_1.prismaMock.payment.findMany.mockResolvedValue([
                {
                    id: 'pay-1',
                    amount: 9700,
                    currency: 'brl',
                    status: 'succeeded',
                    plan: 'STARTER',
                    description: 'Assinatura Starter',
                    periodStart: new Date(),
                    periodEnd: new Date(Date.now() + 30 * 86400000),
                    mpPaymentIntentId: 'pi_123',
                    mpInvoiceId: 'in_123',
                    mpSubscriptionId: 'sub_123',
                    organizationId: 'test-org-id',
                    createdAt: new Date(),
                    updatedAt: new Date(),
                },
            ]);
            helpers_1.prismaMock.payment.count.mockResolvedValue(1);
            await simulateRequest('get', '/history', req, res);
            (0, vitest_1.expect)(res.json).toHaveBeenCalledWith(vitest_1.expect.objectContaining({
                payments: vitest_1.expect.arrayContaining([
                    vitest_1.expect.objectContaining({
                        id: 'pay-1',
                        amount: 9700,
                        status: 'succeeded',
                        plan: 'STARTER',
                    }),
                ]),
                pagination: vitest_1.expect.objectContaining({
                    page: 1,
                    total: 1,
                    totalPages: 1,
                }),
            }));
        });
        (0, vitest_1.it)('should return empty array when user has no organization', async () => {
            const req = (0, helpers_1.mockAuthRequest)();
            const res = (0, helpers_1.mockResponse)();
            helpers_1.prismaMock.user.findUnique.mockResolvedValue({
                id: 'test-user-id',
                organizationId: null,
            });
            await simulateRequest('get', '/history', req, res);
            (0, vitest_1.expect)(res.json).toHaveBeenCalledWith(vitest_1.expect.objectContaining({
                payments: [],
                pagination: vitest_1.expect.objectContaining({ page: 1, total: 0 }),
            }));
        });
        (0, vitest_1.it)('should support pagination params', async () => {
            const req = (0, helpers_1.mockAuthRequest)({ query: { page: '2', limit: '10' } });
            const res = (0, helpers_1.mockResponse)();
            helpers_1.prismaMock.user.findUnique.mockResolvedValue({
                id: 'test-user-id',
                organizationId: 'test-org-id',
            });
            helpers_1.prismaMock.payment.findMany.mockResolvedValue([]);
            helpers_1.prismaMock.payment.count.mockResolvedValue(25);
            await simulateRequest('get', '/history', req, res);
            (0, vitest_1.expect)(helpers_1.prismaMock.payment.findMany).toHaveBeenCalledWith(vitest_1.expect.objectContaining({ skip: 10, take: 10 }));
        });
    });
    (0, vitest_1.describe)('GET /invoices', () => {
        (0, vitest_1.it)('should return formatted invoice list', async () => {
            const req = (0, helpers_1.mockAuthRequest)();
            const res = (0, helpers_1.mockResponse)();
            helpers_1.prismaMock.user.findUnique.mockResolvedValue({
                id: 'test-user-id',
                organizationId: 'test-org-id',
            });
            helpers_1.prismaMock.payment.findMany.mockResolvedValue([
                {
                    id: 'pay-1',
                    amount: 9700,
                    currency: 'brl',
                    status: 'succeeded',
                    plan: 'STARTER',
                    description: null,
                    periodStart: new Date(),
                    periodEnd: new Date(Date.now() + 30 * 86400000),
                    mpPaymentIntentId: 'pi_123',
                    mpInvoiceId: 'in_123',
                    mpSubscriptionId: 'sub_123',
                    organizationId: 'test-org-id',
                    createdAt: new Date(),
                    updatedAt: new Date(),
                },
            ]);
            await simulateRequest('get', '/invoices', req, res);
            (0, vitest_1.expect)(res.json).toHaveBeenCalledWith(vitest_1.expect.arrayContaining([
                vitest_1.expect.objectContaining({
                    invoiceNumber: vitest_1.expect.any(String),
                    status: 'paid',
                    plan: 'STARTER',
                }),
            ]));
        });
    });
    (0, vitest_1.describe)('POST /create-checkout', () => {
        (0, vitest_1.it)('should create a Mercado Pago checkout for a valid plan', async () => {
            const req = (0, helpers_1.mockAuthRequest)({ body: { plan: 'PRO' } });
            const res = (0, helpers_1.mockResponse)();
            helpers_1.prismaMock.user.findUnique.mockResolvedValue((0, helpers_1.createTestUser)({ organization: mockOrg }));
            await simulateRequest('post', '/create-checkout', req, res);
            (0, vitest_1.expect)(res.json).toHaveBeenCalledWith(vitest_1.expect.objectContaining({ url: vitest_1.expect.any(String), preapprovalId: vitest_1.expect.any(String) }));
        });
        (0, vitest_1.it)('should reject invalid plan', async () => {
            const req = (0, helpers_1.mockAuthRequest)({ body: { plan: 'INVALID' } });
            const res = (0, helpers_1.mockResponse)();
            await simulateRequest('post', '/create-checkout', req, res);
            (0, vitest_1.expect)(res.status).toHaveBeenCalledWith(400);
            (0, vitest_1.expect)(res.json).toHaveBeenCalledWith(vitest_1.expect.objectContaining({ error: vitest_1.expect.stringContaining('Plano inválido') }));
        });
        (0, vitest_1.it)('should return 401 when user not authenticated', async () => {
            const req = (0, helpers_1.mockAuthRequest)({ user: undefined, body: { plan: 'PRO' } });
            const res = (0, helpers_1.mockResponse)();
            await simulateRequest('post', '/create-checkout', req, res);
            (0, vitest_1.expect)(res.status).toHaveBeenCalledWith(401);
        });
    });
    (0, vitest_1.describe)('POST /portal', () => {
        (0, vitest_1.it)('should return Mercado Pago management URL', async () => {
            const req = (0, helpers_1.mockAuthRequest)();
            const res = (0, helpers_1.mockResponse)();
            helpers_1.prismaMock.user.findUnique.mockResolvedValue((0, helpers_1.createTestUser)({ organization: mockOrg }));
            await simulateRequest('post', '/portal', req, res);
            (0, vitest_1.expect)(res.json).toHaveBeenCalledWith(vitest_1.expect.objectContaining({ url: vitest_1.expect.any(String) }));
        });
        (0, vitest_1.it)('should reject when user has no subscriptions', async () => {
            const req = (0, helpers_1.mockAuthRequest)();
            const res = (0, helpers_1.mockResponse)();
            helpers_1.prismaMock.user.findUnique.mockResolvedValue((0, helpers_1.createTestUser)({ organization: { ...mockOrg, mpCustomerId: null, mpSubscriptionId: null } }));
            await simulateRequest('post', '/portal', req, res);
            (0, vitest_1.expect)(res.status).toHaveBeenCalledWith(400);
        });
    });
    (0, vitest_1.describe)('POST /setup-products', () => {
        (0, vitest_1.it)('should return Mercado Pago plan info', async () => {
            const req = (0, helpers_1.mockAuthRequest)();
            const res = (0, helpers_1.mockResponse)();
            await simulateRequest('post', '/setup-products', req, res);
            (0, vitest_1.expect)(res.json).toHaveBeenCalledWith(vitest_1.expect.objectContaining({
                success: true,
                plans: vitest_1.expect.arrayContaining([
                    vitest_1.expect.objectContaining({ id: 'STARTER' }),
                ]),
            }));
        });
    });
    (0, vitest_1.describe)('Error handling', () => {
        (0, vitest_1.it)('should handle errors gracefully on history', async () => {
            const req = (0, helpers_1.mockAuthRequest)();
            const res = (0, helpers_1.mockResponse)();
            helpers_1.prismaMock.user.findUnique.mockRejectedValue(new Error('DB Error'));
            await simulateRequest('get', '/history', req, res);
            (0, vitest_1.expect)(res.status).toHaveBeenCalledWith(500);
        });
    });
});
//# sourceMappingURL=payments.test.js.map