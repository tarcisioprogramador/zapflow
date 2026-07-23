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

import { describe, it, expect, vi, beforeEach, beforeAll, afterAll } from 'vitest';
import crypto from 'crypto';
import { prismaMock, mockPrismaClear } from './helpers';

// ─── Hoisted mock references (runs BEFORE vi.mock factories) ──
// These let us control what the mercadopago SDK returns from tests

const { mockPaymentGet, mockPreapprovalGet } = vi.hoisted(() => {
  const paymentGet = vi.fn();
  const preapprovalGet = vi.fn();
  return {
    mockPaymentGet: paymentGet,
    mockPreapprovalGet: preapprovalGet,
  };
});

// ─── Mocks ────────────────────────────────────────────────

vi.mock('../config/database', () => ({
  default: prismaMock,
  prisma: prismaMock,
}));

vi.mock('mercadopago', () => ({
  MercadoPagoConfig: vi.fn(),
  Preference: vi.fn(),
  PreApproval: vi.fn().mockImplementation(function () {
    return {
      create: vi.fn(),
      get: mockPreapprovalGet,
    };
  }),
  Payment: vi.fn().mockImplementation(function () {
    return {
      get: mockPaymentGet,
    };
  }),
}));

// ─── Helpers ──────────────────────────────────────────────

/** Compute a valid Mercado Pago x-signature for testing */
function computeSignature(dataId: string, secret: string, ts: number, requestId?: string): string {
  const manifest = requestId
    ? `id:${dataId};request-id:${requestId};ts:${ts};`
    : `id:${dataId};ts:${ts};`;
  const hmac = crypto.createHmac('sha256', secret).update(manifest, 'utf8').digest('hex');
  return `ts=${ts},v1=${hmac}`;
}

/** Build a mock Express-compatible request for validateWebhookSignature */
function mockWebhookRequest(overrides: {
  signature?: string;
  requestId?: string;
  dataId?: string;
  timestamp?: number;
  body?: any;
} = {}) {
  const ts = overrides.timestamp ?? Date.now();
  const dataId = overrides.dataId ?? 'pay_test_123';

  return {
    headers: {
      'x-signature': overrides.signature ?? computeSignature(dataId, 'test-secret', ts, overrides.requestId),
      'x-request-id': overrides.requestId,
      'content-type': 'application/json',
    } as Record<string, string | string[] | undefined>,
    query: { 'data.id': dataId } as Record<string, string | undefined>,
    body: overrides.body ?? {
      type: 'payment',
      action: 'payment.created',
      data: { id: dataId },
    },
  };
}

