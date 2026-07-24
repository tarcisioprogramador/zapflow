import { Router, Response, Request } from 'express';
import { z } from 'zod';
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
  cancelSubscription,
  PLANS,
} from '../services/payment';
import {
  validateCoupon,
  createCoupon,
  listCoupons,
  updateCoupon,
  deleteCoupon,
} from '../services/coupon';

const router = Router();

// ─── Zod Validation Schemas ──────────────────────────────

const PLAN_VALUES = ['STARTER', 'PRO', 'ENTERPRISE'] as const;

const planSchema = z.enum(PLAN_VALUES, { errorMap: () => ({ message: 'Plano inválido. Escolha STARTER, PRO ou ENTERPRISE.' }) });

const publicCheckoutSchema = z.object({
  plan: planSchema,
  couponCode: z.string().optional(),
});

const authCheckoutSchema = z.object({
  plan: planSchema,
  couponCode: z.string().optional(),
});

const validateCouponSchema = z.object({
  code: z.string().min(1, 'Código do cupom é obrigatório'),
  plan: z.string().optional(),
  amount: z.number().int().positive().optional(),
});

const createCouponSchema = z.object({
  code: z.string().min(1, 'Código é obrigatório').transform(v => v.toUpperCase()),
  description: z.string().optional(),
  discountType: z.enum(['percentage', 'fixed']),
  discountValue: z.number().positive('Valor do desconto deve ser positivo'),
  minValue: z.number().int().positive().optional(),
  maxUses: z.number().int().positive().optional(),
  maxUsesPerUser: z.number().int().positive().optional(),
  appliesToPlans: z.array(z.string()).optional(),
  startsAt: z.string().optional(),
  expiresAt: z.string().optional(),
});

const updateCouponSchema = z.object({
  description: z.string().optional(),
  discountType: z.enum(['percentage', 'fixed']).optional(),
  discountValue: z.number().positive().optional(),
  minValue: z.number().int().positive().optional(),
  maxUses: z.number().int().positive().optional(),
  isActive: z.boolean().optional(),
  appliesToPlans: z.array(z.string()).optional(),
  startsAt: z.string().optional(),
  expiresAt: z.string().optional(),
});

function validate<T>(schema: z.ZodSchema<T>, data: unknown, res: Response): T | null {
  const result = schema.safeParse(data);
  if (!result.success) {
    const firstError = result.error.errors[0];
    res.status(400).json({ error: firstError?.message || 'Dados inválidos' });
    return null;
  }
  return result.data;
}

router.post('/public-checkout', async (req: Request, res: Response): Promise<void> => {
  try {
    const data = validate(publicCheckoutSchema, req.body, res);
    if (!data) return;

    const frontendUrl = process.env.FRONTEND_URL || `http://localhost:5173`;

    const preference = await createCheckoutPreference({
      plan: data.plan,
      couponCode: data.couponCode,
      successUrl: `${frontendUrl}/payment/success?payment_id={payment_id}`,
      cancelUrl: `${frontendUrl}/payment/cancel`,
      isOneTime: true,
    });

    res.json(preference);
  } catch (error) {
    console.error('[Payments] Public checkout error:', error);
    res.status(500).json({ error: (error as Error).message || 'Erro ao criar checkout' });
  }
});

// ─── Public: Mercado Pago Webhook ──────────────────────────
const webhookRouter = Router();

webhookRouter.post('/mercadopago', async (req: Request, res: Response): Promise<void> => {
  try {
    console.log('[Mercado Pago] Webhook received:', JSON.stringify(req.body).slice(0, 200));

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

    await handleWebhookNotification(req.body);

    res.status(200).json({ received: true });
  } catch (error) {
    console.error('[Mercado Pago] Webhook error:', error);
    res.status(400).send(`Webhook Error: ${(error as Error).message}`);
  }
});

// ─── Protected Routes ────────────────────────────────────
router.use(authenticate);

// GET /api/payments/config
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

// GET /api/payments/status
router.get('/status', async (_req: AuthRequest, res: Response): Promise<void> => {
  res.json(getMpStatus());
});

// POST /api/payments/create-one-time-pix
router.post('/create-one-time-pix', async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!req.user) { res.status(401).json({ error: 'Não autenticado' }); return; }

    const data = validate(authCheckoutSchema, req.body, res);
    if (!data) return;

    const user = await prisma.user.findUnique({
      where: { id: req.user.userId },
      include: { organization: true },
    });

    if (!user) { res.status(404).json({ error: 'Usuário não encontrado' }); return; }

    const orgId = user.organizationId || user.id;
    const host = req.get('host') || 'localhost:3001';
    const protocol = req.protocol || 'https';

    const preference = await createCheckoutPreference({
      plan: data.plan,
      customerEmail: user.email,
      userId: user.id,
      organizationId: orgId,
      couponCode: data.couponCode,
      successUrl: `${protocol}://${host}/payment/success?payment_id={payment_id}`,
      cancelUrl: `${protocol}://${host}/payment/cancel`,
      isOneTime: true,
    });

    res.json(preference);
  } catch (error) {
    console.error('[Payments] One-time PIX error:', error);
    res.status(500).json({ error: (error as Error).message || 'Erro ao criar PIX' });
  }
});

