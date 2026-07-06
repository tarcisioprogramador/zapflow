/**
 * Payment Routes - Mercado Pago Checkout, Webhook, and Subscription Management
 */

import { Router, Response, Request } from 'express';
import prisma from '../config/database';
import { authenticate } from '../middleware/auth';
import { AuthRequest } from '../types';
import {
  createCheckoutPreference,
  createSubscription,
  getPaymentInfo,
  getPreapprovalInfo,
  handleWebhookNotification,
  validateWebhookSignature,
  getMpStatus,
  getCustomerPanelUrl,
  recordPayment,
  PLANS,
} from '../services/payment';

const router = Router();

// ─── Public: Public Checkout (no auth) ─────────────────
// Allows users to pay before creating an account
router.post('/public-checkout', async (req: Request, res: Response): Promise<void> => {
  try {
    const { plan } = req.body;

    if (!plan || !['STARTER', 'PRO', 'ENTERPRISE'].includes(plan)) {
      res.status(400).json({ error: 'Plano inválido. Escolha STARTER, PRO ou ENTERPRISE.' });
      return;
    }

    const frontendUrl = process.env.FRONTEND_URL || `http://localhost:5173`;

    // Create a one-time Mercado Pago checkout preference (no user yet)
    const preference = await createCheckoutPreference({
      plan,
      successUrl: `${frontendUrl}/payment/success?payment_id={payment_id}`,
      cancelUrl: `${frontendUrl}/payment/cancel`,
      isOneTime: true,
    });

    res.json({ url: preference.url, preferenceId: preference.preferenceId });
  } catch (error) {
    console.error('[Payments] Public checkout error:', error);
    res.status(500).json({ error: (error as Error).message || 'Erro ao criar checkout' });
  }
});

// ─── Public: Mercado Pago Webhook (no auth) ─────────────
const webhookRouter = Router();

webhookRouter.post('/mercadopago', async (req: Request, res: Response): Promise<void> => {
  try {
    console.log('[Mercado Pago] Webhook received:', JSON.stringify(req.body).slice(0, 200));

    // Validate webhook signature
    const validation = validateWebhookSignature({
      headers: req.headers as Record<string, string | string[] | undefined>,
      query: req.query as Record<string, string | undefined>,
      body: req.body,
    });

    if (!validation.valid) {
      console.warn(`[Mercado Pago] Webhook signature validation failed: ${validation.reason}`);
      res.status(401).json({ error: 'Assinatura inválida', reason: validation.reason });
      return;
    }

    // Process the notification
    await handleWebhookNotification(req.body);

    res.status(200).json({ received: true });
  } catch (error) {
    console.error('[Mercado Pago] Webhook error:', error);
    res.status(400).send(`Webhook Error: ${(error as Error).message}`);
  }
});

// ─── Protected Routes ───────────────────────────────────
router.use(authenticate);

// GET /api/payments/config - Get Mercado Pago public key
router.get('/config', async (_req: AuthRequest, res: Response): Promise<void> => {
  res.json({
    publicKey: process.env.MP_PUBLIC_KEY || '',
    plans: Object.entries(PLANS).map(([key, plan]) => ({
      id: key,
      name: plan.name,
      amount: plan.amount,
    })),
  });
});