/** Mock payment info returned by Mercado Pago API */
function mockPaymentInfo(overrides: Partial<any> = {}) {
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
function mockPreapprovalInfo(overrides: Partial<any> = {}) {
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
let validateWebhookSignature: any;
let handleWebhookNotification: any;

beforeAll(async () => {
  process.env.MP_WEBHOOK_SECRET = WEBHOOK_SECRET;
  process.env.MP_ACCESS_TOKEN = 'test-access-token'; // needed for getPaymentInfo/getPreapprovalInfo client check

  const mod = await import('../services/payment');
  validateWebhookSignature = mod.validateWebhookSignature;
  handleWebhookNotification = mod.handleWebhookNotification;
});

afterAll(() => {
  delete process.env.MP_WEBHOOK_SECRET;
  delete process.env.MP_ACCESS_TOKEN;
});

beforeEach(() => {
  mockPrismaClear();
});

// ═══════════════════════════════════════════════════════════
// validateWebhookSignature
// ═══════════════════════════════════════════════════════════

describe('validateWebhookSignature()', () => {
  it('should return valid=true when signature matches', () => {
    const req = mockWebhookRequest();
    const result = validateWebhookSignature(req);
    expect(result.valid).toBe(true);
    expect(result.reason).toBeUndefined();
  });

  it('should include x-request-id in manifest when present', () => {
    const req = mockWebhookRequest({ requestId: 'req-abc-123' });
    const result = validateWebhookSignature(req);
    expect(result.valid).toBe(true);
  });

  it('should return invalid when x-signature header is missing', () => {
    const req = mockWebhookRequest();
    delete req.headers['x-signature'];
    const result = validateWebhookSignature(req);
    expect(result.valid).toBe(false);
    expect(result.reason).toContain('x-signature');
  });

  it('should return invalid when x-signature format is wrong', () => {
    const req = mockWebhookRequest({ signature: 'garbage-data' });
    const result = validateWebhookSignature(req);
    expect(result.valid).toBe(false);
    expect(result.reason).toContain('Formato');
  });

  it('should return invalid when data.id is missing', () => {
    const req = mockWebhookRequest({ dataId: '' });
    req.query = {};
    req.body.data.id = undefined;
    const result = validateWebhookSignature(req);
    expect(result.valid).toBe(false);
    expect(result.reason).toContain('data.id');
  });

  it('should return invalid when signature hash does not match', () => {
    const ts = Date.now();
    const dataId = 'pay_test_123';
    const wrongSig = computeSignature(dataId, 'wrong-secret', ts);

    const req = mockWebhookRequest({ signature: wrongSig, timestamp: ts, dataId });
    const result = validateWebhookSignature(req);
    expect(result.valid).toBe(false);
    expect(result.reason).toContain('Assinatura inválida');
  });

  it('should return invalid when timestamp is too old (>5 min)', () => {
    const oldTs = Date.now() - 6 * 60 * 1000; // 6 minutes ago — past the 5 min window
    const sig = computeSignature('pay_test_123', WEBHOOK_SECRET, oldTs);

    const req = mockWebhookRequest({ signature: sig, timestamp: oldTs });
    const result = validateWebhookSignature(req);
    expect(result.valid).toBe(false);
    expect(result.reason).toContain('Timestamp');
    expect(result.reason).toContain('expirado');
  });

  it('should return invalid when timestamp is NaN', () => {
    const sig = `ts=not-a-number,v1=abc123`;
    const req = mockWebhookRequest({ signature: sig });
    const result = validateWebhookSignature(req);
    expect(result.valid).toBe(false);
  });

  it('should extract data.id from body when query param is missing', () => {
    const ts = Date.now();
    const dataId = 'pay_from_body';
    const sig = computeSignature(dataId, WEBHOOK_SECRET, ts);

    const req = mockWebhookRequest({ signature: sig, timestamp: ts, dataId });
    req.query = {};
    req.body.data.id = dataId;

    const result = validateWebhookSignature(req);
    expect(result.valid).toBe(true);
  });

  it('should extract data.id from data_id query param as fallback', () => {
    const ts = Date.now();
    const dataId = 'pay_alt_id';
    const sig = computeSignature(dataId, WEBHOOK_SECRET, ts);

    const req = mockWebhookRequest({ signature: sig, timestamp: ts, dataId });
    req.query = { data_id: dataId };
    delete req.query['data.id'];

    const result = validateWebhookSignature(req);
    expect(result.valid).toBe(true);
  });
});

// ═══════════════════════════════════════════════════════════
// handleWebhookNotification — payment events
// ═══════════════════════════════════════════════════════════

describe('handleWebhookNotification() — payment events', () => {
  beforeEach(() => {
    mockPaymentGet.mockReset();
    mockPreapprovalGet.mockReset();
  });

  it('should process payment.approved — update org, user, and record payment', async () => {
    const paymentInfo = mockPaymentInfo();
    mockPaymentGet.mockResolvedValue(paymentInfo);

    prismaMock.organization.update.mockResolvedValue({ id: 'test-org-id' });
    prismaMock.user.update.mockResolvedValue({ id: 'test-user-id' });
    prismaMock.payment.create.mockResolvedValue({ id: 'pay-record-1' });

    await handleWebhookNotification({
      type: 'payment',
      action: 'payment.created',
      data: { id: 'pay_test_123' },
    });

    // Organization was updated with payer email and plan
    expect(prismaMock.organization.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'test-org-id' },
        data: expect.objectContaining({
          mpCustomerId: 'cliente@email.com',
          mpSubscriptionStatus: 'active',
          plan: 'PRO',
        }),
      })
    );

    // User plan was updated
    expect(prismaMock.user.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'test-user-id' },
        data: { plan: 'PRO' },
      })
    );

    // Payment record created with correct values (converted to cents)
    expect(prismaMock.payment.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          organizationId: 'test-org-id',
          amount: 19700,
          status: 'succeeded',
          plan: 'PRO',
        }),
      })
    );
  });

  it('should process payment.rejected — record failed payment only', async () => {
    const paymentInfo = mockPaymentInfo({
      status: 'rejected',
      status_detail: 'cc_rejected_other_reason',
      transaction_amount: 97.0,
    });
    mockPaymentGet.mockResolvedValue(paymentInfo);

    prismaMock.payment.create.mockResolvedValue({ id: 'pay-fail-1' });

    await handleWebhookNotification({
      type: 'payment',
      action: 'payment.created',
      data: { id: 'pay_test_123' },
    });

    expect(prismaMock.payment.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          amount: 9700,
          status: 'failed',
          description: expect.stringContaining('rejected'),
        }),
      })
    );

    // Should NOT update organization or user
    expect(prismaMock.organization.update).not.toHaveBeenCalled();
    expect(prismaMock.user.update).not.toHaveBeenCalled();
  });

  it('should handle payment notification without payment ID gracefully', async () => {
    await handleWebhookNotification({
      type: 'payment',
      action: 'payment.created',
      data: {}, // no id
    });

    expect(prismaMock.payment.create).not.toHaveBeenCalled();
  });

  it('should process payment.cancelled — record failed payment', async () => {
    const paymentInfo = mockPaymentInfo({
      status: 'cancelled',
      status_detail: 'expired',
    });
    mockPaymentGet.mockResolvedValue(paymentInfo);

    prismaMock.payment.create.mockResolvedValue({ id: 'pay-cancel-1' });

    await handleWebhookNotification({
      type: 'payment',
      action: 'payment.created',
      data: { id: 'pay_test_123' },
    });

    expect(prismaMock.payment.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ status: 'failed' }),
      })
    );
  });

  it('should handle malformed external_reference gracefully', async () => {
    const paymentInfo = mockPaymentInfo({
      external_reference: 'invalid-json{{{',
    });
    mockPaymentGet.mockResolvedValue(paymentInfo);

    await expect(
      handleWebhookNotification({
        type: 'payment',
        action: 'payment.created',
        data: { id: 'pay_test_123' },
      })
    ).resolves.not.toThrow();
  });

  it('should handle payment without organizationId (no external ref) gracefully', async () => {
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
    expect(prismaMock.organization.update).not.toHaveBeenCalled();
    expect(prismaMock.payment.create).not.toHaveBeenCalled();
  });
});

