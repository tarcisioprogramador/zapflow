"use strict";
/**
 * ═══════════════════════════════════════════════════════════
 * paymentWebhookRouter — HTTP Route Integration Tests
 * ═══════════════════════════════════════════════════════════
 *
 * Tests the actual Express route handler for POST /mercadopago:
 *   - 401 when webhook signature is invalid
 *   - 200 when signature is valid and processing succeeds
 *   - 400 when processing throws an unexpected error
 *
 * ═══════════════════════════════════════════════════════════
 */
Object.defineProperty(exports, "__esModule", { value: true });
const vitest_1 = require("vitest");
const helpers_1 = require("./helpers");
// ─── Mock the payment service ──────────────────────────────
// We mock the service functions to control exactly what the
// route handler receives, without needing a real Mercado Pago
// connection or complex HMAC computation in each test.
//
// IMPORTANT: vi.mock is hoisted, so we use vi.hoisted() to create
// mutable mock references that exist BEFORE the factory runs.
const { mockValidateWebhookSignature, mockHandleWebhookNotification } = vitest_1.vi.hoisted(() => ({
    mockValidateWebhookSignature: vitest_1.vi.fn(),
    mockHandleWebhookNotification: vitest_1.vi.fn(),
}));
vitest_1.vi.mock('../services/payment', () => ({
    validateWebhookSignature: mockValidateWebhookSignature,
    handleWebhookNotification: mockHandleWebhookNotification,
    createCheckoutPreference: vitest_1.vi.fn(),
    createSubscription: vitest_1.vi.fn(),
    getPaymentInfo: vitest_1.vi.fn(),
    getPreapprovalInfo: vitest_1.vi.fn(),
    getMpStatus: vitest_1.vi.fn(),
    getCustomerPanelUrl: vitest_1.vi.fn(),
    recordPayment: vitest_1.vi.fn(),
    PLANS: {
        STARTER: { name: 'IA Starter', amount: 9700 },
        PRO: { name: 'IA Pro', amount: 19700 },
        ENTERPRISE: { name: 'Enterprise', amount: 49700 },
    },
}));
// ─── Import the webhook router after mocks are set up ──────
const payments_1 = require("../routes/payments");
// ─── Helper: simulate a POST request to the webhook route ──
function simulateWebhookRequest(req, res) {
    // The webhookRouter has a single route: POST /mercadopago
    // Find its handler in the router stack
    const route = payments_1.paymentWebhookRouter.stack.find((layer) => {
        if (!layer.route)
            return false;
        return layer.route.path === '/mercadopago' && layer.route.methods.post;
    });
    if (!route) {
        throw new Error('Route POST /mercadopago not found on paymentWebhookRouter');
    }
    const handler = route.route.stack[route.route.stack.length - 1].handle;
    return handler(req, res, () => { });
}
function buildRequest(overrides = {}) {
    return {
        headers: { 'content-type': 'application/json' },
        query: {},
        body: {
            type: 'payment',
            action: 'payment.created',
            data: { id: 'pay_test_123' },
        },
        get: vitest_1.vi.fn().mockReturnValue('localhost:3001'),
        protocol: 'https',
        ...overrides,
    };
}
// ═══════════════════════════════════════════════════════════
// Tests
// ═══════════════════════════════════════════════════════════
(0, vitest_1.describe)('paymentWebhookRouter — POST /mercadopago', () => {
    (0, vitest_1.beforeEach)(() => {
        vitest_1.vi.clearAllMocks();
    });
    // ─── 401: Invalid signature ────────────────────
    (0, vitest_1.describe)('401 — Invalid webhook signature', () => {
        (0, vitest_1.it)('should return 401 when signature validation fails', async () => {
            mockValidateWebhookSignature.mockReturnValue({
                valid: false,
                reason: 'Header x-signature ausente',
            });
            const req = buildRequest();
            const res = (0, helpers_1.mockResponse)();
            await simulateWebhookRequest(req, res);
            (0, vitest_1.expect)(res.status).toHaveBeenCalledWith(401);
            (0, vitest_1.expect)(res.json).toHaveBeenCalledWith(vitest_1.expect.objectContaining({
                error: 'Assinatura inválida',
                reason: 'Header x-signature ausente',
            }));
            // Should NOT have attempted to process the notification
            (0, vitest_1.expect)(mockHandleWebhookNotification).not.toHaveBeenCalled();
        });
        (0, vitest_1.it)('should return 401 with empty reason string when reason is empty', async () => {
            mockValidateWebhookSignature.mockReturnValue({
                valid: false,
                reason: '',
            });
            const req = buildRequest();
            const res = (0, helpers_1.mockResponse)();
            await simulateWebhookRequest(req, res);
            (0, vitest_1.expect)(res.status).toHaveBeenCalledWith(401);
            (0, vitest_1.expect)(res.json).toHaveBeenCalledWith(vitest_1.expect.objectContaining({ error: 'Assinatura inválida' }));
        });
        (0, vitest_1.it)('should return 401 when x-signature format is wrong', async () => {
            mockValidateWebhookSignature.mockReturnValue({
                valid: false,
                reason: 'Formato do x-signature inválido',
            });
            const req = buildRequest({
                headers: {
                    'x-signature': 'garbage-data',
                    'content-type': 'application/json',
                },
            });
            const res = (0, helpers_1.mockResponse)();
            await simulateWebhookRequest(req, res);
            (0, vitest_1.expect)(res.status).toHaveBeenCalledWith(401);
            (0, vitest_1.expect)(res.json).toHaveBeenCalledWith(vitest_1.expect.objectContaining({ reason: vitest_1.expect.stringContaining('Formato') }));
        });
        (0, vitest_1.it)('should return 401 when hash does not match', async () => {
            mockValidateWebhookSignature.mockReturnValue({
                valid: false,
                reason: 'Assinatura inválida (hash não confere)',
            });
            const req = buildRequest({
                headers: {
                    'x-signature': 'ts=1234567890,v1=badhash',
                    'content-type': 'application/json',
                },
            });
            const res = (0, helpers_1.mockResponse)();
            await simulateWebhookRequest(req, res);
            (0, vitest_1.expect)(res.status).toHaveBeenCalledWith(401);
        });
        (0, vitest_1.it)('should return 401 when timestamp is expired (replay attack)', async () => {
            mockValidateWebhookSignature.mockReturnValue({
                valid: false,
                reason: 'Timestamp do webhook expirado ou inválido (replay attack?)',
            });
            const req = buildRequest();
            const res = (0, helpers_1.mockResponse)();
            await simulateWebhookRequest(req, res);
            (0, vitest_1.expect)(res.status).toHaveBeenCalledWith(401);
        });
        (0, vitest_1.it)('should return 401 when data.id is missing from request', async () => {
            mockValidateWebhookSignature.mockReturnValue({
                valid: false,
                reason: 'data.id não encontrado na requisição',
            });
            const req = buildRequest({ body: { type: 'payment' } });
            const res = (0, helpers_1.mockResponse)();
            await simulateWebhookRequest(req, res);
            (0, vitest_1.expect)(res.status).toHaveBeenCalledWith(401);
        });
    });
    // ─── 200: Successful processing ─────────────────
    (0, vitest_1.describe)('200 — Successful webhook processing', () => {
        (0, vitest_1.it)('should return 200 when signature is valid and processing succeeds', async () => {
            mockValidateWebhookSignature.mockReturnValue({ valid: true });
            mockHandleWebhookNotification.mockResolvedValue(undefined);
            const req = buildRequest();
            const res = (0, helpers_1.mockResponse)();
            await simulateWebhookRequest(req, res);
            (0, vitest_1.expect)(res.status).toHaveBeenCalledWith(200);
            (0, vitest_1.expect)(res.json).toHaveBeenCalledWith({ received: true });
            // Notification was processed
            (0, vitest_1.expect)(mockHandleWebhookNotification).toHaveBeenCalledTimes(1);
            (0, vitest_1.expect)(mockHandleWebhookNotification).toHaveBeenCalledWith(req.body);
        });
        (0, vitest_1.it)('should pass the full request body to handleWebhookNotification', async () => {
            const notificationBody = {
                type: 'payment',
                action: 'payment.created',
                data: { id: 'pay_999' },
            };
            mockValidateWebhookSignature.mockReturnValue({ valid: true });
            mockHandleWebhookNotification.mockResolvedValue(undefined);
            const req = buildRequest({ body: notificationBody });
            const res = (0, helpers_1.mockResponse)();
            await simulateWebhookRequest(req, res);
            (0, vitest_1.expect)(mockHandleWebhookNotification).toHaveBeenCalledWith(notificationBody);
            (0, vitest_1.expect)(res.status).toHaveBeenCalledWith(200);
        });
        (0, vitest_1.it)('should work with subscription_preapproval notification type', async () => {
            const subBody = {
                type: 'subscription_preapproval',
                action: 'preapproval.created',
                data: { id: 'preapp_456' },
            };
            mockValidateWebhookSignature.mockReturnValue({ valid: true });
            mockHandleWebhookNotification.mockResolvedValue(undefined);
            const req = buildRequest({ body: subBody });
            const res = (0, helpers_1.mockResponse)();
            await simulateWebhookRequest(req, res);
            (0, vitest_1.expect)(mockHandleWebhookNotification).toHaveBeenCalledWith(subBody);
            (0, vitest_1.expect)(res.status).toHaveBeenCalledWith(200);
        });
    });
    // ─── 400: Unexpected error during processing ────
    (0, vitest_1.describe)('400 — Unexpected processing error', () => {
        (0, vitest_1.it)('should return 400 when handleWebhookNotification throws', async () => {
            mockValidateWebhookSignature.mockReturnValue({ valid: true });
            mockHandleWebhookNotification.mockRejectedValue(new Error('Falha na comunicação com Mercado Pago'));
            const req = buildRequest();
            const res = (0, helpers_1.mockResponse)();
            await simulateWebhookRequest(req, res);
            (0, vitest_1.expect)(res.status).toHaveBeenCalledWith(400);
            (0, vitest_1.expect)(res.send).toHaveBeenCalledWith(vitest_1.expect.stringContaining('Webhook Error'));
        });
        (0, vitest_1.it)('should return 400 when validateWebhookSignature itself throws', async () => {
            mockValidateWebhookSignature.mockImplementation(() => {
                throw new Error('Unexpected validation crash');
            });
            const req = buildRequest();
            const res = (0, helpers_1.mockResponse)();
            await simulateWebhookRequest(req, res);
            (0, vitest_1.expect)(res.status).toHaveBeenCalledWith(400);
            (0, vitest_1.expect)(res.send).toHaveBeenCalledWith(vitest_1.expect.stringContaining('Webhook Error'));
        });
    });
    // ─── Input validation ──────────────────────────
    (0, vitest_1.describe)('Input handling', () => {
        (0, vitest_1.it)('should handle empty body gracefully', async () => {
            mockValidateWebhookSignature.mockReturnValue({ valid: true });
            mockHandleWebhookNotification.mockResolvedValue(undefined);
            const req = buildRequest({ body: {} });
            const res = (0, helpers_1.mockResponse)();
            await simulateWebhookRequest(req, res);
            // Empty body is passed to handler (handleWebhookNotification
            // handles unknown types without crashing)
            (0, vitest_1.expect)(mockHandleWebhookNotification).toHaveBeenCalledWith({});
            (0, vitest_1.expect)(res.status).toHaveBeenCalledWith(200);
        });
        (0, vitest_1.it)('should handle null headers gracefully', async () => {
            // When headers are null/undefined, the route handler
            // casts them, and validateWebhookSignature receives an
            // empty object
            const req = buildRequest({ headers: null });
            const res = (0, helpers_1.mockResponse)();
            await simulateWebhookRequest(req, res);
            // Should still call validateWebhookSignature and handle the result
            (0, vitest_1.expect)(mockValidateWebhookSignature).toHaveBeenCalled();
        });
    });
});
//# sourceMappingURL=payment-webhook-route.test.js.map