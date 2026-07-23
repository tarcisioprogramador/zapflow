"use strict";
/**
 * ═══════════════════════════════════════════════════════════
 * Mercado Pago — Webhook Tests
 * ═══════════════════════════════════════════════════════════
 *
 * Tests for:
 *   - validateWebhookSignature() — HMAC-SHA256 validation
 *   - handleWebhookNotification() — payment & subscription events
 *
 * ═══════════════════════════════════════════════════════════
 */
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const vitest_1 = require("vitest");
const crypto_1 = __importDefault(require("crypto"));
const helpers_1 = require("./helpers");
// ─── Hoisted mock references (runs BEFORE vi.mock factories) ──
// These let us control what the mercadopago SDK returns from tests
const { mockPaymentGet, mockPreapprovalGet } = vitest_1.vi.hoisted(() => {
    const paymentGet = vitest_1.vi.fn();
    const preapprovalGet = vitest_1.vi.fn();
    return {
        mockPaymentGet: paymentGet,
        mockPreapprovalGet: preapprovalGet,
    };
});
// ─── Mocks ────────────────────────────────────────────────
vitest_1.vi.mock('../config/database', () => ({
    default: helpers_1.prismaMock,
    prisma: helpers_1.prismaMock,
}));
vitest_1.vi.mock('mercadopago', () => ({
    MercadoPagoConfig: vitest_1.vi.fn(),
    Preference: vitest_1.vi.fn(),
    PreApproval: vitest_1.vi.fn().mockImplementation(function () {
        return {
            create: vitest_1.vi.fn(),
            get: mockPreapprovalGet,
        };
    }),
    Payment: vitest_1.vi.fn().mockImplementation(function () {
        return {
            get: mockPaymentGet,
        };
    }),
}));
// ─── Helpers ──────────────────────────────────────────────
/** Compute a valid Mercado Pago x-signature for testing */
function computeSignature(dataId, secret, ts, requestId) {
    const manifest = requestId
        ? `id:${dataId};request-id:${requestId};ts:${ts};`
        : `id:${dataId};ts:${ts};`;
    const hmac = crypto_1.default.createHmac('sha256', secret).update(manifest, 'utf8').digest('hex');
    return `ts=${ts},v1=${hmac}`;
}
/** Build a mock Express-compatible request for validateWebhookSignature */
function mockWebhookRequest(overrides = {}) {
    const ts = overrides.timestamp ?? Date.now();
    const dataId = overrides.dataId ?? 'pay_test_123';
    return {
        headers: {
            'x-signature': overrides.signature ?? computeSignature(dataId, 'test-secret', ts, overrides.requestId),
            'x-request-id': overrides.requestId,
            'content-type': 'application/json',
        },
        query: { 'data.id': dataId },
        body: overrides.body ?? {
            type: 'payment',
            action: 'payment.created',
            data: { id: dataId },
        },
    };
}
/** Mock payment info returned by Mercado Pago API */
function mockPaymentInfo(overrides = {}) {
    return {
        id: 'pay_test_123',
        status: 'approved',
        status_detail: 'accredited',
        transaction_amount: 197.0,
        payer: { email: 'cliente@email.com' },
        payment_method: { id: 'pix' },
        external_reference: JSON.stringify({
            userId: 'test-user-id',
            organizationId: 'test-org-id',
            plan: 'PRO',
        }),
        metadata: { plan: 'PRO' },
        ...overrides,
    };
}
/** Mock preapproval info returned by Mercado Pago API */
function mockPreapprovalInfo(overrides = {}) {
    return {
        id: 'preapp_test_123',
        status: 'authorized',
        external_reference: JSON.stringify({
            userId: 'test-user-id',
            organizationId: 'test-org-id',
            plan: 'PRO',
        }),
        ...overrides,
    };
}
// ─── Module imports — AFTER mocks, WITH env var set ──────
const WEBHOOK_SECRET = 'test-secret';
let validateWebhookSignature;
let handleWebhookNotification;
(0, vitest_1.beforeAll)(async () => {
    process.env.MP_WEBHOOK_SECRET = WEBHOOK_SECRET;
    process.env.MP_ACCESS_TOKEN = 'test-access-token'; // needed for getPaymentInfo/getPreapprovalInfo client check
    const mod = await Promise.resolve().then(() => __importStar(require('../services/payment')));
    validateWebhookSignature = mod.validateWebhookSignature;
    handleWebhookNotification = mod.handleWebhookNotification;
});
(0, vitest_1.afterAll)(() => {
    delete process.env.MP_WEBHOOK_SECRET;
    delete process.env.MP_ACCESS_TOKEN;
});
(0, vitest_1.beforeEach)(() => {
    (0, helpers_1.mockPrismaClear)();
});
// ═══════════════════════════════════════════════════════════
// validateWebhookSignature
// ═══════════════════════════════════════════════════════════
(0, vitest_1.describe)('validateWebhookSignature()', () => {
    (0, vitest_1.it)('should return valid=true when signature matches', () => {
        const req = mockWebhookRequest();
        const result = validateWebhookSignature(req);
        (0, vitest_1.expect)(result.valid).toBe(true);
        (0, vitest_1.expect)(result.reason).toBeUndefined();
    });
    (0, vitest_1.it)('should include x-request-id in manifest when present', () => {
        const req = mockWebhookRequest({ requestId: 'req-abc-123' });
        const result = validateWebhookSignature(req);
        (0, vitest_1.expect)(result.valid).toBe(true);
    });
    (0, vitest_1.it)('should return invalid when x-signature header is missing', () => {
        const req = mockWebhookRequest();
        delete req.headers['x-signature'];
        const result = validateWebhookSignature(req);
        (0, vitest_1.expect)(result.valid).toBe(false);
        (0, vitest_1.expect)(result.reason).toContain('x-signature');
    });
    (0, vitest_1.it)('should return invalid when x-signature format is wrong', () => {
        const req = mockWebhookRequest({ signature: 'garbage-data' });
        const result = validateWebhookSignature(req);
        (0, vitest_1.expect)(result.valid).toBe(false);
        (0, vitest_1.expect)(result.reason).toContain('Formato');
    });
    (0, vitest_1.it)('should return invalid when data.id is missing', () => {
        const req = mockWebhookRequest({ dataId: '' });
        req.query = {};
        req.body.data.id = undefined;
        const result = validateWebhookSignature(req);
        (0, vitest_1.expect)(result.valid).toBe(false);
        (0, vitest_1.expect)(result.reason).toContain('data.id');
    });
    (0, vitest_1.it)('should return invalid when signature hash does not match', () => {
        const ts = Date.now();
        const dataId = 'pay_test_123';
        const wrongSig = computeSignature(dataId, 'wrong-secret', ts);
        const req = mockWebhookRequest({ signature: wrongSig, timestamp: ts, dataId });
        const result = validateWebhookSignature(req);
        (0, vitest_1.expect)(result.valid).toBe(false);
        (0, vitest_1.expect)(result.reason).toContain('Assinatura inválida');
    });
    (0, vitest_1.it)('should return invalid when timestamp is too old (>5 min)', () => {
        const oldTs = Date.now() - 6 * 60 * 1000; // 6 minutes ago — past the 5 min window
        const sig = computeSignature('pay_test_123', WEBHOOK_SECRET, oldTs);
        const req = mockWebhookRequest({ signature: sig, timestamp: oldTs });
        const result = validateWebhookSignature(req);
        (0, vitest_1.expect)(result.valid).toBe(false);
        (0, vitest_1.expect)(result.reason).toContain('Timestamp');
        (0, vitest_1.expect)(result.reason).toContain('expirado');
    });
    (0, vitest_1.it)('should return invalid when timestamp is NaN', () => {
        const sig = `ts=not-a-number,v1=abc123`;
        const req = mockWebhookRequest({ signature: sig });
        const result = validateWebhookSignature(req);
        (0, vitest_1.expect)(result.valid).toBe(false);
    });
    (0, vitest_1.it)('should extract data.id from body when query param is missing', () => {
        const ts = Date.now();
        const dataId = 'pay_from_body';
        const sig = computeSignature(dataId, WEBHOOK_SECRET, ts);
        const req = mockWebhookRequest({ signature: sig, timestamp: ts, dataId });
        req.query = {};
        req.body.data.id = dataId;
        const result = validateWebhookSignature(req);
        (0, vitest_1.expect)(result.valid).toBe(true);
    });
    (0, vitest_1.it)('should extract data.id from data_id query param as fallback', () => {
        const ts = Date.now();
        const dataId = 'pay_alt_id';
        const sig = computeSignature(dataId, WEBHOOK_SECRET, ts);
        const req = mockWebhookRequest({ signature: sig, timestamp: ts, dataId });
        req.query = { data_id: dataId };
        delete req.query['data.id'];
        const result = validateWebhookSignature(req);
        (0, vitest_1.expect)(result.valid).toBe(true);
    });
});
// ═══════════════════════════════════════════════════════════
// handleWebhookNotification — payment events
// ═══════════════════════════════════════════════════════════
(0, vitest_1.describe)('handleWebhookNotification() — payment events', () => {
    (0, vitest_1.beforeEach)(() => {
        mockPaymentGet.mockReset();
        mockPreapprovalGet.mockReset();
    });
    (0, vitest_1.it)('should process payment.approved — update org, user, and record payment', async () => {
        const paymentInfo = mockPaymentInfo();
        mockPaymentGet.mockResolvedValue(paymentInfo);
        helpers_1.prismaMock.organization.update.mockResolvedValue({ id: 'test-org-id' });
        helpers_1.prismaMock.user.update.mockResolvedValue({ id: 'test-user-id' });
        helpers_1.prismaMock.payment.create.mockResolvedValue({ id: 'pay-record-1' });
        await handleWebhookNotification({
            type: 'payment',
            action: 'payment.created',
            data: { id: 'pay_test_123' },
        });
        // Organization was updated with payer email and plan
        (0, vitest_1.expect)(helpers_1.prismaMock.organization.update).toHaveBeenCalledWith(vitest_1.expect.objectContaining({
            where: { id: 'test-org-id' },
            data: vitest_1.expect.objectContaining({
                mpCustomerId: 'cliente@email.com',
                mpSubscriptionStatus: 'active',
                plan: 'PRO',
            }),
        }));
        // User plan was updated
        (0, vitest_1.expect)(helpers_1.prismaMock.user.update).toHaveBeenCalledWith(vitest_1.expect.objectContaining({
            where: { id: 'test-user-id' },
            data: { plan: 'PRO' },
        }));
        // Payment record created with correct values (converted to cents)
        (0, vitest_1.expect)(helpers_1.prismaMock.payment.create).toHaveBeenCalledWith(vitest_1.expect.objectContaining({
            data: vitest_1.expect.objectContaining({
                organizationId: 'test-org-id',
                amount: 19700,
                status: 'succeeded',
                plan: 'PRO',
            }),
        }));
    });
    (0, vitest_1.it)('should process payment.rejected — record failed payment only', async () => {
        const paymentInfo = mockPaymentInfo({
            status: 'rejected',
            status_detail: 'cc_rejected_other_reason',
            transaction_amount: 97.0,
        });
        mockPaymentGet.mockResolvedValue(paymentInfo);
        helpers_1.prismaMock.payment.create.mockResolvedValue({ id: 'pay-fail-1' });
        await handleWebhookNotification({
            type: 'payment',
            action: 'payment.created',
            data: { id: 'pay_test_123' },
        });
        (0, vitest_1.expect)(helpers_1.prismaMock.payment.create).toHaveBeenCalledWith(vitest_1.expect.objectContaining({
            data: vitest_1.expect.objectContaining({
                amount: 9700,
                status: 'failed',
                description: vitest_1.expect.stringContaining('rejected'),
            }),
        }));
        // Should NOT update organization or user
        (0, vitest_1.expect)(helpers_1.prismaMock.organization.update).not.toHaveBeenCalled();
        (0, vitest_1.expect)(helpers_1.prismaMock.user.update).not.toHaveBeenCalled();
    });
    (0, vitest_1.it)('should handle payment notification without payment ID gracefully', async () => {
        await handleWebhookNotification({
            type: 'payment',
            action: 'payment.created',
            data: {}, // no id
        });
        (0, vitest_1.expect)(helpers_1.prismaMock.payment.create).not.toHaveBeenCalled();
    });
    (0, vitest_1.it)('should process payment.cancelled — record failed payment', async () => {
        const paymentInfo = mockPaymentInfo({
            status: 'cancelled',
            status_detail: 'expired',
        });
        mockPaymentGet.mockResolvedValue(paymentInfo);
        helpers_1.prismaMock.payment.create.mockResolvedValue({ id: 'pay-cancel-1' });
        await handleWebhookNotification({
            type: 'payment',
            action: 'payment.created',
            data: { id: 'pay_test_123' },
        });
        (0, vitest_1.expect)(helpers_1.prismaMock.payment.create).toHaveBeenCalledWith(vitest_1.expect.objectContaining({
            data: vitest_1.expect.objectContaining({ status: 'failed' }),
        }));
    });
    (0, vitest_1.it)('should handle malformed external_reference gracefully', async () => {
        const paymentInfo = mockPaymentInfo({
            external_reference: 'invalid-json{{{',
        });
        mockPaymentGet.mockResolvedValue(paymentInfo);
        await (0, vitest_1.expect)(handleWebhookNotification({
            type: 'payment',
            action: 'payment.created',
            data: { id: 'pay_test_123' },
        })).resolves.not.toThrow();
    });
    (0, vitest_1.it)('should handle payment without organizationId (no external ref) gracefully', async () => {
        const paymentInfo = mockPaymentInfo({
            external_reference: undefined,
        });
        mockPaymentGet.mockResolvedValue(paymentInfo);
        await handleWebhookNotification({
            type: 'payment',
            action: 'payment.created',
            data: { id: 'pay_no_org' },
        });
        // No org ID means nothing to update or record
        (0, vitest_1.expect)(helpers_1.prismaMock.organization.update).not.toHaveBeenCalled();
        (0, vitest_1.expect)(helpers_1.prismaMock.payment.create).not.toHaveBeenCalled();
    });
});
// ═══════════════════════════════════════════════════════════
// handleWebhookNotification — subscription_preapproval events
// ═══════════════════════════════════════════════════════════
(0, vitest_1.describe)('handleWebhookNotification() — subscription events', () => {
    (0, vitest_1.beforeEach)(() => {
        mockPaymentGet.mockReset();
        mockPreapprovalGet.mockReset();
    });
    (0, vitest_1.it)('should process subscription_preapproval (authorized) — update subscription ID', async () => {
        const preapprovalInfo = mockPreapprovalInfo({ status: 'authorized' });
        mockPreapprovalGet.mockResolvedValue(preapprovalInfo);
        helpers_1.prismaMock.organization.update.mockResolvedValue({ id: 'test-org-id' });
        await handleWebhookNotification({
            type: 'subscription_preapproval',
            action: 'preapproval.created',
            data: { id: 'preapp_test_123' },
        });
        (0, vitest_1.expect)(helpers_1.prismaMock.organization.update).toHaveBeenCalledWith(vitest_1.expect.objectContaining({
            where: { id: 'test-org-id' },
            data: {
                mpSubscriptionId: 'preapp_test_123',
                mpSubscriptionStatus: 'active',
                plan: 'PRO',
            },
        }));
    });
    (0, vitest_1.it)('should process subscription_preapproval (active) — same as authorized', async () => {
        const preapprovalInfo = mockPreapprovalInfo({ status: 'active' });
        mockPreapprovalGet.mockResolvedValue(preapprovalInfo);
        helpers_1.prismaMock.organization.update.mockResolvedValue({ id: 'test-org-id' });
        await handleWebhookNotification({
            type: 'subscription_preapproval',
            action: 'preapproval.created',
            data: { id: 'preapp_test_123' },
        });
        (0, vitest_1.expect)(helpers_1.prismaMock.organization.update).toHaveBeenCalledWith(vitest_1.expect.objectContaining({
            data: vitest_1.expect.objectContaining({
                mpSubscriptionStatus: 'active',
            }),
        }));
    });
    (0, vitest_1.it)('should process subscription_preapproval (cancelled) — downgrade users to FREE', async () => {
        const preapprovalInfo = mockPreapprovalInfo({ status: 'cancelled' });
        mockPreapprovalGet.mockResolvedValue(preapprovalInfo);
        helpers_1.prismaMock.organization.update.mockResolvedValue({ id: 'test-org-id' });
        helpers_1.prismaMock.user.updateMany.mockResolvedValue({ count: 3 });
        await handleWebhookNotification({
            type: 'subscription_preapproval',
            action: 'preapproval.cancelled',
            data: { id: 'preapp_test_123' },
        });
        (0, vitest_1.expect)(helpers_1.prismaMock.organization.update).toHaveBeenCalledWith(vitest_1.expect.objectContaining({
            data: { mpSubscriptionStatus: 'canceled' },
        }));
        (0, vitest_1.expect)(helpers_1.prismaMock.user.updateMany).toHaveBeenCalledWith(vitest_1.expect.objectContaining({
            where: { organizationId: 'test-org-id' },
            data: { plan: 'FREE' },
        }));
    });
    (0, vitest_1.it)('should process subscription_preapproval (paused) — set paused status, no downgrade', async () => {
        const preapprovalInfo = mockPreapprovalInfo({ status: 'paused' });
        mockPreapprovalGet.mockResolvedValue(preapprovalInfo);
        helpers_1.prismaMock.organization.update.mockResolvedValue({ id: 'test-org-id' });
        await handleWebhookNotification({
            type: 'subscription_preapproval',
            action: 'preapproval.paused',
            data: { id: 'preapp_test_123' },
        });
        (0, vitest_1.expect)(helpers_1.prismaMock.organization.update).toHaveBeenCalledWith(vitest_1.expect.objectContaining({
            data: { mpSubscriptionStatus: 'paused' },
        }));
        // Should NOT downgrade users on pause — only on cancel
        (0, vitest_1.expect)(helpers_1.prismaMock.user.updateMany).not.toHaveBeenCalled();
    });
    (0, vitest_1.it)('should handle subscription notification without preapproval ID gracefully', async () => {
        await handleWebhookNotification({
            type: 'subscription_preapproval',
            action: 'preapproval.created',
            data: {}, // no id
        });
        (0, vitest_1.expect)(helpers_1.prismaMock.organization.update).not.toHaveBeenCalled();
    });
    (0, vitest_1.it)('should handle subscription without organizationId (no external ref) gracefully', async () => {
        const preapprovalInfo = mockPreapprovalInfo({
            external_reference: undefined,
        });
        mockPreapprovalGet.mockResolvedValue(preapprovalInfo);
        await handleWebhookNotification({
            type: 'subscription_preapproval',
            action: 'preapproval.created',
            data: { id: 'preapp_no_org' },
        });
        (0, vitest_1.expect)(helpers_1.prismaMock.organization.update).not.toHaveBeenCalled();
    });
    (0, vitest_1.it)('should ignore unknown notification types', async () => {
        await handleWebhookNotification({
            type: 'unknown_event_type',
            action: 'something',
            data: { id: 'test_123' },
        });
        (0, vitest_1.expect)(helpers_1.prismaMock.organization.update).not.toHaveBeenCalled();
        (0, vitest_1.expect)(helpers_1.prismaMock.payment.create).not.toHaveBeenCalled();
    });
});
// ═══════════════════════════════════════════════════════════
// Edge cases
// ═══════════════════════════════════════════════════════════
(0, vitest_1.describe)('Edge cases', () => {
    (0, vitest_1.beforeEach)(() => {
        mockPaymentGet.mockReset();
        mockPreapprovalGet.mockReset();
    });
    (0, vitest_1.it)('should handle when getPaymentInfo throws (e.g., API error)', async () => {
        mockPaymentGet.mockRejectedValue(new Error('API rate limit'));
        await (0, vitest_1.expect)(handleWebhookNotification({
            type: 'payment',
            action: 'payment.created',
            data: { id: 'pay_that_fails' },
        })).resolves.not.toThrow();
    });
    (0, vitest_1.it)('should handle when getPreapprovalInfo throws (e.g., API error)', async () => {
        mockPreapprovalGet.mockRejectedValue(new Error('Not found'));
        await (0, vitest_1.expect)(handleWebhookNotification({
            type: 'subscription_preapproval',
            action: 'preapproval.created',
            data: { id: 'preapp_not_found' },
        })).resolves.not.toThrow();
    });
    (0, vitest_1.it)('should handle partial external_reference (missing fields)', async () => {
        const paymentInfo = mockPaymentInfo({
            external_reference: JSON.stringify({ plan: 'STARTER' }), // no userId or organizationId
        });
        mockPaymentGet.mockResolvedValue(paymentInfo);
        await (0, vitest_1.expect)(handleWebhookNotification({
            type: 'payment',
            action: 'payment.created',
            data: { id: 'pay_partial_ref' },
        })).resolves.not.toThrow();
        // No org ID, so should not update
        (0, vitest_1.expect)(helpers_1.prismaMock.organization.update).not.toHaveBeenCalled();
    });
    (0, vitest_1.it)('should handle null body.data', async () => {
        await (0, vitest_1.expect)(handleWebhookNotification({
            type: 'payment',
            action: 'payment.created',
            data: null,
        })).resolves.not.toThrow();
        (0, vitest_1.expect)(helpers_1.prismaMock.payment.create).not.toHaveBeenCalled();
    });
    (0, vitest_1.it)('should handle unknown event type without crashing', async () => {
        await (0, vitest_1.expect)(handleWebhookNotification({
            type: 'some_random_event',
            action: 'something',
            data: { id: 'random_123' },
        })).resolves.not.toThrow();
        (0, vitest_1.expect)(helpers_1.prismaMock.organization.update).not.toHaveBeenCalled();
        (0, vitest_1.expect)(helpers_1.prismaMock.payment.create).not.toHaveBeenCalled();
    });
});
//# sourceMappingURL=mercadopago-webhook.test.js.map