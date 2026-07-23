"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.DISCOUNT_CODES = exports.PLANS = void 0;
exports.getMpStatus = getMpStatus;
exports.validateWebhookSignature = validateWebhookSignature;
exports.createCheckoutPreference = createCheckoutPreference;
exports.createSubscription = createSubscription;
exports.getPaymentInfo = getPaymentInfo;
exports.getPreapprovalInfo = getPreapprovalInfo;
exports.getCustomerPanelUrl = getCustomerPanelUrl;
exports.recordPayment = recordPayment;
exports.handleWebhookNotification = handleWebhookNotification;
exports.linkPaymentToUser = linkPaymentToUser;
exports.cancelSubscription = cancelSubscription;
const mercadopago_1 = require("mercadopago");
const crypto_1 = __importDefault(require("crypto"));
const database_1 = __importDefault(require("../config/database"));
const coupon_1 = require("./coupon");
const webhook_events_1 = require("./webhook-events");
const mpAccessToken = process.env.MP_ACCESS_TOKEN || '';
const mpPublicKey = process.env.MP_PUBLIC_KEY || '';
const MP_WEBHOOK_SECRET = process.env.MP_WEBHOOK_SECRET || '';
const MAX_WEBHOOK_AGE_MS = 5 * 60 * 1000;
let client = null;
try {
    if (mpAccessToken) {
        client = new mercadopago_1.MercadoPagoConfig({ accessToken: mpAccessToken });
    }
}
catch {
    console.warn('[Mercado Pago] Invalid access token');
}
const PLANS = {
    STARTER: { name: 'IA Starter', amount: 9700 },
    PRO: { name: 'IA Pro', amount: 19700 },
    ENTERPRISE: { name: 'Enterprise', amount: 49700 },
};
exports.PLANS = PLANS;
const DISCOUNT_CODES = {
    WELCOME10: { type: 'percentage', value: 10, description: '10% de desconto - Boas vindas' },
    BLACKFRIDAY30: { type: 'percentage', value: 30, description: '30% de desconto - Black Friday' },
};
exports.DISCOUNT_CODES = DISCOUNT_CODES;
function getMpStatus() {
    const hasAccessToken = !!process.env.MP_ACCESS_TOKEN;
    const hasPublicKey = !!process.env.MP_PUBLIC_KEY;
    const hasWebhookSecret = !!process.env.MP_WEBHOOK_SECRET;
    return {
        configured: hasAccessToken && hasPublicKey,
        canCheckout: hasAccessToken,
        keys: {
            accessToken: hasAccessToken,
            publicKey: hasPublicKey,
            webhookSecret: hasWebhookSecret,
        },
        missingKeys: [
            !hasAccessToken && 'MP_ACCESS_TOKEN',
            !hasPublicKey && 'MP_PUBLIC_KEY',
            !hasWebhookSecret && 'MP_WEBHOOK_SECRET',
        ].filter(Boolean),
        signatureValidation: hasWebhookSecret ? 'active' : 'disabled',
        nextStep: !hasAccessToken
            ? 'Criar conta no Mercado Pago e copiar Access Token'
            : !hasPublicKey
                ? 'Copiar Public Key do Mercado Pago'
                : !hasWebhookSecret
                    ? 'Configurar webhook no Mercado Pago Developer Dashboard e copiar o Secret Key'
                    : 'Pronto para vender!',
    };
}
function validateWebhookSignature(req) {
    if (!MP_WEBHOOK_SECRET) {
        console.warn('[Mercado Pago] MP_WEBHOOK_SECRET não configurado — validação de assinatura desabilitada');
        return { valid: true };
    }
    const xSignature = req.headers['x-signature'];
    const xRequestId = req.headers['x-request-id'];
    if (!xSignature) {
        return { valid: false, reason: 'Header x-signature ausente' };
    }
    const tsMatch = xSignature.match(/ts=(\d+)/);
    const v1Match = xSignature.match(/v1=([a-f0-9]+)/);
    if (!tsMatch || !v1Match) {
        return { valid: false, reason: 'Formato do x-signature inválido' };
    }
    const ts = tsMatch[1];
    const receivedHash = v1Match[1];
    const dataId = req.query['data.id'] ||
        req.query['data_id'] ||
        req.body?.data?.id?.toString() ||
        '';
    if (!dataId) {
        return { valid: false, reason: 'data.id não encontrado na requisição' };
    }
    const timestamp = parseInt(ts, 10);
    const now = Date.now();
    if (isNaN(timestamp) || now - timestamp > MAX_WEBHOOK_AGE_MS) {
        return {
            valid: false,
            reason: 'Timestamp do webhook expirado ou inválido (replay attack?)',
        };
    }
    let manifest = `id:${dataId};ts:${ts};`;
    if (xRequestId) {
        manifest = `id:${dataId};request-id:${xRequestId};ts:${ts};`;
    }
    const computedHash = crypto_1.default
        .createHmac('sha256', MP_WEBHOOK_SECRET)
        .update(manifest, 'utf8')
        .digest('hex');
    try {
        const computedBuf = Buffer.from(computedHash, 'hex');
        const receivedBuf = Buffer.from(receivedHash, 'hex');
        if (!crypto_1.default.timingSafeEqual(computedBuf, receivedBuf)) {
            return { valid: false, reason: 'Assinatura inválida (hash não confere)' };
        }
    }
    catch {
        return { valid: false, reason: 'Erro ao comparar assinaturas' };
    }
    console.log(`[Mercado Pago] Webhook signature verified ✓ (data.id=${dataId})`);
    return { valid: true };
}
async function createCheckoutPreference(params) {
    if (!client) {
        throw new Error('Mercado Pago não configurado. Adicione MP_ACCESS_TOKEN no .env');
    }
    const plan = PLANS[params.plan];
    if (!plan) {
        throw new Error(`Plano ${params.plan} inválido`);
    }
    let amountInCents = plan.amount;
    let discountAmount = 0;
    let finalAmount = amountInCents;
    if (params.couponCode) {
        const validation = await (0, coupon_1.validateCoupon)(params.couponCode, params.plan, amountInCents, params.userId);
        if (!validation.valid) {
            throw new Error(`Cupom inválido: ${validation.reason}`);
        }
        discountAmount = validation.discountAmount || 0;
        finalAmount = validation.finalAmount || amountInCents;
    }
    const amountInReais = finalAmount / 100;
    const paymentType = params.isOneTime ? 'Pagamento único' : 'Assinatura mensal';
    const externalRef = JSON.stringify({
        plan: params.plan,
        ...(params.userId ? { userId: params.userId } : {}),
        ...(params.organizationId ? { organizationId: params.organizationId } : {}),
        ...(params.couponCode ? { coupon: params.couponCode, originalAmount: amountInCents, discountAmount } : {}),
    });
    const body = {
        items: [
            {
                id: params.plan,
                title: `ZapFlow ${plan.name}${discountAmount > 0 ? ' (com desconto)' : ''}`,
                description: `${paymentType} - ${plan.name}`,
                quantity: 1,
                currency_id: 'BRL',
                unit_price: amountInReais,
            },
        ],
        back_urls: {
            success: params.successUrl,
            failure: params.cancelUrl,
            pending: params.cancelUrl,
        },
        ...(params.successUrl.includes('://localhost') || params.successUrl.includes('://127.')
            ? {}
            : { auto_return: 'approved' }),
        external_reference: externalRef,
        payment_methods: {
            installments: 1,
        },
        notification_url: params.successUrl.replace('/payment/success', '/api/webhook/mercadopago'),
    };
    if (params.customerEmail) {
        body.payer = { email: params.customerEmail };
        body.metadata = {
            ...(params.userId ? { userId: params.userId } : {}),
            ...(params.organizationId ? { organizationId: params.organizationId } : {}),
            plan: params.plan,
        };
    }
    const preference = new mercadopago_1.Preference(client);
    const result = await preference.create({ body });
    return {
        url: result.init_point,
        sandboxUrl: result.sandbox_init_point,
        preferenceId: result.id,
        originalAmount: discountAmount > 0 ? amountInCents : undefined,
        discountAmount: discountAmount > 0 ? discountAmount : undefined,
        finalAmount: discountAmount > 0 ? finalAmount : undefined,
    };
}
async function createSubscription(params) {
    if (!client) {
        throw new Error('Mercado Pago não configurado');
    }
    const plan = PLANS[params.plan];
    if (!plan) {
        throw new Error(`Plano ${params.plan} inválido`);
    }
    let amountInCents = plan.amount;
    let discountAmount = 0;
    let finalAmount = amountInCents;
    if (params.couponCode) {
        const validation = await (0, coupon_1.validateCoupon)(params.couponCode, params.plan, amountInCents, params.userId);
        if (!validation.valid) {
            throw new Error(`Cupom inválido: ${validation.reason}`);
        }
        discountAmount = validation.discountAmount || 0;
        finalAmount = validation.finalAmount || amountInCents;
    }
    const amountInReais = finalAmount / 100;
    const preapproval = new mercadopago_1.PreApproval(client);
    const result = await preapproval.create({
        body: {
            reason: `ZapFlow ${plan.name}${discountAmount > 0 ? ' (com desconto)' : ''}`,
            auto_recurring: {
                frequency: 1,
                frequency_type: 'months',
                transaction_amount: amountInReais,
                currency_id: 'BRL',
            },
            payer_email: params.payerEmail,
            back_url: params.backUrl,
            notification_url: `${new URL(params.backUrl).origin}/api/webhook/mercadopago`,
            external_reference: JSON.stringify({
                userId: params.userId,
                organizationId: params.organizationId,
                plan: params.plan,
                ...(params.couponCode ? { coupon: params.couponCode, originalAmount: amountInCents, discountAmount } : {}),
            }),
            status: 'pending',
        },
    });
    if (params.couponCode && discountAmount > 0) {
        await (0, coupon_1.incrementCouponUsage)(params.couponCode);
    }
    return {
        url: result.init_point,
        preapprovalId: result.id,
        originalAmount: discountAmount > 0 ? amountInCents : undefined,
        discountAmount: discountAmount > 0 ? discountAmount : undefined,
        finalAmount: discountAmount > 0 ? finalAmount : undefined,
    };
}
async function getPaymentInfo(paymentId) {
    if (!client)
        throw new Error('Mercado Pago não configurado');
    const payment = new mercadopago_1.Payment(client);
    return payment.get({ id: paymentId });
}
async function getPreapprovalInfo(preapprovalId) {
    if (!client)
        throw new Error('Mercado Pago não configurado');
    const preapproval = new mercadopago_1.PreApproval(client);
    return preapproval.get({ id: preapprovalId });
}
function getCustomerPanelUrl(customerEmail) {
    return 'https://www.mercadopago.com.br/subscriptions';
}
async function recordPayment(params) {
    try {
        await database_1.default.payment.create({
            data: {
                organizationId: params.organizationId,
                mpPaymentIntentId: params.mpPaymentId,
                mpSubscriptionId: params.mpPreapprovalId,
                amount: params.amount,
                originalAmount: params.originalAmount,
                discountAmount: params.discountAmount,
                couponCode: params.couponCode,
                currency: params.currency || 'brl',
                status: params.status,
                plan: params.plan,
                description: params.description,
                periodStart: params.periodStart,
                periodEnd: params.periodEnd,
            },
        });
        console.log(`[Payment] Recorded: ${params.status} - ${params.plan} - R$ ${(params.amount / 100).toFixed(2)}`);
    }
    catch (err) {
        console.error('[Payment] Failed to record payment:', err);
    }
}
async function handleWebhookNotification(body) {
    const { type, action, data } = body;
    console.log(`[Mercado Pago] Processing notification: ${type}/${action}`);
    const eventLog = await (0, webhook_events_1.createEventLog)({
        source: 'mercadopago',
        eventType: type,
        dataId: data?.id?.toString(),
        status: 'received',
        requestBody: body,
    });
    try {
        const dataId = data?.id?.toString();
        if (!dataId) {
            console.warn('[Mercado Pago] Notification without data.id');
            if (eventLog)
                await (0, webhook_events_1.updateEventLog)(eventLog.id, { status: 'failed', errorMessage: 'Missing data.id' });
            return;
        }
        const recentEvent = await (0, webhook_events_1.findRecentEventByDataId)('mercadopago', dataId);
        if (recentEvent && recentEvent.status === 'processed') {
            console.log(`[Mercado Pago] Event ${dataId} already processed — skipping (idempotency)`);
            return;
        }
        if (recentEvent && recentEvent.id !== eventLog?.id) {
            const le = eventLog;
            if (le)
                await (0, webhook_events_1.updateEventLog)(le.id, { status: 'processing' });
        }
        else if (eventLog) {
            await (0, webhook_events_1.updateEventLog)(eventLog.id, { status: 'processing' });
        }
        if (type === 'payment') {
            const paymentInfo = await getPaymentInfo(dataId);
            let externalRef = {};
            try {
                const ref = paymentInfo.external_reference;
                externalRef = ref ? JSON.parse(ref) : {};
            }
            catch { /* ignore */ }
            const organizationId = externalRef.organizationId;
            const userId = externalRef.userId;
            const planName = externalRef.plan || 'STARTER';
            const status = paymentInfo.status;
            const statusDetail = paymentInfo.status_detail;
            const payerEmail = paymentInfo.payer?.email;
            const couponCode = externalRef.coupon;
            const originalAmount = externalRef.originalAmount;
            const discountAmount = externalRef.discountAmount;
            if (status === 'approved') {
                if (organizationId && organizationId !== 'pending') {
                    await database_1.default.organization.update({
                        where: { id: organizationId },
                        data: {
                            mpCustomerId: payerEmail || null,
                            mpSubscriptionStatus: 'active',
                            plan: planName,
                        },
                    });
                    if (userId && userId !== 'pending') {
                        await database_1.default.user.update({
                            where: { id: userId },
                            data: { plan: planName },
                        });
                    }
                    await recordPayment({
                        organizationId,
                        mpPaymentId: dataId,
                        amount: (paymentInfo.transaction_amount * 100) || 0,
                        originalAmount,
                        discountAmount,
                        couponCode,
                        status: 'succeeded',
                        plan: planName,
                        description: `Pagamento ${planName}${couponCode ? ` (cupom: ${couponCode})` : ''} - ${paymentInfo.payment_method?.id || ''}`.trim(),
                        periodStart: new Date(),
                    });
                    if (couponCode) {
                        await (0, coupon_1.incrementCouponUsage)(couponCode);
                    }
                    console.log(`[Mercado Pago] Payment approved for org ${organizationId}${couponCode ? ` (cupom: ${couponCode})` : ''}`);
                }
                else if (externalRef.plan) {
                    const amount = paymentInfo.transaction_amount;
                    console.log(`[Mercado Pago] Public payment approved: ${dataId}, plan=${planName}, email=${payerEmail}`);
                    await recordPayment({
                        organizationId: `pending_${dataId}`,
                        mpPaymentId: dataId,
                        amount: (amount || 0) * 100,
                        originalAmount,
                        discountAmount,
                        couponCode,
                        status: 'succeeded',
                        plan: planName,
                        description: `Pagamento público ${planName}${couponCode ? ` (cupom: ${couponCode})` : ''} - aguardando cadastro`,
                        periodStart: new Date(),
                    });
                }
                else {
                    console.log(`[Mercado Pago] Payment ${dataId} approved but has no external_reference — skipping`);
                }
            }
            else if ((status === 'rejected' || status === 'cancelled') && organizationId) {
                await recordPayment({
                    organizationId,
                    mpPaymentId: dataId,
                    amount: paymentInfo.transaction_amount * 100 || 0,
                    originalAmount,
                    discountAmount,
                    couponCode,
                    status: 'failed',
                    plan: planName,
                    description: `Pagamento ${status}${couponCode ? ` (cupom: ${couponCode})` : ''} - ${statusDetail || ''}`.trim(),
                });
            }
            if (eventLog) {
                await (0, webhook_events_1.updateEventLog)(eventLog.id, {
                    status: 'processed',
                    responseBody: { status },
                });
            }
        }
        else if (type === 'subscription_preapproval') {
            const preapprovalInfo = await getPreapprovalInfo(dataId);
            let externalRef = {};
            try {
                const ref = preapprovalInfo.external_reference;
                externalRef = ref ? JSON.parse(ref) : {};
            }
            catch { /* ignore */ }
            const organizationId = externalRef.organizationId;
            const status = preapprovalInfo.status;
            const planName = externalRef.plan || 'FREE';
            if (organizationId) {
                if (status === 'authorized' || status === 'active') {
                    await database_1.default.organization.update({
                        where: { id: organizationId },
                        data: {
                            mpSubscriptionId: dataId,
                            mpSubscriptionStatus: 'active',
                            plan: planName,
                        },
                    });
                    await database_1.default.user.updateMany({
                        where: { organizationId },
                        data: { plan: planName },
                    });
                    await recordPayment({
                        organizationId,
                        mpPreapprovalId: dataId,
                        amount: PLANS[planName]?.amount || 0,
                        status: 'succeeded',
                        plan: planName,
                        description: `Assinatura ${planName} ativada`,
                        periodStart: new Date(),
                    });
                }
                else if (status === 'cancelled' || status === 'paused') {
                    const newStatus = status === 'cancelled' ? 'canceled' : 'paused';
                    await database_1.default.organization.update({
                        where: { id: organizationId },
                        data: { mpSubscriptionStatus: newStatus },
                    });
                    if (status === 'cancelled') {
                        await database_1.default.user.updateMany({
                            where: { organizationId },
                            data: { plan: 'FREE' },
                        });
                    }
                }
            }
            if (eventLog) {
                await (0, webhook_events_1.updateEventLog)(eventLog.id, {
                    status: 'processed',
                    responseBody: { status, planName },
                });
            }
        }
        else {
            if (eventLog) {
                await (0, webhook_events_1.updateEventLog)(eventLog.id, { status: 'processed' });
            }
        }
    }
    catch (error) {
        console.error('[Mercado Pago] Webhook processing error:', error);
        if (eventLog) {
            await (0, webhook_events_1.updateEventLog)(eventLog.id, {
                status: 'failed',
                errorMessage: error.message,
            });
        }
    }
}
async function linkPaymentToUser(params) {
    if (!client) {
        console.warn('[Payment] Cannot link payment — Mercado Pago não configurado');
        return null;
    }
    try {
        const paymentInfo = await getPaymentInfo(params.paymentId);
        const status = paymentInfo.status;
        const payerEmail = paymentInfo.payer?.email;
        if (status !== 'approved') {
            console.log(`[Payment] Payment ${params.paymentId} status is "${status}" — not linking`);
            return null;
        }
        if (payerEmail && payerEmail.toLowerCase() !== params.userEmail.toLowerCase()) {
            console.warn(`[Payment] Email mismatch for payment ${params.paymentId}: registered=${params.userEmail}, mp=${payerEmail} — not linking`);
            return null;
        }
        let externalRef = {};
        try {
            const ref = paymentInfo.external_reference;
            externalRef = ref ? JSON.parse(ref) : {};
        }
        catch { /* ignore */ }
        const planName = externalRef.plan || 'STARTER';
        const amount = paymentInfo.transaction_amount;
        await database_1.default.organization.update({
            where: { id: params.organizationId },
            data: {
                mpCustomerId: payerEmail || null,
                mpSubscriptionStatus: 'active',
                plan: planName,
            },
        });
        await database_1.default.user.update({
            where: { id: params.userId },
            data: { plan: planName },
        });
        const pendingOrgId = `pending_${params.paymentId}`;
        await database_1.default.payment.updateMany({
            where: { organizationId: pendingOrgId },
            data: { organizationId: params.organizationId },
        });
        console.log(`[Payment] Public checkout payment ${params.paymentId} linked to org ${params.organizationId}, plan=${planName}`);
        return {
            plan: planName,
            planName: PLANS[planName]?.name || planName,
            linked: true,
        };
    }
    catch (error) {
        console.error('[Payment] Error linking payment to user:', error);
        return null;
    }
}
async function cancelSubscription(organizationId) {
    if (!client)
        throw new Error('Mercado Pago não configurado');
    const org = await database_1.default.organization.findUnique({
        where: { id: organizationId },
        select: { mpSubscriptionId: true },
    });
    if (!org?.mpSubscriptionId) {
        throw new Error('Nenhuma assinatura ativa encontrada para cancelar');
    }
    try {
        const preapproval = new mercadopago_1.PreApproval(client);
        await preapproval.update({
            id: org.mpSubscriptionId,
            body: { status: 'cancelled' },
        });
    }
    catch (err) {
        console.error('[Payment] Error canceling on Mercado Pago:', err);
    }
    await database_1.default.organization.update({
        where: { id: organizationId },
        data: {
            mpSubscriptionStatus: 'canceled',
            plan: 'FREE',
        },
    });
    await database_1.default.user.updateMany({
        where: { organizationId },
        data: { plan: 'FREE' },
    });
    console.log(`[Payment] Subscription canceled for org ${organizationId}`);
    return { canceled: true };
}
//# sourceMappingURL=payment.js.map