// POST /api/payments/create-one-time-pix - Create a one-time PIX/checkout preference (not recurring)
router.post('/create-one-time-pix', async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ error: 'Não autenticado' });
      return;
    }

    const { plan } = req.body;

    if (!plan || !['STARTER', 'PRO', 'ENTERPRISE'].includes(plan)) {
      res.status(400).json({ error: 'Plano inválido. Escolha STARTER, PRO ou ENTERPRISE.' });
      return;
    }

    const user = await prisma.user.findUnique({
      where: { id: req.user.userId },
      include: { organization: true },
    });

    if (!user) {
      res.status(404).json({ error: 'Usuário não encontrado' });
      return;
    }

    const orgId = user.organizationId || user.id;
    const host = req.get('host') || 'localhost:3001';
    const protocol = req.protocol || 'https';

    // Create one-time Checkout Pro preference (PIX, card, boleto)
    const preference = await createCheckoutPreference({
      plan,
      customerEmail: user.email,
      userId: user.id,
      organizationId: orgId,
      successUrl: `${protocol}://${host}/payment/success?payment_id={payment_id}`,
      cancelUrl: `${protocol}://${host}/payment/cancel`,
      isOneTime: true,
    });

    res.json({
      url: preference.url,
      preferenceId: preference.preferenceId,
      isOneTime: true,
    });
  } catch (error) {
    console.error('[Payments] One-time PIX error:', error);
    res.status(500).json({ error: (error as Error).message || 'Erro ao criar PIX' });
  }
});

// POST /api/payments/create-checkout - Create a checkout preference (redirect)
router.post('/create-checkout', async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ error: 'Não autenticado' });
      return;
    }

    const { plan } = req.body;

    if (!plan || !['STARTER', 'PRO', 'ENTERPRISE'].includes(plan)) {
      res.status(400).json({ error: 'Plano inválido. Escolha STARTER, PRO ou ENTERPRISE.' });
      return;
    }

    const user = await prisma.user.findUnique({
      where: { id: req.user.userId },
      include: { organization: true },
    });

    if (!user) {
      res.status(404).json({ error: 'Usuário não encontrado' });
      return;
    }

    const orgId = user.organizationId || user.id;
    const host = req.get('host') || 'localhost:3001';
    const protocol = req.protocol || 'https';

    // Create Mercado Pago checkout preference
    // Use subscription (preapproval) for recurring billing
    const subscription = await createSubscription({
      plan,
      payerEmail: user.email,
      userId: user.id,
      organizationId: orgId,
      backUrl: `${protocol}://${host}/payment/success?preapproval_id={preapproval_id}`,
    });

    res.json({
      url: subscription.url,
      preferenceId: subscription.preapprovalId,
    });
  } catch (error) {
    console.error('[Payments] Checkout error:', error);
    res.status(500).json({ error: (error as Error).message || 'Erro ao criar checkout' });
  }
});

// GET /api/payments/status - Check Mercado Pago configuration
router.get('/status', async (_req: AuthRequest, res: Response): Promise<void> => {
  res.json(getMpStatus());
});

// POST /api/payments/setup-products - No-op for Mercado Pago (products are defined in code)
router.post('/setup-products', async (_req: AuthRequest, res: Response): Promise<void> => {
  res.json({
    success: true,
    message: 'Mercado Pago usa valores definidos no código. Os planos já estão configurados.',
    plans: Object.entries(PLANS).map(([key, plan]) => ({
      id: key,
      name: plan.name,
      amount: plan.amount,
      description: `ZapFlow ${plan.name}`,
    })),
  });
});

// GET /api/payments/session/:id - Get payment/preapproval info
router.get('/session/:id', async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    // Try as payment first, then as preapproval
    try {
      const payment = await getPaymentInfo(req.params.id);
      res.json({
        status: payment.status === 'approved' ? 'complete' : payment.status,
        customerEmail: (payment as any).payer?.email,
        plan: (payment as any).metadata?.plan || null,
      });
      return;
    } catch {
      // Not a payment, try preapproval
      const preapproval = await getPreapprovalInfo(req.params.id);
      res.json({
        status: preapproval.status === 'authorized' ? 'active' : preapproval.status,
        plan: null,
        subscriptionId: req.params.id,
      });
    }
  } catch (error) {
    res.status(500).json({ error: 'Erro ao verificar sessão' });
  }
});

