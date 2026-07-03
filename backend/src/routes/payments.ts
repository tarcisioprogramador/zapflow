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

    if (!sig || !STRIPE_WEBHOOK_SECRET || !stripe) {
      console.log('[Stripe] Webhook signature verification skipped (not configured)');
      res.status(200).json({ received: true });
      return;
    }

    // Verify webhook signature
    const rawBody = (req as any).rawBody;
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
    const { plan } = req.body;

    if (!plan || !['STARTER', 'PRO'].includes(plan)) {
      res.status(400).json({ error: 'Plano inválido. Escolha STARTER ou PRO.' });
      return;
    }

    const user = await prisma.user.findUnique({
      where: { id: req.user!.userId },
      include: { organization: true },
    });

    if (!user) {
      res.status(404).json({ error: 'Usuário não encontrado' });
      return;
    }

    const orgId = user.organizationId || user.id;

    // Create Stripe checkout session
    const session = await createCheckoutSession({
      plan,
      customerEmail: user.email,
      userId: user.id,
      organizationId: orgId,
      successUrl: `${req.protocol}://${req.get('host')}/payment/success?session_id={CHECKOUT_SESSION_ID}`,
      cancelUrl: `${req.protocol}://${req.get('host')}/payment/cancel`,
    });

    res.json(session);
  } catch (error) {
    console.error('[Payments] Checkout error:', error);
    res.status(500).json({ error: (error as Error).message || 'Erro ao criar checkout' });
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
    const user = await prisma.user.findUnique({
      where: { id: req.user!.userId },
      include: { organization: true },
    });

    if (!user?.organization?.stripeCustomerId) {
      res.status(400).json({ error: 'Nenhuma assinatura ativa encontrada' });
      return;
    }

    const session = await createPortalSession({
      customerId: user.organization.stripeCustomerId,
      returnUrl: `${req.protocol}://${req.get('host')}/settings`,
    });

    res.json(session);
  } catch (error) {
    res.status(500).json({ error: 'Erro ao criar portal' });
  }
});

// GET /api/payments/subscription - Get current subscription info
router.get('/subscription', async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user!.userId },
      include: { organization: true },
    });

    if (!user) {
      res.status(404).json({ error: 'Usuário não encontrado' });
      return;
    }

    const plan = PLANS[user.plan as keyof typeof PLANS];

    res.json({
      plan: user.plan,
      planName: plan?.name || user.plan,
      amount: plan?.amount || 0,
      hasSubscription: !!user.organization?.stripeCustomerId,
      subscriptionId: user.organization?.stripeSubscriptionId,
    });
  } catch (error) {
    res.status(500).json({ error: 'Erro ao buscar assinatura' });
  }
});

export { webhookRouter as paymentWebhookRouter };
export default router;
