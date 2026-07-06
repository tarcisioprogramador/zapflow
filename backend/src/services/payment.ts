/**
 * Payment Service - Mercado Pago Integration
 * Handles checkout preferences, subscriptions, PIX, and webhook processing
 */

import { MercadoPagoConfig, Preference, PreApproval, Payment as MpPayment } from 'mercadopago';
import crypto from 'crypto';
import prisma from '../config/database';

const mpAccessToken = process.env.MP_ACCESS_TOKEN || '';
const mpPublicKey = process.env.MP_PUBLIC_KEY || '';
const MP_WEBHOOK_SECRET = process.env.MP_WEBHOOK_SECRET || '';

// Max age for webhook notification timestamps (5 minutes)
const MAX_WEBHOOK_AGE_MS = 5 * 60 * 1000;

let client: MercadoPagoConfig | null = null;
try {
  if (mpAccessToken) {
    client = new MercadoPagoConfig({ accessToken: mpAccessToken });
  }
} catch {
  console.warn('[Mercado Pago] Invalid access token');
}

// Plan configuration
const PLANS: Record<string, { name: string; amount: number }> = {
  STARTER: { name: 'IA Starter', amount: 9700 },
  PRO: { name: 'IA Pro', amount: 19700 },
  ENTERPRISE: { name: 'Enterprise', amount: 49700 },
};

/**
 * Check Mercado Pago configuration status
 */
