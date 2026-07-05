import { describe, it, expect, beforeEach, vi } from 'vitest';
import { prismaMock, mockResponse, mockAuthRequest, createTestUser, mockPrismaClear } from './helpers';
import paymentsRouter from '../routes/payments';

// Mock the payment service
vi.mock('../services/payment', () => ({
  STRIPE_PUBLISHABLE_KEY: 'pk_test_mock',
  STRIPE_SECRET_KEY: 'sk_test_mock',
  STRIPE_WEBHOOK_SECRET: 'whsec_test',
  stripe: { webhooks: { constructEvent: vi.fn() } },
  PLANS: {
    STARTER: { name: 'Starter', amount: 9700, priceId: 'price_starter' },
    PRO: { name: 'Professional', amount: 19700, priceId: 'price_pro' },
    ENTERPRISE: { name: 'Enterprise', amount: 49700, priceId: 'price_enterprise' },
  },
  createCheckoutSession: vi.fn().mockResolvedValue({
    id: 'cs_test_123',
    url: 'https://checkout.stripe.com/test',
  }),
  createPortalSession: vi.fn().mockResolvedValue({
    url: 'https://portal.stripe.com/test',
  }),
  getCheckoutSession: vi.fn().mockResolvedValue({
    id: 'cs_test_123',
    status: 'complete',
    customer_email: 'test@email.com',
    metadata: { plan: 'PRO' },
    subscription: 'sub_123',
  }),
  handleWebhookEvent: vi.fn().mockResolvedValue(undefined),
  getStripeStatus: vi.fn().mockReturnValue({ configured: true, hasPrices: true }),
  setupStripeProducts: vi.fn().mockResolvedValue([
    { planId: 'STARTER', priceId: 'price_starter', name: 'Starter' },
    { planId: 'PRO', priceId: 'price_pro', name: 'Professional' },
    { planId: 'ENTERPRISE', priceId: 'price_enterprise', name: 'Enterprise' },
  ]),
}));

function simulateRequest(method: string, path: string, req: any, res: any) {
  const route = paymentsRouter.stack.find((layer: any) => {
    if (!layer.route) return false;
    return layer.route.path === path && layer.route.methods[method];
  });

  if (!route) {
    throw new Error(`Route ${method.toUpperCase()} ${path} not found`);
  }

  const handler = route.route!.stack[route.route!.stack.length - 1].handle;
  return handler(req, res, () => {});
}