// POST /api/payments/portal - Get link to manage subscription on Mercado Pago
router.post('/portal', async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ error: 'Não autenticado' });
      return;
    }

    const user = await prisma.user.findUnique({
      where: { id: req.user.userId },
      include: { organization: true },
    });

    if (!user?.organization?.stripeSubscriptionId) {
      res.status(400).json({ error: 'Nenhuma assinatura ativa encontrada' });
      return;
    }

    // Redirect to Mercado Pago subscriptions page
    const url = getCustomerPanelUrl(user.email);

    res.json({ url });
  } catch (error) {
    res.status(500).json({ error: 'Erro ao criar portal' });
  }
});

// GET /api/payments/subscription - Get current subscription info
router.get('/subscription', async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ error: 'Não autenticado' });
      return;
    }

    const user = await prisma.user.findUnique({
      where: { id: req.user.userId },
      include: { organization: true },
    });

    if (!user) {
      res.status(404).json({ error: 'Usuário não encontrado' });
      return;
    }

    const plan = PLANS[user.plan as keyof typeof PLANS];
    const org = user.organization;

    res.json({
      plan: user.plan,
      planName: plan?.name || user.plan,
      amount: plan?.amount || 0,
      hasSubscription: !!org?.stripeSubscriptionId,
      subscriptionId: org?.stripeSubscriptionId,
      subscriptionStatus: org?.stripeSubscriptionStatus || null,
      currentPeriodEnd: org?.stripeCurrentPeriodEnd?.toISOString() || null,
      daysRemaining: org?.stripeCurrentPeriodEnd
        ? Math.ceil((org.stripeCurrentPeriodEnd.getTime() - Date.now()) / (1000 * 60 * 60 * 24))
        : null,
    });
  } catch (error) {
    res.status(500).json({ error: 'Erro ao buscar assinatura' });
  }
});

// GET /api/payments/history - Get payment/transaction history
router.get('/history', async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ error: 'Não autenticado' });
      return;
    }

    const user = await prisma.user.findUnique({
      where: { id: req.user.userId },
      select: { organizationId: true },
    });

    if (!user?.organizationId) {
      res.json([]);
      return;
    }

    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const skip = (page - 1) * limit;

    const [payments, total] = await Promise.all([
      prisma.payment.findMany({
        where: { organizationId: user.organizationId },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      prisma.payment.count({
        where: { organizationId: user.organizationId },
      }),
    ]);

    res.json({
      payments: payments.map((p) => ({
        id: p.id,
        amount: p.amount,
        currency: p.currency,
        status: p.status,
        plan: p.plan,
        description: p.description,
        periodStart: p.periodStart?.toISOString() || null,
        periodEnd: p.periodEnd?.toISOString() || null,
        createdAt: p.createdAt.toISOString(),
      })),
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error('[Payments] History error:', error);
    res.status(500).json({ error: 'Erro ao buscar histórico' });
  }
});

// GET /api/payments/invoices - Alias for history
router.get('/invoices', async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ error: 'Não autenticado' });
      return;
    }

    const user = await prisma.user.findUnique({
      where: { id: req.user.userId },
      select: { organizationId: true },
    });

    if (!user?.organizationId) {
      res.json([]);
      return;
    }

    const payments = await prisma.payment.findMany({
      where: {
        organizationId: user.organizationId,
        status: 'succeeded',
      },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });

    res.json(payments.map((p) => ({
      id: p.id,
      invoiceNumber: p.description || `Fatura #${p.id.slice(0, 8)}`,
      amount: p.amount,
      currency: p.currency,
      status: p.status === 'succeeded' ? 'paid' : p.status,
      plan: p.plan,
      periodStart: p.periodStart?.toISOString() || null,
      periodEnd: p.periodEnd?.toISOString() || null,
      paidAt: p.createdAt.toISOString(),
      downloadUrl: null,
    })));
  } catch (error) {
    res.status(500).json({ error: 'Erro ao buscar faturas' });
  }
});

export { webhookRouter as paymentWebhookRouter };
export default router;
