"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.paymentWebhookRouter = void 0;
const express_1 = require("express");
const zod_1 = require("zod");
const database_1 = __importDefault(require("../config/database"));
const auth_1 = require("../middleware/auth");
const payment_1 = require("../services/payment");
const coupon_1 = require("../services/coupon");
const router = (0, express_1.Router)();
// ─── Zod Validation Schemas ──────────────────────────────
const PLAN_VALUES = ['STARTER', 'PRO', 'ENTERPRISE'];
const planSchema = zod_1.z.enum(PLAN_VALUES, { errorMap: () => ({ message: 'Plano inválido. Escolha STARTER, PRO ou ENTERPRISE.' }) });
const publicCheckoutSchema = zod_1.z.object({
    plan: planSchema,
    couponCode: zod_1.z.string().optional(),
});
const authCheckoutSchema = zod_1.z.object({
    plan: planSchema,
    couponCode: zod_1.z.string().optional(),
});
const validateCouponSchema = zod_1.z.object({
    code: zod_1.z.string().min(1, 'Código do cupom é obrigatório'),
    plan: zod_1.z.string().optional(),
    amount: zod_1.z.number().int().positive().optional(),
});
const createCouponSchema = zod_1.z.object({
    code: zod_1.z.string().min(1, 'Código é obrigatório').transform(v => v.toUpperCase()),
    description: zod_1.z.string().optional(),
    discountType: zod_1.z.enum(['percentage', 'fixed']),
    discountValue: zod_1.z.number().positive('Valor do desconto deve ser positivo'),
    minValue: zod_1.z.number().int().positive().optional(),
    maxUses: zod_1.z.number().int().positive().optional(),
    maxUsesPerUser: zod_1.z.number().int().positive().optional(),
    appliesToPlans: zod_1.z.array(zod_1.z.string()).optional(),
    startsAt: zod_1.z.string().optional(),
    expiresAt: zod_1.z.string().optional(),
});
const updateCouponSchema = zod_1.z.object({
    description: zod_1.z.string().optional(),
    discountType: zod_1.z.enum(['percentage', 'fixed']).optional(),
    discountValue: zod_1.z.number().positive().optional(),
    minValue: zod_1.z.number().int().positive().optional(),
    maxUses: zod_1.z.number().int().positive().optional(),
    isActive: zod_1.z.boolean().optional(),
    appliesToPlans: zod_1.z.array(zod_1.z.string()).optional(),
    startsAt: zod_1.z.string().optional(),
    expiresAt: zod_1.z.string().optional(),
});
function validate(schema, data, res) {
    const result = schema.safeParse(data);
    if (!result.success) {
        const firstError = result.error.errors[0];
        res.status(400).json({ error: firstError?.message || 'Dados inválidos' });
        return null;
    }
    return result.data;
}
router.post('/public-checkout', async (req, res) => {
    try {
        const data = validate(publicCheckoutSchema, req.body, res);
        if (!data)
            return;
        const frontendUrl = process.env.FRONTEND_URL || `http://localhost:5173`;
        const preference = await (0, payment_1.createCheckoutPreference)({
            plan: data.plan,
            couponCode: data.couponCode,
            successUrl: `${frontendUrl}/payment/success?payment_id={payment_id}`,
            cancelUrl: `${frontendUrl}/payment/cancel`,
            isOneTime: true,
        });
        res.json(preference);
    }
    catch (error) {
        console.error('[Payments] Public checkout error:', error);
        res.status(500).json({ error: error.message || 'Erro ao criar checkout' });
    }
});
// ─── Public: Mercado Pago Webhook ──────────────────────────
const webhookRouter = (0, express_1.Router)();
exports.paymentWebhookRouter = webhookRouter;
webhookRouter.post('/mercadopago', async (req, res) => {
    try {
        console.log('[Mercado Pago] Webhook received:', JSON.stringify(req.body).slice(0, 200));
        const validation = (0, payment_1.validateWebhookSignature)({
            headers: req.headers,
            query: req.query,
            body: req.body,
        });
        if (!validation.valid) {
            console.warn(`[Mercado Pago] Webhook signature validation failed: ${validation.reason}`);
            res.status(401).json({ error: 'Assinatura inválida', reason: validation.reason });
            return;
        }
        await (0, payment_1.handleWebhookNotification)(req.body);
        res.status(200).json({ received: true });
    }
    catch (error) {
        console.error('[Mercado Pago] Webhook error:', error);
        res.status(400).send(`Webhook Error: ${error.message}`);
    }
});
// ─── Protected Routes ────────────────────────────────────
router.use(auth_1.authenticate);
// GET /api/payments/config
router.get('/config', async (_req, res) => {
    res.json({
        publicKey: process.env.MP_PUBLIC_KEY || '',
        plans: Object.entries(payment_1.PLANS).map(([key, plan]) => ({
            id: key,
            name: plan.name,
            amount: plan.amount,
        })),
    });
});
// GET /api/payments/status
router.get('/status', async (_req, res) => {
    res.json((0, payment_1.getMpStatus)());
});
// POST /api/payments/create-one-time-pix
router.post('/create-one-time-pix', async (req, res) => {
    try {
        if (!req.user) {
            res.status(401).json({ error: 'Não autenticado' });
            return;
        }
        const data = validate(authCheckoutSchema, req.body, res);
        if (!data)
            return;
        const user = await database_1.default.user.findUnique({
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
        const preference = await (0, payment_1.createCheckoutPreference)({
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
    }
    catch (error) {
        console.error('[Payments] One-time PIX error:', error);
        res.status(500).json({ error: error.message || 'Erro ao criar PIX' });
    }
});
// POST /api/payments/create-checkout - Create subscription
router.post('/create-checkout', async (req, res) => {
    try {
        if (!req.user) {
            res.status(401).json({ error: 'Não autenticado' });
            return;
        }
        const data = validate(authCheckoutSchema, req.body, res);
        if (!data)
            return;
        const user = await database_1.default.user.findUnique({
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
        const subscription = await (0, payment_1.createSubscription)({
            plan: data.plan,
            payerEmail: user.email,
            userId: user.id,
            organizationId: orgId,
            couponCode: data.couponCode,
            backUrl: `${protocol}://${host}/payment/success?preapproval_id={preapproval_id}`,
        });
        res.json(subscription);
    }
    catch (error) {
        console.error('[Payments] Checkout error:', error);
        res.status(500).json({ error: error.message || 'Erro ao criar checkout' });
    }
});
// POST /api/payments/validate-coupon - Validate a coupon code
router.post('/validate-coupon', async (req, res) => {
    try {
        const data = validate(validateCouponSchema, req.body, res);
        if (!data)
            return;
        const planAmount = data.amount || (payment_1.PLANS[data.plan]?.amount);
        if (!planAmount) {
            res.status(400).json({ error: 'Plano inválido ou amount não fornecido' });
            return;
        }
        const result = await (0, coupon_1.validateCoupon)(data.code, data.plan || 'STARTER', planAmount, req.user?.userId);
        res.json(result);
    }
    catch (error) {
        res.status(500).json({ error: 'Erro ao validar cupom' });
    }
});
// POST /api/payments/setup-products
router.post('/setup-products', async (_req, res) => {
    res.json({
        success: true,
        message: 'Mercado Pago usa valores definidos no código. Os planos já estão configurados.',
        plans: Object.entries(payment_1.PLANS).map(([key, plan]) => ({
            id: key,
            name: plan.name,
            amount: plan.amount,
            description: `ZapFlow ${plan.name}`,
        })),
    });
});
// GET /api/payments/session/:id
router.get('/session/:id', async (req, res) => {
    try {
        try {
            const payment = await (0, payment_1.getPaymentInfo)(req.params.id);
            res.json({
                status: payment.status === 'approved' ? 'complete' : payment.status,
                customerEmail: payment.payer?.email,
                plan: payment.metadata?.plan || null,
            });
            return;
        }
        catch {
            const preapproval = await (0, payment_1.getPreapprovalInfo)(req.params.id);
            res.json({
                status: preapproval.status === 'authorized' ? 'active' : preapproval.status,
                plan: null,
                subscriptionId: req.params.id,
            });
        }
    }
    catch (error) {
        res.status(500).json({ error: 'Erro ao verificar sessão' });
    }
});
// POST /api/payments/portal
router.post('/portal', async (req, res) => {
    try {
        if (!req.user) {
            res.status(401).json({ error: 'Não autenticado' });
            return;
        }
        const user = await database_1.default.user.findUnique({
            where: { id: req.user.userId },
            include: { organization: true },
        });
        if (!user?.organization?.mpSubscriptionId) {
            res.status(400).json({ error: 'Nenhuma assinatura ativa encontrada' });
            return;
        }
        const url = (0, payment_1.getCustomerPanelUrl)(user.email);
        res.json({ url });
    }
    catch (error) {
        res.status(500).json({ error: 'Erro ao criar portal' });
    }
});
// POST /api/payments/cancel - Cancel subscription
router.post('/cancel', async (req, res) => {
    try {
        if (!req.user) {
            res.status(401).json({ error: 'Não autenticado' });
            return;
        }
        const user = await database_1.default.user.findUnique({
            where: { id: req.user.userId },
            select: { organizationId: true },
        });
        if (!user?.organizationId) {
            res.status(400).json({ error: 'Nenhuma organização encontrada' });
            return;
        }
        const result = await (0, payment_1.cancelSubscription)(user.organizationId);
        res.json(result);
    }
    catch (error) {
        res.status(500).json({ error: error.message || 'Erro ao cancelar assinatura' });
    }
});
// GET /api/payments/subscription
router.get('/subscription', async (req, res) => {
    try {
        if (!req.user) {
            res.status(401).json({ error: 'Não autenticado' });
            return;
        }
        const user = await database_1.default.user.findUnique({
            where: { id: req.user.userId },
            include: { organization: true },
        });
        if (!user) {
            res.status(404).json({ error: 'Usuário não encontrado' });
            return;
        }
        const plan = payment_1.PLANS[user.plan];
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
    }
    catch (error) {
        res.status(500).json({ error: 'Erro ao buscar assinatura' });
    }
});
// GET /api/payments/history
router.get('/history', async (req, res) => {
    try {
        if (!req.user) {
            res.status(401).json({ error: 'Não autenticado' });
            return;
        }
        const user = await database_1.default.user.findUnique({
            where: { id: req.user.userId },
            select: { organizationId: true },
        });
        if (!user?.organizationId) {
            res.json({ payments: [], pagination: { page: 1, limit: 20, total: 0, totalPages: 0 } });
            return;
        }
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 20;
        const skip = (page - 1) * limit;
        const [payments, total] = await Promise.all([
            database_1.default.payment.findMany({
                where: { organizationId: user.organizationId },
                orderBy: { createdAt: 'desc' },
                skip,
                take: limit,
            }),
            database_1.default.payment.count({
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
    }
    catch (error) {
        console.error('[Payments] History error:', error);
        res.status(500).json({ error: 'Erro ao buscar histórico' });
    }
});
// GET /api/payments/invoices
router.get('/invoices', async (req, res) => {
    try {
        if (!req.user) {
            res.status(401).json({ error: 'Não autenticado' });
            return;
        }
        const user = await database_1.default.user.findUnique({
            where: { id: req.user.userId },
            select: { organizationId: true },
        });
        if (!user?.organizationId) {
            res.json([]);
            return;
        }
        const payments = await database_1.default.payment.findMany({
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
    }
    catch (error) {
        res.status(500).json({ error: 'Erro ao buscar faturas' });
    }
});
// ─── Coupon Management (Admin) ──────────────────────────
// POST /api/payments/coupons - Create coupon
router.post('/coupons', async (req, res) => {
    try {
        if (!req.user) {
            res.status(401).json({ error: 'Não autenticado' });
            return;
        }
        if (req.user.role !== 'OWNER' && req.user.role !== 'ADMIN') {
            res.status(403).json({ error: 'Apenas administradores podem criar cupons' });
            return;
        }
        const data = validate(createCouponSchema, req.body, res);
        if (!data)
            return;
        const coupon = await (0, coupon_1.createCoupon)(data);
        res.status(201).json(coupon);
    }
    catch (error) {
        res.status(400).json({ error: error.message || 'Erro ao criar cupom' });
    }
});
// GET /api/payments/coupons - List all coupons
router.get('/coupons', async (req, res) => {
    try {
        if (!req.user) {
            res.status(401).json({ error: 'Não autenticado' });
            return;
        }
        if (req.user.role !== 'OWNER' && req.user.role !== 'ADMIN') {
            res.status(403).json({ error: 'Apenas administradores podem gerenciar cupons' });
            return;
        }
        const coupons = await (0, coupon_1.listCoupons)();
        res.json(coupons);
    }
    catch (error) {
        res.status(500).json({ error: 'Erro ao listar cupons' });
    }
});
// PUT /api/payments/coupons/:id - Update coupon
router.put('/coupons/:id', async (req, res) => {
    try {
        if (!req.user) {
            res.status(401).json({ error: 'Não autenticado' });
            return;
        }
        if (req.user.role !== 'OWNER' && req.user.role !== 'ADMIN') {
            res.status(403).json({ error: 'Apenas administradores podem gerenciar cupons' });
            return;
        }
        const data = validate(updateCouponSchema, req.body, res);
        if (!data)
            return;
        const coupon = await (0, coupon_1.updateCoupon)(req.params.id, data);
        res.json(coupon);
    }
    catch (error) {
        res.status(400).json({ error: error.message || 'Erro ao atualizar cupom' });
    }
});
// DELETE /api/payments/coupons/:id - Delete coupon
router.delete('/coupons/:id', async (req, res) => {
    try {
        if (!req.user) {
            res.status(401).json({ error: 'Não autenticado' });
            return;
        }
        if (req.user.role !== 'OWNER' && req.user.role !== 'ADMIN') {
            res.status(403).json({ error: 'Apenas administradores podem gerenciar cupons' });
            return;
        }
        await (0, coupon_1.deleteCoupon)(req.params.id);
        res.json({ deleted: true });
    }
    catch (error) {
        res.status(400).json({ error: 'Erro ao excluir cupom' });
    }
});
// ─── Webhook Event Logs (Admin) ─────────────────────────
// GET /api/payments/webhook-events - List webhook event logs
router.get('/webhook-events', async (req, res) => {
    try {
        if (!req.user) {
            res.status(401).json({ error: 'Não autenticado' });
            return;
        }
        if (req.user.role !== 'OWNER' && req.user.role !== 'ADMIN') {
            res.status(403).json({ error: 'Apenas administradores podem ver logs de webhook' });
            return;
        }
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 20;
        const skip = (page - 1) * limit;
        const [events, total] = await Promise.all([
            database_1.default.webhookEvent.findMany({
                orderBy: { createdAt: 'desc' },
                skip,
                take: limit,
            }),
            database_1.default.webhookEvent.count(),
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
    }
    catch (error) {
        res.status(500).json({ error: 'Erro ao buscar logs de webhook' });
    }
});
exports.default = router;
//# sourceMappingURL=payments.js.map