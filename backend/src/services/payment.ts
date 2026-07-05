/**
 * Payment Service - Stripe Integration
 * Handles checkout sessions, subscriptions, and webhook processing
 */

import Stripe from 'stripe';
import prisma from '../config/database';

const stripeKey = process.env.STRIPE_SECRET_KEY || '';
export const stripe: Stripe | null = stripeKey ? new Stripe(stripeKey) : null;

export const STRIPE_PUBLISHABLE_KEY = process.env.STRIPE_PUBLISHABLE_KEY || '';
export const STRIPE_WEBHOOK_SECRET = process.env.STRIPE_WEBHOOK_SECRET || '';

// eslint-disable-next-line @typescript-eslint/no-unused-vars
interface PlanConfig {
  priceId: string;
  name: string;
  amount: number;
}

// Plan configuration: maps plan IDs to Stripe Price IDs
// These must be created in the Stripe Dashboard first
const PLANS: Record<string, PlanConfig> = {
  STARTER: {
    priceId: process.env.STRIPE_PRICE_STARTER || '',
    name: 'IA Starter',
    amount: 9700, // R$ 97,00
  },
  PRO: {
    priceId: process.env.STRIPE_PRICE_PRO || '',
    name: 'IA Pro',
    amount: 19700, // R$ 197,00
  },
  ENTERPRISE: {
    priceId: process.env.STRIPE_PRICE_ENTERPRISE || '',
    name: 'Enterprise',
    amount: 49700, // R$ 497,00
  },
};

/**
 * Check Stripe configuration status
 */
export function getStripeStatus() {
  const hasSecretKey = !!process.env.STRIPE_SECRET_KEY;
  const hasPublishableKey = !!process.env.STRIPE_PUBLISHABLE_KEY;
  const hasWebhookSecret = !!process.env.STRIPE_WEBHOOK_SECRET;
  const hasStarterPrice = !!process.env.STRIPE_PRICE_STARTER;
  const hasProPrice = !!process.env.STRIPE_PRICE_PRO;
  const hasEnterprisePrice = !!process.env.STRIPE_PRICE_ENTERPRISE;

  const isConfigured = hasSecretKey && hasPublishableKey && hasStarterPrice && hasProPrice && hasEnterprisePrice;
  const canCheckout = isConfigured;

  return {
    configured: isConfigured,
    canCheckout,
    keys: {
      secretKey: hasSecretKey,
      publishableKey: hasPublishableKey,
      webhookSecret: hasWebhookSecret,
      starterPrice: hasStarterPrice,
      proPrice: hasProPrice,
      enterprisePrice: hasEnterprisePrice,
    },
    missingKeys: [
      !hasSecretKey && 'STRIPE_SECRET_KEY',
      !hasPublishableKey && 'STRIPE_PUBLISHABLE_KEY',
      !hasWebhookSecret && 'STRIPE_WEBHOOK_SECRET',
      !hasStarterPrice && 'STRIPE_PRICE_STARTER',
      !hasProPrice && 'STRIPE_PRICE_PRO',
      !hasEnterprisePrice && 'STRIPE_PRICE_ENTERPRISE',
    ].filter(Boolean),
    nextStep: !hasSecretKey
      ? 'Criar conta Stripe e copiar Secret Key'
      : !hasStarterPrice
        ? 'Rodar setup de produtos (POST /api/payments/setup-products)'
        : !hasWebhookSecret
          ? 'Configurar webhook no Stripe Dashboard'
          : 'Pronto para vender!',
  };
}

/**
 * Create Stripe products and prices automatically
 */
