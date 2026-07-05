/**
 * Stripe Setup Script
 *
 * Creates products and prices in Stripe for ZapFlow plans.
 * Run: node scripts/setup-stripe.js
 *
 * Requires: STRIPE_SECRET_KEY in .env
 */

require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });

const STRIPE_SECRET_KEY = process.env.STRIPE_SECRET_KEY;

if (!STRIPE_SECRET_KEY) {
  console.error('');
  console.error('❌ STRIPE_SECRET_KEY não encontrada no .env');
  console.error('');
  console.error('  1. Acesse https://dashboard.stripe.com/apikeys');
  console.error('  2. Copie sua Secret Key (sk_live_... ou sk_test_...)');
  console.error('  3. Adicione no .env: STRIPE_SECRET_KEY=sk_test_...');
  console.error('');
  process.exit(1);
}

const stripe = require('stripe')(STRIPE_SECRET_KEY);

const PLANS = [
  {
    name: 'IA Starter',
    id: 'zapflow-starter',
    description: 'Para quem está começando a automatizar o WhatsApp',
    amount: 9700, // R$ 97,00
    currency: 'brl',
    interval: 'month',
    features: [
      '1 Número conectado',
      '5 Atendentes no chat',
      'CRM Kanban (2 quadros)',
      '10 Fluxos automáticos',
      '5 Campanhas em massa',
      '15.000 Webhooks',
      '5M Tokens de IA',
    ],
  },
  {
    name: 'IA Pro',
    id: 'zapflow-pro',
    description: 'Para empresas que querem escalar com IA',
    amount: 19700, // R$ 197,00
    currency: 'brl',
    interval: 'month',
    features: [
      '1 Número conectado',
      'Atendentes ilimitados',
      'CRM Kanban (5 quadros)',
      'Fluxos ilimitados',
      'Campanhas ilimitadas',
      '30.000 Webhooks',
      '10M Tokens de IA',
      'IA Megan (Auto Reply 24h)',
      'Integrações Post/Put/Get',
    ],
  },
  {
    name: 'Enterprise',
    id: 'zapflow-enterprise',
    description: 'Para grandes operações que exigem o máximo de performance',
    amount: 49700, // R$ 497,00
    currency: 'brl',
    interval: 'month',
    features: [
      'Números ilimitados',
      'Atendentes ilimitados',
      'CRM Kanban ilimitado',
      'Fluxos ilimitados',
      'Campanhas ilimitadas',
      'Webhooks ilimitados',
      '20M Tokens de IA',
      'IA Megan (Auto Reply 24h)',
      'Integrações Post/Put/Get',
      'Suporte prioritário 24h',
      'SLA 99.9%',
      'Onboarding dedicado',
    ],
  },
];

async function setup() {
  console.log('');
  console.log('🚀 Configurando produtos no Stripe...');
  console.log('');

  const results = [];

  for (const plan of PLANS) {
    console.log(`  Criando produto: ${plan.name}...`);

    // Check if product already exists
    const existingProducts = await stripe.products.search({
      query: `metadata['app_id']:'${plan.id}'`,
    });

    let product;
    if (existingProducts.data.length > 0) {
      product = existingProducts.data[0];
      console.log(`  ⚡ Produto já existe: ${product.id}`);
    } else {
      product = await stripe.products.create({
        name: plan.name,
        description: plan.description,
        metadata: {
          app_id: plan.id,
          features: JSON.stringify(plan.features),
        },
      });
      console.log(`  ✅ Produto criado: ${product.id}`);
    }

    // Check if price already exists for this product
    const existingPrices = await stripe.prices.list({
      product: product.id,
      active: true,
      limit: 10,
    });

    const existingMonthlyPrice = existingPrices.data.find(
      (p) => p.recurring?.interval === plan.interval
    );

    let price;
    if (existingMonthlyPrice) {
      price = existingMonthlyPrice;
      console.log(`  ⚡ Preço já existe: ${price.id} (R$ ${(plan.amount / 100).toFixed(2)})`);
    } else {
      price = await stripe.prices.create({
        product: product.id,
        unit_amount: plan.amount,
        currency: plan.currency,
        recurring: { interval: plan.interval },
        metadata: {
          app_id: plan.id,
        },
      });
      console.log(`  ✅ Preço criado: ${price.id} (R$ ${(plan.amount / 100).toFixed(2)})`);
    }

    results.push({
      plan: plan.name,
      planId: plan.id,
      productId: product.id,
      priceId: price.id,
      amount: plan.amount,
    });
  }

  console.log('');
  console.log('═══════════════════════════════════════════');
  console.log('  ✅ SETUP CONCLUÍDO!');
  console.log('═══════════════════════════════════════════');
  console.log('');
  console.log('  Adicione estas variáveis no seu .env:');
  console.log('');

  for (const r of results) {
    const envKey = `STRIPE_PRICE_${r.planId.replace('zapflow-', '').toUpperCase()}`;
    console.log(`  ${envKey}=${r.priceId}`);
  }

  console.log('');
  console.log('  Execute:');
  console.log(`  railway variables set STRIPE_PRICE_STARTER=${results[0].priceId} \\`);
  console.log(`    STRIPE_PRICE_PRO=${results[1].priceId}`);
  console.log('');
}

setup().catch((err) => {
  console.error('❌ Erro:', err.message);
  process.exit(1);
});
