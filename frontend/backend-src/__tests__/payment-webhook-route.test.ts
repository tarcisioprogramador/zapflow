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

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { mockResponse } from './helpers';

// ─── Mock the payment service ──────────────────────────────
// We mock the service functions to control exactly what the
// route handler receives, without needing a real Mercado Pago
// connection or complex HMAC computation in each test.
//
// IMPORTANT: vi.mock is hoisted, so we use vi.hoisted() to create
// mutable mock references that exist BEFORE the factory runs.

const { mockValidateWebhookSignature, mockHandleWebhookNotification } = vi.hoisted(() => ({
  mockValidateWebhookSignature: vi.fn(),
  mockHandleWebhookNotification: vi.fn(),
}));

vi.mock('../services/payment', () => ({
  validateWebhookSignature: mockValidateWebhookSignature,
  handleWebhookNotification: mockHandleWebhookNotification,
  createCheckoutPreference: vi.fn(),
  createSubscription: vi.fn(),
  getPaymentInfo: vi.fn(),
  getPreapprovalInfo: vi.fn(),
  getMpStatus: vi.fn(),
  getCustomerPanelUrl: vi.fn(),
  recordPayment: vi.fn(),
  PLANS: {
    STARTER: { name: 'IA Starter', amount: 9700 },
    PRO: { name: 'IA Pro', amount: 19700 },
    ENTERPRISE: { name: 'Enterprise', amount: 49700 },
  },
}));

// ─── Import the webhook router after mocks are set up ──────

import { paymentWebhookRouter } from '../routes/payments';

// ─── Helper: simulate a POST request to the webhook route ──

function simulateWebhookRequest(req: any, res: any) {
  // The webhookRouter has a single route: POST /mercadopago
  // Find its handler in the router stack
  const route = paymentWebhookRouter.stack.find((layer: any) => {
    if (!layer.route) return false;
    return layer.route.path === '/mercadopago' && layer.route.methods.post;
  });

  if (!route) {
    throw new Error('Route POST /mercadopago not found on paymentWebhookRouter');
  }

  const handler = route.route!.stack[route.route!.stack.length - 1].handle;
  return handler(req, res, () => {});
}

function buildRequest(overrides: Partial<any> = {}) {
  return {
    headers: { 'content-type': 'application/json' },
    query: {},
    body: {
      type: 'payment',
      action: 'payment.created',
      data: { id: 'pay_test_123' },
    },
    get: vi.fn().mockReturnValue('localhost:3001'),
    protocol: 'https',
    ...overrides,
  } as any;
}

// ═══════════════════════════════════════════════════════════
// Tests
// ═══════════════════════════════════════════════════════════

