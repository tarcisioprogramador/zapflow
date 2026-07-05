/**
 * Payment Routes - Stripe Checkout, Webhook, and Subscription Management
 */

import { Router, Response, Request } from 'express';
import prisma from '../config/database';
import { authenticate } from '../middleware/auth';
import { AuthRequest } from '../types';
import {
  createCheckoutSession,
  createPortalSession,
  getCheckoutSession,
  handleWebhookEvent,
  getStripeStatus,
  setupStripeProducts,
  stripe,
  STRIPE_WEBHOOK_SECRET,
  STRIPE_PUBLISHABLE_KEY,
  PLANS,
} from '../services/payment';
import Stripe from 'stripe';

const router = Router();

// ─── Public: Stripe Webhook (raw body required for signature verification) ───
const webhookRouter = Router();

webhookRouter.post('/stripe', async (req: Request, res: Response): Promise<void> => {
  try {
    const sig = req.headers['stripe-signature'] as string;

    if (!stripe) {
      console.log('[Stripe] Stripe not configured — webhook ignored');
      res.status(200).json({ received: true });
      return;
    }

    if (!sig || !STRIPE_WEBHOOK_SECRET) {
      console.warn('[Stripe] Webhook received without signature verification (missing STRIPE_WEBHOOK_SECRET)');
      res.status(400).json({ error: 'Stripe webhook secret not configured on server' });
      return;
    }

    // Verify webhook signature
    const rawBody = (req as any).rawBody;
    if (!rawBody || typeof rawBody !== 'string' || rawBody.length === 0) {
      console.error('[Stripe] Raw body not available for signature verification — body parser order issue');
      res.status(400).json({ error: 'Raw body required for signature verification' });
      return;
    }

    const event = stripe.webhooks.constructEvent(rawBody, sig, STRIPE_WEBHOOK_SECRET);

    // Process the event
    await handleWebhookEvent(event);

    res.json({ received: true });
  } catch (error) {
    console.error('[Stripe] Webhook error:', error);
    res.status(400).send(`Webhook Error: ${(error as Error).message}`);
  }
});

// ─── Protected Routes ───────────────────────────────────
router.use(authenticate);

// GET /api/payments/config - Get Stripe publishable key
router.get('/config', async (_req: AuthRequest, res: Response): Promise<void> => {
  res.json({
    publishableKey: STRIPE_PUBLISHABLE_KEY,
    plans: Object.entries(PLANS).map(([key, plan]) => ({
      id: key,
      name: plan.name,
      amount: plan.amount,
      priceId: plan.priceId,
    })),
  });
});

// POST /api/payments/create-checkout - Create a checkout session
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

    // Create Stripe checkout session
    const session = await createCheckoutSession({
      plan,
      customerEmail: user.email,
      userId: user.id,
      organizationId: orgId,
      successUrl: `${protocol}://${host}/payment/success?session_id={CHECKOUT_SESSION_ID}`,
      cancelUrl: `${protocol}://${host}/payment/cancel`,
    });

    res.json(session);
  } catch (error) {
    console.error('[Payments] Checkout error:', error);
    res.status(500).json({ error: (error as Error).message || 'Erro ao criar checkout' });
  }
});

// GET /api/payments/status - Check Stripe configuration status
router.get('/status', async (_req: AuthRequest, res: Response): Promise<void> => {
  res.json(getStripeStatus());
});

// POST /api/payments/setup-products - Auto-create Stripe products and prices
router.post('/setup-products', async (_req: AuthRequest, res: Response): Promise<void> => {
  try {
    const results = await setupStripeProducts();
    res.json({
      success: true,
      message: 'Produtos criados com sucesso!',
      products: results,
      envVars: results.map((r) => `STRIPE_PRICE_${r.planId}=${r.priceId}`),
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: (error as Error).message || 'Erro ao criar produtos Stripe',
    });
  }
});

// GET /api/payments/session/:id - Verify session status
router.get('/session/:id', async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const session = await getCheckoutSession(req.params.id);
    res.json({
      status: session.status,
      customerEmail: session.customer_email,
      plan: session.metadata?.plan,
      subscriptionId: session.subscription,
    });
  } catch (error) {
    res.status(500).json({ error: 'Erro ao verificar sessão' });
  }
});

// POST /api/payments/portal - Create a customer portal session
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

    if (!user?.organization?.stripeCustomerId) {
      res.status(400).json({ error: 'Nenhuma assinatura ativa encontrada' });
      return;
    }

    const host = req.get('host') || 'localhost:3001';
    const protocol = req.protocol || 'https';

    const session = await createPortalSession({
      customerId: user.organization.stripeCustomerId,
      returnUrl: `${protocol}://${host}/settings`,
    });

    res.json(session);
  } catch (error) {
    res.status(500).json({ error: 'Erro ao criar portal' });
  }
});

// GET /api/payments/subscription - Get current subscription info with renewal
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
      hasSubscription: !!org?.stripeCustomerId,
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

// GET /api/payments/invoices - Alias for history (returns formatted for invoice display)
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
      downloadUrl: null, // Stripe hosted invoice URL could be added later
    })));
  } catch (error) {
    res.status(500).json({ error: 'Erro ao buscar faturas' });
  }
});

export { webhookRouter as paymentWebhookRouter };
export default router;