describe('Payments Routes', () => {
  beforeEach(() => {
    mockPrismaClear();
  });

  const mockOrg = {
    id: 'test-org-id',
    name: 'Test Org',
    plan: 'PRO',
    logo: null,
    stripeCustomerId: 'cus_test',
    stripeSubscriptionId: 'sub_123',
    stripeSubscriptionStatus: 'active',
    stripeCurrentPeriodEnd: new Date(Date.now() + 30 * 86400000),
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  describe('GET /config', () => {
    it('should return Stripe config with publishable key and plans', async () => {
      const req = mockAuthRequest();
      const res = mockResponse();

      await simulateRequest('get', '/config', req, res);

      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          publishableKey: 'pk_test_mock',
          plans: expect.arrayContaining([
            expect.objectContaining({ id: 'STARTER', name: 'Starter' }),
            expect.objectContaining({ id: 'PRO', name: 'Professional' }),
            expect.objectContaining({ id: 'ENTERPRISE', name: 'Enterprise' }),
          ]),
        })
      );
    });
  });

  describe('GET /status', () => {
    it('should return Stripe configuration status', async () => {
      const req = mockAuthRequest();
      const res = mockResponse();

      await simulateRequest('get', '/status', req, res);

      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ configured: true })
      );
    });
  });

  describe('GET /subscription', () => {
    it('should return current subscription info', async () => {
      const req = mockAuthRequest();
      const res = mockResponse();

      prismaMock.user.findUnique.mockResolvedValue(
        createTestUser({ organization: mockOrg })
      );

      await simulateRequest('get', '/subscription', req, res);

      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          plan: 'FREE',
          planName: 'FREE',
          hasSubscription: true,
          subscriptionId: 'sub_123',
          subscriptionStatus: 'active',
          daysRemaining: expect.any(Number),
        })
      );
    });

    it('should return 401 when user not authenticated', async () => {
      const req = mockAuthRequest({ user: undefined });
      const res = mockResponse();

      await simulateRequest('get', '/subscription', req, res);

      expect(res.status).toHaveBeenCalledWith(401);
    });
  });

  describe('GET /history', () => {
    it('should return paginated payment history', async () => {
      const req = mockAuthRequest();
      const res = mockResponse();

      prismaMock.user.findUnique.mockResolvedValue({
        id: 'test-user-id',
        organizationId: 'test-org-id',
      });
      prismaMock.payment.findMany.mockResolvedValue([
        {
          id: 'pay-1',
          amount: 9700,
          currency: 'brl',
          status: 'succeeded',
          plan: 'STARTER',
          description: 'Assinatura Starter',
          periodStart: new Date(),
          periodEnd: new Date(Date.now() + 30 * 86400000),
          stripePaymentIntentId: 'pi_123',
          stripeInvoiceId: 'in_123',
          stripeSubscriptionId: 'sub_123',
          organizationId: 'test-org-id',
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ]);
      prismaMock.payment.count.mockResolvedValue(1);

      await simulateRequest('get', '/history', req, res);

      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          payments: expect.arrayContaining([
            expect.objectContaining({
              id: 'pay-1',
              amount: 9700,
              status: 'succeeded',
              plan: 'STARTER',
            }),
          ]),
          pagination: expect.objectContaining({
            page: 1,
            total: 1,
            totalPages: 1,
          }),
        })
      );
    });

    it('should return empty array when user has no organization', async () => {
      const req = mockAuthRequest();
      const res = mockResponse();

      prismaMock.user.findUnique.mockResolvedValue({
        id: 'test-user-id',
        organizationId: null,
      });

      await simulateRequest('get', '/history', req, res);

      expect(res.json).toHaveBeenCalledWith([]);
    });

    it('should support pagination params', async () => {
      const req = mockAuthRequest({ query: { page: '2', limit: '10' } });
      const res = mockResponse();

      prismaMock.user.findUnique.mockResolvedValue({
        id: 'test-user-id',
        organizationId: 'test-org-id',
      });
      prismaMock.payment.findMany.mockResolvedValue([]);
      prismaMock.payment.count.mockResolvedValue(25);

      await simulateRequest('get', '/history', req, res);

      expect(prismaMock.payment.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ skip: 10, take: 10 })
      );
    });
  });

  describe('GET /invoices', () => {
    it('should return formatted invoice list', async () => {
      const req = mockAuthRequest();
      const res = mockResponse();

      prismaMock.user.findUnique.mockResolvedValue({
        id: 'test-user-id',
        organizationId: 'test-org-id',
      });
      prismaMock.payment.findMany.mockResolvedValue([
        {
          id: 'pay-1',
          amount: 9700,
          currency: 'brl',
          status: 'succeeded',
          plan: 'STARTER',
          description: null,
          periodStart: new Date(),
          periodEnd: new Date(Date.now() + 30 * 86400000),
          stripePaymentIntentId: 'pi_123',
          stripeInvoiceId: 'in_123',
          stripeSubscriptionId: 'sub_123',
          organizationId: 'test-org-id',
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ]);

      await simulateRequest('get', '/invoices', req, res);

      expect(res.json).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.objectContaining({
            invoiceNumber: expect.any(String),
            status: 'paid',
            plan: 'STARTER',
          }),
        ])
      );
    });
  });

  describe('POST /create-checkout', () => {
    it('should create a checkout session for a valid plan', async () => {
      const req = mockAuthRequest({ body: { plan: 'PRO' } });
      const res = mockResponse();

      prismaMock.user.findUnique.mockResolvedValue(
        createTestUser({ organization: mockOrg })
      );

      await simulateRequest('post', '/create-checkout', req, res);

      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ id: 'cs_test_123', url: expect.any(String) })
      );
    });

    it('should reject invalid plan', async () => {
      const req = mockAuthRequest({ body: { plan: 'INVALID' } });
      const res = mockResponse();

      await simulateRequest('post', '/create-checkout', req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ error: expect.stringContaining('Plano inválido') })
      );
    });

    it('should return 401 when user not authenticated', async () => {
      const req = mockAuthRequest({ user: undefined, body: { plan: 'PRO' } });
      const res = mockResponse();

      await simulateRequest('post', '/create-checkout', req, res);

      expect(res.status).toHaveBeenCalledWith(401);
    });
  });

  describe('POST /portal', () => {
    it('should create a customer portal session', async () => {
      const req = mockAuthRequest();
      const res = mockResponse();

      prismaMock.user.findUnique.mockResolvedValue(
        createTestUser({ organization: mockOrg })
      );

      await simulateRequest('post', '/portal', req, res);

      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ url: expect.any(String) })
      );
    });

    it('should reject when user has no stripe customer', async () => {
      const req = mockAuthRequest();
      const res = mockResponse();

      prismaMock.user.findUnique.mockResolvedValue(
        createTestUser({ organization: { ...mockOrg, stripeCustomerId: null } })
      );

      await simulateRequest('post', '/portal', req, res);

      expect(res.status).toHaveBeenCalledWith(400);
    });
  });

  describe('POST /setup-products', () => {
    it('should setup Stripe products', async () => {
      const req = mockAuthRequest();
      const res = mockResponse();

      await simulateRequest('post', '/setup-products', req, res);

      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          products: expect.arrayContaining([
            expect.objectContaining({ planId: 'STARTER' }),
          ]),
        })
      );
    });
  });

  describe('Error handling', () => {
    it('should handle errors gracefully on history', async () => {
      const req = mockAuthRequest();
      const res = mockResponse();

      prismaMock.user.findUnique.mockRejectedValue(new Error('DB Error'));

      await simulateRequest('get', '/history', req, res);

      expect(res.status).toHaveBeenCalledWith(500);
    });
  });
});