// POST /api/payments/create-checkout - Create subscription
router.post('/create-checkout', async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!req.user) { res.status(401).json({ error: 'Não autenticado' }); return; }

    const data = validate(authCheckoutSchema, req.body, res);
    if (!data) return;

    const user = await prisma.user.findUnique({
      where: { id: req.user.userId },
      include: { organization: true },
    });

    if (!user) { res.status(404).json({ error: 'Usuário não encontrado' }); return; }

    const orgId = user.organizationId || user.id;
    const host = req.get('host') || 'localhost:3001';
    const protocol = req.protocol || 'https';

    const subscription = await createSubscription({
      plan: data.plan,
      payerEmail: user.email,
      userId: user.id,
      organizationId: orgId,
      couponCode: data.couponCode,
      backUrl: `${protocol}://${host}/payment/success?preapproval_id={preapproval_id}`,
    });

    res.json(subscription);
  } catch (error) {
    console.error('[Payments] Checkout error:', error);
    res.status(500).json({ error: (error as Error).message || 'Erro ao criar checkout' });
  }
});

// POST /api/payments/validate-coupon - Validate a coupon code
router.post('/validate-coupon', async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const data = validate(validateCouponSchema, req.body, res);
    if (!data) return;

    const planAmount = data.amount || (PLANS[data.plan as string]?.amount);
    if (!planAmount) { res.status(400).json({ error: 'Plano inválido ou amount não fornecido' }); return; }

    const result = await validateCoupon(data.code, data.plan || 'STARTER', planAmount, req.user?.userId);
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: 'Erro ao validar cupom' });
  }
});

// POST /api/payments/setup-products
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

// GET /api/payments/session/:id
router.get('/session/:id', async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    try {
      const payment = await getPaymentInfo(req.params.id);
      res.json({
        status: payment.status === 'approved' ? 'complete' : payment.status,
        customerEmail: (payment as any).payer?.email,
        plan: (payment as any).metadata?.plan || null,
      });
      return;
    } catch {
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

// POST /api/payments/portal
router.post('/portal', async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!req.user) { res.status(401).json({ error: 'Não autenticado' }); return; }

    const user = await prisma.user.findUnique({
      where: { id: req.user.userId },
      include: { organization: true },
    });

    if (!user?.organization?.mpSubscriptionId) {
      res.status(400).json({ error: 'Nenhuma assinatura ativa encontrada' });
      return;
    }

    const url = getCustomerPanelUrl(user.email);
    res.json({ url });
  } catch (error) {
    res.status(500).json({ error: 'Erro ao criar portal' });
  }
});

// POST /api/payments/cancel - Cancel subscription
router.post('/cancel', async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!req.user) { res.status(401).json({ error: 'Não autenticado' }); return; }

    const user = await prisma.user.findUnique({
      where: { id: req.user.userId },
      select: { organizationId: true },
    });

    if (!user?.organizationId) {
      res.status(400).json({ error: 'Nenhuma organização encontrada' });
      return;
    }

    const result = await cancelSubscription(user.organizationId);
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: (error as Error).message || 'Erro ao cancelar assinatura' });
  }
});

// GET /api/payments/subscription
router.get('/subscription', async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!req.user) { res.status(401).json({ error: 'Não autenticado' }); return; }

    const user = await prisma.user.findUnique({
      where: { id: req.user.userId },
      include: { organization: true },
    });

    if (!user) { res.status(404).json({ error: 'Usuário não encontrado' }); return; }

    const plan = PLANS[user.plan as keyof typeof PLANS];
    const org = user.organization;

    res.json({
      plan: user.plan,
      planName: plan?.name || user.plan,
      amount: plan?.amount || 0,
      hasSubscription: !!org?.mpSubscriptionId,
      subscriptionId: org?.mpSubscriptionId,
      subscriptionStatus: org?.mpSubscriptionStatus || null,
      currentPeriodEnd: org?.mpCurrentPeriodEnd?.toISOString() || null,
      daysRemaining: org?.mpCurrentPeriodEnd
        ? Math.ceil((org.mpCurrentPeriodEnd.getTime() - Date.now()) / (1000 * 60 * 60 * 24))
        : null,
    });
  } catch (error) {
    res.status(500).json({ error: 'Erro ao buscar assinatura' });
  }
});