export async function setupStripeProducts() {
  if (!stripe) {
    throw new Error('Stripe não configurado. Adicione STRIPE_SECRET_KEY no .env primeiro.');
  }

  const plans = [
    {
      id: 'zapflow-starter',
      name: 'IA Starter',
      description: 'Para quem está começando a automatizar o WhatsApp',
      amount: 9700,
      features: [
        '1 Número conectado', '5 Atendentes no chat', 'CRM Kanban (2 quadros)',
        '10 Fluxos automáticos', '5 Campanhas em massa', '15.000 Webhooks', '5M Tokens de IA',
      ],
    },
    {
      id: 'zapflow-pro',
      name: 'IA Pro',
      description: 'Para empresas que querem escalar com IA',
      amount: 19700,
      features: [
        '1 Número conectado', 'Atendentes ilimitados', 'CRM Kanban (5 quadros)',
        'Fluxos ilimitados', 'Campanhas ilimitadas', '30.000 Webhooks',
        '10M Tokens de IA', 'IA Megan (Auto Reply 24h)', 'Integrações Post/Put/Get',
      ],
    },
    {
      id: 'zapflow-enterprise',
      name: 'Enterprise',
      description: 'Para grandes operações que exigem o máximo de performance',
      amount: 49700,
      features: [
        'Números ilimitados', 'Atendentes ilimitados', 'CRM Kanban ilimitado',
        'Fluxos ilimitados', 'Campanhas ilimitadas', 'Webhooks ilimitados',
        '20M Tokens de IA', 'IA Megan (Auto Reply 24h)', 'Integrações Post/Put/Get',
        'Suporte prioritário 24h', 'SLA 99.9%', 'Onboarding dedicado',
      ],
    },
  ];

  const results: Array<{ plan: string; planId: string; priceId: string }> = [];

  for (const plan of plans) {
    // Check if product already exists
    const existingProducts = await stripe.products.search({
      query: `metadata['app_id']:'${plan.id}'`,
    });

    let product;
    if (existingProducts.data.length > 0) {
      product = existingProducts.data[0];
    } else {
      product = await stripe.products.create({
        name: plan.name,
        description: plan.description,
        metadata: {
          app_id: plan.id,
          features: JSON.stringify(plan.features),
        },
      });
    }

    // Check if price already exists
    const existingPrices = await stripe.prices.list({
      product: product.id,
      active: true,
      limit: 10,
    });

    const existingMonthlyPrice = existingPrices.data.find(
      (p) => p.recurring?.interval === 'month'
    );

    let price;
    if (existingMonthlyPrice) {
      price = existingMonthlyPrice;
    } else {
      price = await stripe.prices.create({
        product: product.id,
        unit_amount: plan.amount,
        currency: 'brl',
        recurring: { interval: 'month' },
        metadata: { app_id: plan.id },
      });
    }

    results.push({
      plan: plan.name,
      planId: plan.id.replace('zapflow-', '').toUpperCase(),
      priceId: price.id,
    });
  }

  return results;
}

/**
 * Create a Stripe Checkout Session for subscription
 */
export async function createCheckoutSession(params: {
  plan: 'STARTER' | 'PRO' | 'ENTERPRISE';
  customerEmail: string;
  userId: string;
  organizationId: string;
  successUrl: string;
  cancelUrl: string;
}) {
  if (!stripe) {
    throw new Error('Stripe não configurado. Adicione STRIPE_SECRET_KEY no .env');
  }

  const plan = PLANS[params.plan];
  if (!plan || !plan.priceId) {
    throw new Error(
      `Plano ${params.plan} não configurado. Crie o preço no Stripe e adicione STRIPE_PRICE_${params.plan} no .env`
    );
  }

  const session = await stripe.checkout.sessions.create({
    mode: 'subscription',
    payment_method_types: ['card', 'boleto'],
    line_items: [
      {
        price: plan.priceId,
        quantity: 1,
      },
    ],
    customer_email: params.customerEmail,
    metadata: {
      userId: params.userId,
      organizationId: params.organizationId,
      plan: params.plan,
    },
    subscription_data: {
      metadata: {
        userId: params.userId,
        organizationId: params.organizationId,
        plan: params.plan,
      },
    },
    success_url: params.successUrl,
    cancel_url: params.cancelUrl,
    locale: 'pt-BR',
  });

  return { url: session.url, sessionId: session.id };
}

/**
 * Create a portal session for managing the subscription
 */
export async function createPortalSession(params: {
  customerId: string;
  returnUrl: string;
}) {
  if (!stripe) throw new Error('Stripe não configurado');

  const session = await stripe.billingPortal.sessions.create({
    customer: params.customerId,
    return_url: params.returnUrl,
  });

  return { url: session.url };
 }

/**
 * Retrieve a checkout session
 */
export async function getCheckoutSession(sessionId: string) {
  if (!stripe) throw new Error('Stripe não configurado');
  return stripe.checkout.sessions.retrieve(sessionId, {
    expand: ['subscription', 'customer', 'line_items'],
  });
}

/**
 * Record a payment transaction in the database
 */