// ═══════════════════════════════════════════════════════════
// handleWebhookNotification — subscription_preapproval events
// ═══════════════════════════════════════════════════════════

describe('handleWebhookNotification() — subscription events', () => {
  beforeEach(() => {
    mockPaymentGet.mockReset();
    mockPreapprovalGet.mockReset();
  });

  it('should process subscription_preapproval (authorized) — update subscription ID', async () => {
    const preapprovalInfo = mockPreapprovalInfo({ status: 'authorized' });
    mockPreapprovalGet.mockResolvedValue(preapprovalInfo);

    prismaMock.organization.update.mockResolvedValue({ id: 'test-org-id' });

    await handleWebhookNotification({
      type: 'subscription_preapproval',
      action: 'preapproval.created',
      data: { id: 'preapp_test_123' },
    });

    expect(prismaMock.organization.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'test-org-id' },
        data: {
          mpSubscriptionId: 'preapp_test_123',
          mpSubscriptionStatus: 'active',
          plan: 'PRO',
        },
      })
    );
  });

  it('should process subscription_preapproval (active) — same as authorized', async () => {
    const preapprovalInfo = mockPreapprovalInfo({ status: 'active' });
    mockPreapprovalGet.mockResolvedValue(preapprovalInfo);

    prismaMock.organization.update.mockResolvedValue({ id: 'test-org-id' });

    await handleWebhookNotification({
      type: 'subscription_preapproval',
      action: 'preapproval.created',
      data: { id: 'preapp_test_123' },
    });

    expect(prismaMock.organization.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          mpSubscriptionStatus: 'active',
        }),
      })
    );
  });

  it('should process subscription_preapproval (cancelled) — downgrade users to FREE', async () => {
    const preapprovalInfo = mockPreapprovalInfo({ status: 'cancelled' });
    mockPreapprovalGet.mockResolvedValue(preapprovalInfo);

    prismaMock.organization.update.mockResolvedValue({ id: 'test-org-id' });
    prismaMock.user.updateMany.mockResolvedValue({ count: 3 });

    await handleWebhookNotification({
      type: 'subscription_preapproval',
      action: 'preapproval.cancelled',
      data: { id: 'preapp_test_123' },
    });

    expect(prismaMock.organization.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: { mpSubscriptionStatus: 'canceled' },
      })
    );

    expect(prismaMock.user.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { organizationId: 'test-org-id' },
        data: { plan: 'FREE' },
      })
    );
  });

  it('should process subscription_preapproval (paused) — set paused status, no downgrade', async () => {
    const preapprovalInfo = mockPreapprovalInfo({ status: 'paused' });
    mockPreapprovalGet.mockResolvedValue(preapprovalInfo);

    prismaMock.organization.update.mockResolvedValue({ id: 'test-org-id' });

    await handleWebhookNotification({
      type: 'subscription_preapproval',
      action: 'preapproval.paused',
      data: { id: 'preapp_test_123' },
    });

    expect(prismaMock.organization.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: { mpSubscriptionStatus: 'paused' },
      })
    );

    // Should NOT downgrade users on pause — only on cancel
    expect(prismaMock.user.updateMany).not.toHaveBeenCalled();
  });

  it('should handle subscription notification without preapproval ID gracefully', async () => {
    await handleWebhookNotification({
      type: 'subscription_preapproval',
      action: 'preapproval.created',
      data: {}, // no id
    });

    expect(prismaMock.organization.update).not.toHaveBeenCalled();
  });

  it('should handle subscription without organizationId (no external ref) gracefully', async () => {
    const preapprovalInfo = mockPreapprovalInfo({
      external_reference: undefined,
    });
    mockPreapprovalGet.mockResolvedValue(preapprovalInfo);

    await handleWebhookNotification({
      type: 'subscription_preapproval',
      action: 'preapproval.created',
      data: { id: 'preapp_no_org' },
    });

    expect(prismaMock.organization.update).not.toHaveBeenCalled();
  });

  it('should ignore unknown notification types', async () => {
    await handleWebhookNotification({
      type: 'unknown_event_type',
      action: 'something',
      data: { id: 'test_123' },
    });

    expect(prismaMock.organization.update).not.toHaveBeenCalled();
    expect(prismaMock.payment.create).not.toHaveBeenCalled();
  });
});