describe('paymentWebhookRouter — POST /mercadopago', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ─── 401: Invalid signature ────────────────────

  describe('401 — Invalid webhook signature', () => {
    it('should return 401 when signature validation fails', async () => {
      mockValidateWebhookSignature.mockReturnValue({
        valid: false,
        reason: 'Header x-signature ausente',
      });

      const req = buildRequest();
      const res = mockResponse();

      await simulateWebhookRequest(req, res);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          error: 'Assinatura inválida',
          reason: 'Header x-signature ausente',
        })
      );

      // Should NOT have attempted to process the notification
      expect(mockHandleWebhookNotification).not.toHaveBeenCalled();
    });

    it('should return 401 with empty reason string when reason is empty', async () => {
      mockValidateWebhookSignature.mockReturnValue({
        valid: false,
        reason: '',
      });

      const req = buildRequest();
      const res = mockResponse();

      await simulateWebhookRequest(req, res);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ error: 'Assinatura inválida' })
      );
    });

    it('should return 401 when x-signature format is wrong', async () => {
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
      const res = mockResponse();

      await simulateWebhookRequest(req, res);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ reason: expect.stringContaining('Formato') })
      );
    });

    it('should return 401 when hash does not match', async () => {
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
      const res = mockResponse();

      await simulateWebhookRequest(req, res);

      expect(res.status).toHaveBeenCalledWith(401);
    });

    it('should return 401 when timestamp is expired (replay attack)', async () => {
      mockValidateWebhookSignature.mockReturnValue({
        valid: false,
        reason: 'Timestamp do webhook expirado ou inválido (replay attack?)',
      });

      const req = buildRequest();
      const res = mockResponse();

      await simulateWebhookRequest(req, res);

      expect(res.status).toHaveBeenCalledWith(401);
    });

    it('should return 401 when data.id is missing from request', async () => {
      mockValidateWebhookSignature.mockReturnValue({
        valid: false,
        reason: 'data.id não encontrado na requisição',
      });

      const req = buildRequest({ body: { type: 'payment' } });
      const res = mockResponse();

      await simulateWebhookRequest(req, res);

      expect(res.status).toHaveBeenCalledWith(401);
    });
  });

  // ─── 200: Successful processing ─────────────────

  describe('200 — Successful webhook processing', () => {
    it('should return 200 when signature is valid and processing succeeds', async () => {
      mockValidateWebhookSignature.mockReturnValue({ valid: true });
      mockHandleWebhookNotification.mockResolvedValue(undefined);

      const req = buildRequest();
      const res = mockResponse();

      await simulateWebhookRequest(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({ received: true });

      // Notification was processed
      expect(mockHandleWebhookNotification).toHaveBeenCalledTimes(1);
      expect(mockHandleWebhookNotification).toHaveBeenCalledWith(req.body);
    });

    it('should pass the full request body to handleWebhookNotification', async () => {
      const notificationBody = {
        type: 'payment',
        action: 'payment.created',
        data: { id: 'pay_999' },
      };

      mockValidateWebhookSignature.mockReturnValue({ valid: true });
      mockHandleWebhookNotification.mockResolvedValue(undefined);

      const req = buildRequest({ body: notificationBody });
      const res = mockResponse();

      await simulateWebhookRequest(req, res);

      expect(mockHandleWebhookNotification).toHaveBeenCalledWith(notificationBody);
      expect(res.status).toHaveBeenCalledWith(200);
    });

    it('should work with subscription_preapproval notification type', async () => {
      const subBody = {
        type: 'subscription_preapproval',
        action: 'preapproval.created',
        data: { id: 'preapp_456' },
      };

      mockValidateWebhookSignature.mockReturnValue({ valid: true });
      mockHandleWebhookNotification.mockResolvedValue(undefined);

      const req = buildRequest({ body: subBody });
      const res = mockResponse();

      await simulateWebhookRequest(req, res);

      expect(mockHandleWebhookNotification).toHaveBeenCalledWith(subBody);
      expect(res.status).toHaveBeenCalledWith(200);
    });
  });

  // ─── 400: Unexpected error during processing ────

  describe('400 — Unexpected processing error', () => {
    it('should return 400 when handleWebhookNotification throws', async () => {
      mockValidateWebhookSignature.mockReturnValue({ valid: true });
      mockHandleWebhookNotification.mockRejectedValue(
        new Error('Falha na comunicação com Mercado Pago')
      );

      const req = buildRequest();
      const res = mockResponse();

      await simulateWebhookRequest(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.send).toHaveBeenCalledWith(
        expect.stringContaining('Webhook Error')
      );
    });

    it('should return 400 when validateWebhookSignature itself throws', async () => {
      mockValidateWebhookSignature.mockImplementation(() => {
        throw new Error('Unexpected validation crash');
      });

      const req = buildRequest();
      const res = mockResponse();

      await simulateWebhookRequest(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.send).toHaveBeenCalledWith(
        expect.stringContaining('Webhook Error')
      );
    });
  });

  // ─── Input validation ──────────────────────────

  describe('Input handling', () => {
    it('should handle empty body gracefully', async () => {
      mockValidateWebhookSignature.mockReturnValue({ valid: true });
      mockHandleWebhookNotification.mockResolvedValue(undefined);

      const req = buildRequest({ body: {} });
      const res = mockResponse();

      await simulateWebhookRequest(req, res);

      // Empty body is passed to handler (handleWebhookNotification
      // handles unknown types without crashing)
      expect(mockHandleWebhookNotification).toHaveBeenCalledWith({});
      expect(res.status).toHaveBeenCalledWith(200);
    });

    it('should handle null headers gracefully', async () => {
      // When headers are null/undefined, the route handler
      // casts them, and validateWebhookSignature receives an
      // empty object
      const req = buildRequest({ headers: null });
      const res = mockResponse();

      await simulateWebhookRequest(req, res);

      // Should still call validateWebhookSignature and handle the result
      expect(mockValidateWebhookSignature).toHaveBeenCalled();
    });
  });
});
