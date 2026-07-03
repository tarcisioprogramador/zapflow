/**
 * Payment Service - Stripe Integration
 * Handles checkout sessions, subscriptions, and webhook processing
 */

import Stripe from 'stripe';
import prisma from '../config/database';

const stripeKey = process.env.STRIPE_SECRET_KEY || '';
export const stripe = stripeKey ? new Stripe(stripeKey) : null;

export const STRIPE_PUBLISHABLE_KEY = process.env.STRIPE_PUBLISHABLE_KEY || '';
export const STRIPE_WEBHOOK_SECRET = process.env.STRIPE_WEBHOOK_SECRET || '';

// Plan configuration: maps plan IDs to Stripe Price IDs
// These must be created in the Stripe Dashboard first
const PLANS: Record<string, { priceId: string; name: string; amount: number }> = {
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
};

/**
 * Create a Stripe Checkout Session for subscription
 */
export async function createCheckoutSession(params: {
  plan: 'STARTER' | 'PRO';
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
          plan: planName,
        },
      });

      // Update user plan
      await prisma.user.update({
        where: { id: userId },
        data: { plan: planName },
      });

      console.log(`[Stripe] Subscription created for user ${userId}, plan ${planName}`);
      break;
    }

    case 'invoice.payment_succeeded': {
      const invoice = event.data.object as Stripe.Invoice;
      const subscriptionId = invoice.subscription as string;
      const customerId = invoice.customer as string;

      if (subscriptionId) {
        // Update subscription status
        const org = await prisma.organization.findFirst({
          where: { stripeSubscriptionId: subscriptionId },
        });

        if (org) {
          await prisma.organization.update({
            where: { id: org.id },
            data: { plan: org.plan }, // Keep current plan active
          });
          console.log(`[Stripe] Payment succeeded for org ${org.id}`);
        }
      }
      break;
    }

    case 'invoice.payment_failed': {
      const failedInvoice = event.data.object as Stripe.Invoice;
      const failedSubId = failedInvoice.subscription as string;

      if (failedSubId) {
        console.log(`[Stripe] Payment failed for subscription ${failedSubId}`);
        // Optionally downgrade plan or notify user
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
        if (status === 'canceled' || status === 'unpaid' || status === 'incomplete_expired') {
          await prisma.organization.update({
            where: { id: org.id },
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