export async function recordPayment(params: {
  organizationId: string;
  stripePaymentIntentId?: string | null;
  stripeInvoiceId?: string | null;
  stripeSubscriptionId?: string | null;
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
        stripePaymentIntentId: params.stripePaymentIntentId,
        stripeInvoiceId: params.stripeInvoiceId,
        stripeSubscriptionId: params.stripeSubscriptionId,
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
 * Handle Stripe webhook event
 */
export async function handleWebhookEvent(event: Stripe.Event) {
  console.log(`[Stripe] Processing event: ${event.type}`);

  switch (event.type) {
    case 'checkout.session.completed': {
      const session = event.data.object as Stripe.Checkout.Session;
      const { userId, organizationId, plan } = session.metadata || {};

      if (!userId || !organizationId) {
        console.error('[Stripe] Missing metadata in session:', session.id);
        break;
      }

      const customerId = session.customer as string;
      const subscriptionId = session.subscription as string;
      const planName = plan || 'STARTER';

      // Update organization with Stripe customer info
      await prisma.organization.update({
        where: { id: organizationId },
        data: {
          stripeCustomerId: customerId,
          stripeSubscriptionId: subscriptionId,
          stripeSubscriptionStatus: 'active',
          plan: planName,
        },
      });

      // Update user plan
      await prisma.user.update({
        where: { id: userId },
        data: { plan: planName },
      });

      // Record initial payment
      const amountTotal = session.amount_total || PLANS[planName]?.amount || 0;
      const sess = session as any;
      await recordPayment({
        organizationId,
        stripePaymentIntentId: sess.payment_intent as string,
        stripeSubscriptionId: subscriptionId,
        amount: amountTotal,
        status: 'succeeded',
        plan: planName,
        description: `Assinatura ${PLANS[planName]?.name || planName}`,
        periodStart: new Date(),
      });

      console.log(`[Stripe] Subscription created for user ${userId}, plan ${planName}`);
      break;
    }

    case 'invoice.payment_succeeded': {
      const invoice = event.data.object as Stripe.Invoice;
      const invoiceWithSub = invoice as Stripe.Invoice & { subscription?: string | Stripe.Subscription | null };
      const subscriptionId = typeof invoiceWithSub.subscription === 'string' ? invoiceWithSub.subscription : null;
      const customerId = invoice.customer as string;

      if (subscriptionId) {
        // Find org by subscription
        const org = await prisma.organization.findFirst({
          where: { stripeSubscriptionId: subscriptionId },
        });

        if (org) {
          const inv = invoice as any;
          const periodStart = inv.period_start ? new Date(inv.period_start * 1000) : null;
          const periodEnd = inv.period_end ? new Date(inv.period_end * 1000) : null;

          // Update subscription period
          await prisma.organization.update({
            where: { id: org.id },
            data: {
              stripeSubscriptionStatus: 'active',
              stripeCurrentPeriodEnd: periodEnd,
            },
          });

          // Record the payment
          const inv2 = invoice as any;
          await recordPayment({
            organizationId: org.id,
            stripePaymentIntentId: inv2.payment_intent as string,
            stripeInvoiceId: inv2.id,
            stripeSubscriptionId: subscriptionId,
            amount: inv2.total,
            status: 'succeeded',
            plan: org.plan,
            description: `Fatura ${org.plan} - ${inv2.number || ''}`.trim(),
            periodStart,
            periodEnd,
          });

          console.log(`[Stripe] Payment succeeded for org ${org.id}: R$ ${(invoice.total / 100).toFixed(2)}`);
        }
      }
      break;
    }

    case 'invoice.payment_failed': {
      const failedInvoice = event.data.object as Stripe.Invoice;
      const failedWithSub = failedInvoice as Stripe.Invoice & { subscription?: string | Stripe.Subscription | null };
      const failedSubId = typeof failedWithSub.subscription === 'string' ? failedWithSub.subscription : null;

      if (failedSubId) {
        const org = await prisma.organization.findFirst({
          where: { stripeSubscriptionId: failedSubId },
        });

        if (org) {
          await recordPayment({
            organizationId: org.id,
            stripeInvoiceId: failedInvoice.id,
            stripeSubscriptionId: failedSubId,
            amount: failedInvoice.total,
            status: 'failed',
            plan: org.plan,
            description: `Fatura não paga - ${org.plan}`,
          });

          await prisma.organization.update({
            where: { id: org.id },
            data: { stripeSubscriptionStatus: 'past_due' },
          });
        }
        console.log(`[Stripe] Payment failed for subscription ${failedSubId}`);
      }
      break;
    }

    case 'customer.subscription.deleted':
    case 'customer.subscription.updated': {
      const subscription = event.data.object as Stripe.Subscription;
      const subCustomerId = subscription.customer as string;

      const org = await prisma.organization.findFirst({
        where: { stripeCustomerId: subCustomerId },
      });

      if (org) {
        const status = subscription.status;
        const sub = subscription as any;
        const periodEnd = sub.current_period_end
          ? new Date(sub.current_period_end * 1000)
          : null;

        await prisma.organization.update({
          where: { id: org.id },
          data: {
            stripeSubscriptionStatus: status,
            stripeCurrentPeriodEnd: periodEnd,
            stripeSubscriptionId: subscription.id,
            plan: status === 'active' || status === 'trialing'
              ? org.plan
              : 'FREE',
          },
        });

        if (status === 'canceled' || status === 'unpaid' || status === 'incomplete_expired') {
          // Downgrade user plan too
          await prisma.user.updateMany({
            where: { organizationId: org.id },
            data: { plan: 'FREE' },
          });

          console.log(`[Stripe] Subscription ${status} for org ${org.id}, downgraded to FREE`);
        }
      }
      break;
    }

    default:
      console.log(`[Stripe] Unhandled event type: ${event.type}`);
  }
}

export { PLANS };