// ═══════════════════════════════════════════════════════════
// Edge cases
// ═══════════════════════════════════════════════════════════

describe('Edge cases', () => {
  beforeEach(() => {
    mockPaymentGet.mockReset();
    mockPreapprovalGet.mockReset();
  });

  it('should handle when getPaymentInfo throws (e.g., API error)', async () => {
    mockPaymentGet.mockRejectedValue(new Error('API rate limit'));

    await expect(
      handleWebhookNotification({
        type: 'payment',
        action: 'payment.created',
        data: { id: 'pay_that_fails' },
      })
    ).resolves.not.toThrow();
  });

  it('should handle when getPreapprovalInfo throws (e.g., API error)', async () => {
    mockPreapprovalGet.mockRejectedValue(new Error('Not found'));

    await expect(
      handleWebhookNotification({
        type: 'subscription_preapproval',
        action: 'preapproval.created',
        data: { id: 'preapp_not_found' },
      })
    ).resolves.not.toThrow();
  });

  it('should handle partial external_reference (missing fields)', async () => {
    const paymentInfo = mockPaymentInfo({
      external_reference: JSON.stringify({ plan: 'STARTER' }), // no userId or organizationId
    });
    mockPaymentGet.mockResolvedValue(paymentInfo);

    await expect(
      handleWebhookNotification({
        type: 'payment',
        action: 'payment.created',
        data: { id: 'pay_partial_ref' },
      })
    ).resolves.not.toThrow();

    // No org ID, so should not update
    expect(prismaMock.organization.update).not.toHaveBeenCalled();
  });

  it('should handle null body.data', async () => {
    await expect(
      handleWebhookNotification({
        type: 'payment',
        action: 'payment.created',
        data: null,
      })
    ).resolves.not.toThrow();

    expect(prismaMock.payment.create).not.toHaveBeenCalled();
  });

  it('should handle unknown event type without crashing', async () => {
    await expect(
      handleWebhookNotification({
        type: 'some_random_event',
        action: 'something',
        data: { id: 'random_123' },
      })
    ).resolves.not.toThrow();

    expect(prismaMock.organization.update).not.toHaveBeenCalled();
    expect(prismaMock.payment.create).not.toHaveBeenCalled();
  });
});