export function getMpStatus() {
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

/**
 * Validate Mercado Pago webhook notification signature
 * 
 * Mercado Pago sends the x-signature header in format:
 *   ts=<timestamp>,v1=<hmac_hex>
 * 
 * The manifest to sign is:
 *   id:<data.id>;request-id:<x-request-id>;ts:<ts>;
 * 
 * Uses HMAC-SHA256 with the configured webhook secret key.
 * Also validates the timestamp to prevent replay attacks.
 * 
 * If MP_WEBHOOK_SECRET is not configured, returns true with a warning.
 */
export function validateWebhookSignature(req: {
  headers: Record<string, string | string[] | undefined>;
  query: Record<string, string | undefined>;
  body: any;
}): { valid: boolean; reason?: string } {
  // If no secret configured, warn but allow (backward compatibility)
  if (!MP_WEBHOOK_SECRET) {
    console.warn('[Mercado Pago] MP_WEBHOOK_SECRET não configurado — validação de assinatura desabilitada');
    return { valid: true };
  }

  const xSignature = req.headers['x-signature'] as string | undefined;
  const xRequestId = req.headers['x-request-id'] as string | undefined;

  if (!xSignature) {
    return { valid: false, reason: 'Header x-signature ausente' };
  }

  // Parse x-signature: ts=<timestamp>,v1=<hmac>
  const tsMatch = xSignature.match(/ts=(\d+)/);
  const v1Match = xSignature.match(/v1=([a-f0-9]+)/);

  if (!tsMatch || !v1Match) {
    return { valid: false, reason: 'Formato do x-signature inválido' };
  }

  const ts = tsMatch[1];
  const receivedHash = v1Match[1];

  // Get data.id from query string (?!data.id=...) or from body.data?.id
  const dataId =
    req.query['data.id'] ||
    req.query['data_id'] ||
    req.body?.data?.id?.toString() ||
    '';

  if (!dataId) {
    return { valid: false, reason: 'data.id não encontrado na requisição' };
  }

  // Validate timestamp (prevent replay attacks)
  const timestamp = parseInt(ts, 10);
  const now = Date.now();
  if (isNaN(timestamp) || now - timestamp > MAX_WEBHOOK_AGE_MS) {
    return {
      valid: false,
      reason: 'Timestamp do webhook expirado ou inválido (replay attack?)',
    };
  }

  // Build the manifest string to sign
  // Format: id:<data.id>;ts:<ts>;
  // If x-request-id is present, append: request-id:<x-request-id>;
  // Per Mercado Pago docs: omit missing values from the manifest.
  let manifest = `id:${dataId};ts:${ts};`;
  if (xRequestId) {
    manifest = `id:${dataId};request-id:${xRequestId};ts:${ts};`;
  }

  // Compute HMAC-SHA256
  const computedHash = crypto
    .createHmac('sha256', MP_WEBHOOK_SECRET)
    .update(manifest, 'utf8')
    .digest('hex');

  // Constant-time comparison to prevent timing attacks
  if (computedHash.length !== receivedHash.length) {
    return { valid: false, reason: 'Assinatura inválida (tamanho diferente)' };
  }

  // Use timingSafeEqual for constant-time comparison
  // Convert hex strings to buffers for proper byte comparison
  try {
    const computedBuf = Buffer.from(computedHash, 'hex');
    const receivedBuf = Buffer.from(receivedHash, 'hex');
    if (!crypto.timingSafeEqual(computedBuf, receivedBuf)) {
      return { valid: false, reason: 'Assinatura inválida (hash não confere)' };
    }
  } catch {
    return { valid: false, reason: 'Erro ao comparar assinaturas' };
  }

  console.log(`[Mercado Pago] Webhook signature verified ✓ (data.id=${dataId})`);
  return { valid: true };
}

/**
 * Create a Mercado Pago Checkout Pro preference (redirect-based)
 * Supports PIX, card, and boleto as payment methods
 */
export async function createCheckoutPreference(params: {
  plan: 'STARTER' | 'PRO' | 'ENTERPRISE';
  customerEmail?: string;
  userId?: string;
  organizationId?: string;
  successUrl: string;
  cancelUrl: string;
  isOneTime?: boolean;
}) {
  if (!client) {
    throw new Error('Mercado Pago não configurado. Adicione MP_ACCESS_TOKEN no .env');
  }

  const plan = PLANS[params.plan];
  if (!plan) {
    throw new Error(`Plano ${params.plan} inválido`);
  }

  const amountInReais = plan.amount / 100;
  const paymentType = params.isOneTime ? 'Pagamento único' : 'Assinatura mensal';

  const externalRef = JSON.stringify({
    plan: params.plan,
    ...(params.userId ? { userId: params.userId } : {}),
    ...(params.organizationId ? { organizationId: params.organizationId } : {}),
  });

  const body: any = {
    items: [
      {
        id: params.plan,
        title: `ZapFlow ${plan.name}`,
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
    // auto_return: só funciona com URLs públicas (não localhost/127.0.0.1)
    ...(params.successUrl.includes('://localhost') || params.successUrl.includes('://127.')
      ? {}
      : { auto_return: 'approved' }),
    external_reference: externalRef,
    payment_methods: {
      installments: 1,
    },
    notification_url: params.successUrl.replace('/payment/success', '/api/webhook/mercadopago'),
  };

  // Only add payer if email is provided
  if (params.customerEmail) {
    body.payer = { email: params.customerEmail };
    body.metadata = {
      ...(params.userId ? { userId: params.userId } : {}),
      ...(params.organizationId ? { organizationId: params.organizationId } : {}),
      plan: params.plan,
    };
  }

  const preference = new Preference(client);
  const result = await preference.create({ body });

  return {
    url: result.init_point,
    sandboxUrl: result.sandbox_init_point,
    preferenceId: result.id,
  };
}

/**
 * Create a Mercado Pago subscription (PreApproval)
 * Used for recurring billing
 */
export async function createSubscription(params: {
  plan: 'STARTER' | 'PRO' | 'ENTERPRISE';
  payerEmail: string;
  userId: string;
  organizationId: string;
  backUrl: string;
}) {
  if (!client) {
    throw new Error('Mercado Pago não configurado');
  }

  const plan = PLANS[params.plan];
  if (!plan) {
    throw new Error(`Plano ${params.plan} inválido`);
  }

  const amountInReais = plan.amount / 100;

  const preapproval = new PreApproval(client);

  const result = await preapproval.create({
    body: {
      reason: `ZapFlow ${plan.name}`,
      auto_recurring: {
        frequency: 1,
        frequency_type: 'months',
        transaction_amount: amountInReais,
        currency_id: 'BRL',
      },
      payer_email: params.payerEmail,
      back_url: params.backUrl,
      external_reference: JSON.stringify({
        userId: params.userId,
        organizationId: params.organizationId,
        plan: params.plan,
      }),
      status: 'pending',
    },
  });

  return {
    url: result.init_point,
    preapprovalId: result.id,
  };
}

/**
 * Get payment info by ID
 */
export async function getPaymentInfo(paymentId: string) {
  if (!client) throw new Error('Mercado Pago não configurado');

  const payment = new MpPayment(client);
  return payment.get({ id: paymentId });
}

/**
 * Get preapproval (subscription) info by ID
 */
export async function getPreapprovalInfo(preapprovalId: string) {
  if (!client) throw new Error('Mercado Pago não configurado');

  const preapproval = new PreApproval(client);
  return preapproval.get({ id: preapprovalId });
}

/**
 * Create a portal-like link to Mercado Pago customer panel
 * Mercado Pago doesn't have a full customer portal like Stripe,
 * but we can redirect users to their subscription management page
 */
export function getCustomerPanelUrl(customerEmail: string) {
  // Mercado Pago doesn't have a standard customer portal.
  // Users manage subscriptions via the Mercado Pago app or through the platform.
  return 'https://www.mercadopago.com.br/subscriptions';
}

/**
 * Record a payment transaction in the database
 */
export async function recordPayment(params: {
  organizationId: string;
  mpPaymentId?: string | null;
  mpPreapprovalId?: string | null;
  amount: number;
  currency?: string;
  status: 'pending' | 'succeeded' | 'failed' | 'refunded';
  plan: string;
  description?: string | null;
  periodStart?: Date | null;
  periodEnd?: Date | null;
}) {
  try {
    await prisma.payment.create({
      data: {
        organizationId: params.organizationId,
        stripePaymentIntentId: params.mpPaymentId, // reuse Stripe field for MP payment ID
        stripeSubscriptionId: params.mpPreapprovalId, // reuse Stripe field for MP preapproval ID
        amount: params.amount,
        currency: params.currency || 'brl',
        status: params.status,
        plan: params.plan,
        description: params.description,
        periodStart: params.periodStart,
        periodEnd: params.periodEnd,
      },
    });
    console.log(`[Payment] Recorded: ${params.status} - ${params.plan} - R$ ${(params.amount / 100).toFixed(2)}`);
  } catch (err) {
    console.error('[Payment] Failed to record payment:', err);
  }
}

/**
 * Handle Mercado Pago webhook notification
 * Types:
 * - payment: when a payment status changes
 * - subscription_preapproval: when a preapproval/subscription status changes
 */
export async function handleWebhookNotification(body: any) {
  const { type, action, data } = body;

  console.log(`[Mercado Pago] Processing notification: ${type}/${action}`);

  try {
    if (type === 'payment') {
      const paymentId = data?.id;
      if (!paymentId) {
        console.warn('[Mercado Pago] Payment notification without payment ID');
        return;
      }

      const paymentInfo = await getPaymentInfo(paymentId.toString());

      // Parse external reference to get userId, orgId, plan
      let externalRef: any = {};
      try {
        const ref = (paymentInfo as any).external_reference;
        externalRef = ref ? JSON.parse(ref) : {};
      } catch { /* ignore */ }

      const organizationId = externalRef.organizationId;
      const userId = externalRef.userId;
      const planName = externalRef.plan || 'STARTER';
      const status = paymentInfo.status;
      const statusDetail = (paymentInfo as any).status_detail;
      const payerEmail = (paymentInfo as any).payer?.email;

      if (status === 'approved') {
        if (organizationId && organizationId !== 'pending') {
          // Normal checkout — user already exists
          await prisma.organization.update({
            where: { id: organizationId },
            data: {
              stripeCustomerId: payerEmail || null,
              stripeSubscriptionStatus: 'active',
              plan: planName,
            },
          });

          if (userId && userId !== 'pending') {
            await prisma.user.update({
              where: { id: userId },
              data: { plan: planName },
            });
          }

          await recordPayment({
            organizationId,
            mpPaymentId: paymentId.toString(),
            amount: (paymentInfo as any).transaction_amount * 100 || 0,
            status: 'succeeded',
            plan: planName,
            description: `Pagamento ${planName} - ${(paymentInfo as any).payment_method?.id || ''}`.trim(),
            periodStart: new Date(),
          });

          console.log(`[Mercado Pago] Payment approved for org ${organizationId}`);
        } else if (externalRef.plan) {
          // Public checkout — has external ref but no user yet. Store payment info for later registration.
          const amount = (paymentInfo as any).transaction_amount;
          console.log(`[Mercado Pago] Public payment approved: ${paymentId}, plan=${planName}, email=${payerEmail}, amount=${amount}`);

          await recordPayment({
            organizationId: `pending_${paymentId}`, // placeholder org ID
            mpPaymentId: paymentId.toString(),
            amount: (amount || 0) * 100,
            status: 'succeeded',
            plan: planName,
            description: `Pagamento público ${planName} - aguardando cadastro`,
            periodStart: new Date(),
          });
        } else {
          // No external reference — payment not created by our system, skip
          console.log(`[Mercado Pago] Payment ${paymentId} approved but has no external_reference — skipping`);
        }
      } else if ((status === 'rejected' || status === 'cancelled') && organizationId) {
        await recordPayment({
          organizationId,
          mpPaymentId: paymentId.toString(),
          amount: (paymentInfo as any).transaction_amount * 100 || 0,
          status: 'failed',
          plan: planName,
          description: `Pagamento ${status} - ${statusDetail || ''}`.trim(),
        });
      }
    } else if (type === 'subscription_preapproval') {
      const preapprovalId = data?.id;
      if (!preapprovalId) {
        console.warn('[Mercado Pago] Preapproval notification without ID');
        return;
      }

      const preapprovalInfo = await getPreapprovalInfo(preapprovalId.toString());

      // Parse external reference
      let externalRef: any = {};
      try {
        const ref = (preapprovalInfo as any).external_reference;
        externalRef = ref ? JSON.parse(ref) : {};
      } catch { /* ignore */ }

      const organizationId = externalRef.organizationId;
      const status = preapprovalInfo.status;

      if (organizationId) {
        if (status === 'authorized' || status === 'active') {
          await prisma.organization.update({
            where: { id: organizationId },
            data: {
              stripeSubscriptionId: preapprovalId.toString(),
              stripeSubscriptionStatus: 'active',
            },
          });
        } else if (status === 'cancelled' || status === 'paused') {
          await prisma.organization.update({
            where: { id: organizationId },
            data: {
              stripeSubscriptionStatus: status === 'cancelled' ? 'canceled' : 'paused',
            },
          });

          if (status === 'cancelled') {
            await prisma.user.updateMany({
              where: { organizationId },
              data: { plan: 'FREE' },
            });
          }
        }
      }
    }
  } catch (error) {
    console.error('[Mercado Pago] Webhook processing error:', error);
  }
}

/**
 * Link a public checkout payment to a newly created user/organization.
 * Called after registration on the success page.
 */
export async function linkPaymentToUser(params: {
  paymentId: string;
  organizationId: string;
  userId: string;
  userEmail: string;
}): Promise<{ plan: string; planName: string; linked: boolean } | null> {
  if (!client) {
    console.warn('[Payment] Cannot link payment — Mercado Pago não configurado');
    return null;
  }

  try {
    const paymentInfo = await getPaymentInfo(params.paymentId);
    const status = paymentInfo.status;
    const payerEmail = (paymentInfo as any).payer?.email;

    if (status !== 'approved') {
      console.log(`[Payment] Payment ${params.paymentId} status is "${status}" — not linking`);
      return null;
    }

    // Security: validate that the registering user's email matches the MP payer email
    if (payerEmail && payerEmail.toLowerCase() !== params.userEmail.toLowerCase()) {
      console.warn(`[Payment] Email mismatch for payment ${params.paymentId}: registered=${params.userEmail}, mp=${payerEmail} — not linking`);
      return null;
    }

    // Parse external reference to get plan name
    let externalRef: any = {};
    try {
      const ref = (paymentInfo as any).external_reference;
      externalRef = ref ? JSON.parse(ref) : {};
    } catch { /* ignore */ }

    const planName = externalRef.plan || 'STARTER';
    const amount = (paymentInfo as any).transaction_amount;

    // Update organization with plan info
    await prisma.organization.update({
      where: { id: params.organizationId },
      data: {
        stripeCustomerId: payerEmail || null,
        stripeSubscriptionStatus: 'active',
        plan: planName,
      },
    });

    // Update user plan
    await prisma.user.update({
      where: { id: params.userId },
      data: { plan: planName },
    });

    // Migrate payment records from pending_{paymentId} placeholder to real org
    const pendingOrgId = `pending_${params.paymentId}`;
    await prisma.payment.updateMany({
      where: { organizationId: pendingOrgId },
      data: { organizationId: params.organizationId },
    });

    console.log(`[Payment] Public checkout payment ${params.paymentId} linked to org ${params.organizationId}, plan=${planName}`);

    return {
      plan: planName,
      planName: PLANS[planName]?.name || planName,
      linked: true,
    };
  } catch (error) {
    console.error('[Payment] Error linking payment to user:', error);
    return null;
  }
}

export { PLANS };