// GET /api/payments/history
router.get('/history', async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!req.user) { res.status(401).json({ error: 'Não autenticado' }); return; }

    const user = await prisma.user.findUnique({
      where: { id: req.user.userId },
      select: { organizationId: true },
    });

    if (!user?.organizationId) { res.json({ payments: [], pagination: { page: 1, limit: 20, total: 0, totalPages: 0 } }); return; }

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
        originalAmount: p.originalAmount,
        discountAmount: p.discountAmount,
        couponCode: p.couponCode,
        currency: p.currency,
        status: p.status,
        plan: p.plan,
        description: p.description,
        periodStart: p.periodStart?.toISOString() || null,
        periodEnd: p.periodEnd?.toISOString() || null,
        createdAt: p.createdAt.toISOString(),
      })),
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    });
  } catch (error) {
    console.error('[Payments] History error:', error);
    res.status(500).json({ error: 'Erro ao buscar histórico' });
  }
});

// GET /api/payments/invoices
router.get('/invoices', async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!req.user) { res.status(401).json({ error: 'Não autenticado' }); return; }

    const user = await prisma.user.findUnique({
      where: { id: req.user.userId },
      select: { organizationId: true },
    });

    if (!user?.organizationId) { res.json([]); return; }

    const payments = await prisma.payment.findMany({
      where: { organizationId: user.organizationId, status: 'succeeded' },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });

    res.json(payments.map((p) => ({
      id: p.id,
      invoiceNumber: p.description || `Fatura #${p.id.slice(0, 8)}`,
      amount: p.amount,
      originalAmount: p.originalAmount,
      discountAmount: p.discountAmount,
      couponCode: p.couponCode,
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

// ─── Coupon Management (Admin) ──────────────────────────

// POST /api/payments/coupons - Create coupon
router.post('/coupons', async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!req.user) { res.status(401).json({ error: 'Não autenticado' }); return; }
    if (req.user.role !== 'OWNER' && req.user.role !== 'ADMIN') {
      res.status(403).json({ error: 'Apenas administradores podem criar cupons' }); return;
    }
    const data = validate(createCouponSchema, req.body, res);
    if (!data) return;
    const coupon = await createCoupon(data as any);
    res.status(201).json(coupon);
  } catch (error) {
    res.status(400).json({ error: (error as Error).message || 'Erro ao criar cupom' });
  }
});

// GET /api/payments/coupons - List all coupons
router.get('/coupons', async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!req.user) { res.status(401).json({ error: 'Não autenticado' }); return; }
    if (req.user.role !== 'OWNER' && req.user.role !== 'ADMIN') {
      res.status(403).json({ error: 'Apenas administradores podem gerenciar cupons' }); return;
    }
    const coupons = await listCoupons();
    res.json(coupons);
  } catch (error) {
    res.status(500).json({ error: 'Erro ao listar cupons' });
  }
});

// PUT /api/payments/coupons/:id - Update coupon
router.put('/coupons/:id', async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!req.user) { res.status(401).json({ error: 'Não autenticado' }); return; }
    if (req.user.role !== 'OWNER' && req.user.role !== 'ADMIN') {
      res.status(403).json({ error: 'Apenas administradores podem gerenciar cupons' }); return;
    }
    const data = validate(updateCouponSchema, req.body, res);
    if (!data) return;
    const coupon = await updateCoupon(req.params.id, data);
    res.json(coupon);
  } catch (error) {
    res.status(400).json({ error: (error as Error).message || 'Erro ao atualizar cupom' });
  }
});

// DELETE /api/payments/coupons/:id - Delete coupon
router.delete('/coupons/:id', async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!req.user) { res.status(401).json({ error: 'Não autenticado' }); return; }
    if (req.user.role !== 'OWNER' && req.user.role !== 'ADMIN') {
      res.status(403).json({ error: 'Apenas administradores podem gerenciar cupons' }); return;
    }
    await deleteCoupon(req.params.id);
    res.json({ deleted: true });
  } catch (error) {
    res.status(400).json({ error: 'Erro ao excluir cupom' });
  }
});

// ─── Webhook Event Logs (Admin) ─────────────────────────

// GET /api/payments/webhook-events - List webhook event logs
router.get('/webhook-events', async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!req.user) { res.status(401).json({ error: 'Não autenticado' }); return; }
    if (req.user.role !== 'OWNER' && req.user.role !== 'ADMIN') {
      res.status(403).json({ error: 'Apenas administradores podem ver logs de webhook' }); return;
    }

    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const skip = (page - 1) * limit;

    const [events, total] = await Promise.all([
      prisma.webhookEvent.findMany({
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      prisma.webhookEvent.count(),
    ]);

    res.json({
      events: events.map((e) => ({
        id: e.id,
        source: e.source,
        eventId: e.eventId,
        eventType: e.eventType,
        dataId: e.dataId,
        status: e.status,
        errorMessage: e.errorMessage,
        processedAt: e.processedAt?.toISOString() || null,
        createdAt: e.createdAt.toISOString(),
      })),
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    });
  } catch (error) {
    res.status(500).json({ error: 'Erro ao buscar logs de webhook' });
  }
});

export { webhookRouter as paymentWebhookRouter };
export default router;
