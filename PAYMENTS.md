# 💳 Sistema de Pagamento — ZapFlow

## Sumário

1. [Visão Geral](#1-visão-geral)
2. [Pré-requisitos](#2-pré-requisitos)
3. [Configuração do Stripe](#3-configuração-do-stripe)
4. [Modelo de Dados](#4-modelo-de-dados)
5. [API Endpoints](#5-api-endpoints)
6. [Fluxo Completo](#6-fluxo-completo)
7. [Segurança](#7-segurança)
8. [Monitoramento](#8-monitoramento)
9. [Deploy](#9-deploy)

---

## 1. Visão Geral

O ZapFlow utiliza **Stripe** como gateway de pagamento com suporte a:

- ✅ Assinaturas recorrentes (mensal)
- ✅ Cartão de crédito e Boleto bancário
- ✅ Checkout incorporado (Stripe Checkout)
- ✅ Portal do cliente (gerenciar cartão, plano, cancelar)
- ✅ Webhooks com verificação de assinatura
- ✅ Histórico completo de transações
- ✅ 3 planos: **IA Starter (R$97)**, **IA Pro (R$197)**, **Enterprise (R$497)**
- ✅ Suporte a teste gratuito de 7 dias

---

## 2. Pré-requisitos

```bash
# Stripe SDK já está no package.json:
cd backend
npm install stripe
```

### Variáveis de ambiente necessárias (.env)

```env
# ─── Stripe API Keys ──────────────────────────────
STRIPE_SECRET_KEY=sk_test_xxxxxxxxxxxxxxxxxxxxx
STRIPE_PUBLISHABLE_KEY=pk_test_xxxxxxxxxxxxxxxxxxxxx
STRIPE_WEBHOOK_SECRET=whsec_xxxxxxxxxxxxxxxxxxxxx

# ─── Stripe Price IDs (criar via setup automático) ─
STRIPE_PRICE_STARTER=price_xxxxxxxxxxxxx
STRIPE_PRICE_PRO=price_xxxxxxxxxxxxx
STRIPE_PRICE_ENTERPRISE=price_xxxxxxxxxxxxx
```

---

## 3. Configuração do Stripe

### Passo 1: Criar conta no Stripe

1. Acesse [dashboard.stripe.com/register](https://dashboard.stripe.com/register)
2. Complete o cadastro

### Passo 2: Obter chaves de API

1. Vá em **Developers > API keys**
2. Copie a **Secret Key** (`sk_test_...`) e **Publishable Key** (`pk_test_...`)
3. Adicione no `.env`:
   ```env
   STRIPE_SECRET_KEY=sk_test_...
   STRIPE_PUBLISHABLE_KEY=pk_test_...
   ```

### Passo 3: Criar produtos e preços

**Opção A — Automática (recomendado):**

Com `STRIPE_SECRET_KEY` configurada, faça uma requisição:

```bash
curl -X POST http://localhost:3001/api/payments/setup-products \
  -H "Authorization: Bearer SEU_TOKEN" \
  -H "Content-Type: application/json"
```

**Resposta:**
```json
{
  "success": true,
  "products": [
    { "plan": "IA Starter", "planId": "STARTER", "priceId": "price_abc123" },
    { "plan": "IA Pro", "planId": "PRO", "priceId": "price_def456" },
    { "plan": "Enterprise", "planId": "ENTERPRISE", "priceId": "price_ghi789" }
  ],
  "envVars": [
    "STRIPE_PRICE_STARTER=price_abc123",
    "STRIPE_PRICE_PRO=price_def456",
    "STRIPE_PRICE_ENTERPRISE=price_ghi789"
  ]
}
```

Copie os `envVars` para seu `.env`.

**Opção B — Manual:**

```bash
cd backend
node scripts/setup-stripe.js
```

### Passo 4: Configurar Webhook

1. No Stripe Dashboard: **Developers > Webhooks > Add endpoint**
2. **URL:** `https://SEU-DOMINIO/api/webhook/stripe`
3. **Eventos para escutar:**
   - `checkout.session.completed`
   - `invoice.payment_succeeded`
   - `invoice.payment_failed`
   - `customer.subscription.deleted`
   - `customer.subscription.updated`
4. Copie o **Signing Secret** e adicione como `STRIPE_WEBHOOK_SECRET`

---

## 4. Modelo de Dados

### Tabela: Payment

| Campo | Tipo | Descrição |
|-------|------|-----------|
| `id` | UUID | Identificador único |
| `stripePaymentIntentId` | String? | ID do Payment Intent no Stripe |
| `stripeInvoiceId` | String? | ID da Invoice no Stripe |
| `stripeSubscriptionId` | String? | ID da Subscription no Stripe |
| `amount` | Int | Valor em centavos (R$97,00 = 9700) |
| `currency` | String | Moeda (padrão: "brl") |
| `status` | String | pending, succeeded, failed, refunded |
| `plan` | String | STARTER, PRO, ENTERPRISE |
| `description` | String? | Descrição do pagamento |
| `periodStart` | DateTime? | Início do período de cobrança |
| `periodEnd` | DateTime? | Fim do período de cobrança |
| `createdAt` | DateTime | Data do pagamento |
| `organizationId` | UUID | FK para Organization |

### Tabela: Organization (campos de pagamento)

| Campo | Tipo | Descrição |
|-------|------|-----------|
| `stripeCustomerId` | String? | ID do cliente no Stripe |
| `stripeSubscriptionId` | String? | ID da assinatura no Stripe |
| `stripeSubscriptionStatus` | String? | Status: active, past_due, canceled |
| `stripeCurrentPeriodEnd` | DateTime? | Fim do período atual |

---

## 5. API Endpoints

### 5.1. Checkout

```http
POST /api/payments/create-checkout
Authorization: Bearer <token>
Content-Type: application/json

{
  "plan": "PRO"
}
```

**Resposta:**
```json
{
  "url": "https://checkout.stripe.com/c/pay/cs_xxx",
  "sessionId": "cs_xxx"
}
```

> O usuário é redirecionado para esta URL. Após pagamento, redirecionado de volta para `/payment/success?session_id=cs_xxx`.

### 5.2. Verificar Sessão

```http
GET /api/payments/session/:sessionId
Authorization: Bearer <token>
```

**Resposta:**
```json
{
  "status": "complete",
  "customerEmail": "cliente@email.com",
  "plan": "PRO",
  "subscriptionId": "sub_xxx"
}
```

### 5.3. Status da Assinatura

```http
GET /api/payments/subscription
Authorization: Bearer <token>
```

**Resposta:**
```json
{
  "plan": "PRO",
  "planName": "IA Pro",
  "amount": 19700,
  "hasSubscription": true,
  "subscriptionId": "sub_xxx",
  "subscriptionStatus": "active",
  "currentPeriodEnd": "2025-08-15T00:00:00.000Z",
  "daysRemaining": 28
}
```

### 5.4. Histórico de Pagamentos

```http
GET /api/payments/history?page=1&limit=10
Authorization: Bearer <token>
```

**Resposta:**
```json
{
  "payments": [
    {
      "id": "uuid",
      "amount": 19700,
      "currency": "brl",
      "status": "succeeded",
      "plan": "PRO",
      "description": "Fatura IA Pro - 1234",
      "periodStart": "2025-07-01T00:00:00.000Z",
      "periodEnd": "2025-08-01T00:00:00.000Z",
      "createdAt": "2025-07-01T10:30:00.000Z"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 10,
    "total": 5,
    "totalPages": 1
  }
}
```

### 5.5. Faturas

```http
GET /api/payments/invoices
Authorization: Bearer <token>
```

**Resposta:**
```json
[
  {
    "id": "uuid",
    "invoiceNumber": "Fatura IA Pro - 1234",
    "amount": 19700,
    "currency": "brl",
    "status": "paid",
    "plan": "PRO",
    "periodStart": "2025-07-01T00:00:00.000Z",
    "periodEnd": "2025-08-01T00:00:00.000Z",
    "paidAt": "2025-07-01T10:30:00.000Z",
    "downloadUrl": null
  }
]
```

### 5.6. Portal do Cliente

```http
POST /api/payments/portal
Authorization: Bearer <token>
```

**Resposta:**
```json
{
  "url": "https://billing.stripe.com/p/session/xxx"
}
```

> Redireciona o usuário para o Stripe Billing Portal onde pode:
> - Atualizar cartão de crédito
> - Alterar plano
> - Cancelar assinatura
> - Visualizar faturas

### 5.7. Criar Produtos (Setup)

```http
POST /api/payments/setup-products
Authorization: Bearer <token>
```

### 5.8. Configuração do Stripe

```http
GET /api/payments/config
Authorization: Bearer <token>
```

```http
GET /api/payments/status
Authorization: Bearer <token>
```

### 5.9. Webhook (público)

```http
POST /api/webhook/stripe
Content-Type: application/json
Stripe-Signature: <assinatura>
```

> Este endpoint é chamado pelo Stripe automaticamente. Não requer autenticação, mas valida a assinatura.

---

## 6. Fluxo Completo

### Fluxo: Usuário → Pagamento → Upgrade

```
1. LandingPage → Cliente clica "Escolher Starter/Pro"
2. Página de Cadastro → Cria conta (ganha 7 dias de trial grátis)
3. Dashboard → Navega para Configurações > Plano
4. Clica "Fazer Upgrade" em um dos planos
5. Redirecionado para Stripe Checkout (página segura do Stripe)
6. Cliente paga com cartão ou boleto
7. Stripe redireciona para /payment/success?session_id=cs_xxx
8. Frontend verifica a sessão: GET /api/payments/session/:id
9. Webhook Stripe → POST /api/webhook/stripe
   - checkout.session.completed: Atualiza plano do usuário + grava pagamento
10. Dashboard agora mostra o plano ativo com data de renovação
11. Pagamentos futuros:
    - Stripe cobra automaticamente a cada mês
    - invoice.payment_succeeded: Grava pagamento no histórico
    - invoice.payment_failed: Marca como past_due
```

### Fluxo de Upgrade de Plano (ex: de Starter para Pro)

```
1. Usuário acessa Configurações > Plano
2. Clica "Fazer Upgrade" no plano Pro
3. Stripe Checkout é criado
4. No webhook, Stripe gerencia o upgrade automaticamente
5. subscription.updated: Plano atualizado no banco
```

### Fluxo de Cancelamento

```
1. Usuário clica "Gerenciar Assinatura" → Stripe Portal
2. Cancela a assinatura no Stripe
3. Webhook: customer.subscription.deleted
4. Plano do usuário é rebaixado para FREE
```

---

## 7. Segurança

### Webhook Signature Verification

```typescript
// backend/src/services/payment.ts
const sig = req.headers['stripe-signature'] as string;
const event = stripe.webhooks.constructEvent(rawBody, sig, STRIPE_WEBHOOK_SECRET);
```

### Autenticação em endpoints protegidos

```typescript
// backend/src/routes/payments.ts
router.use(authenticate); // JWT middleware
```

### SSRF Protection (Webhooks genéricos)

```typescript
// backend/src/routes/webhooks.ts
await validateWebhookUrl(url); // Bloqueia URLs internas
```

---

## 8. Monitoramento

### Logs Estruturados

```typescript
// Todos os eventos do Stripe são logados:
console.log(`[Stripe] Processing event: ${event.type}`);
console.log(`[Stripe] Subscription created for user ${userId}, plan ${planName}`);
console.log(`[Payment] Recorded: succeeded - PRO - R$ 197,00`);
```

### Trial Expiration (CRON)

```typescript
// A cada 15 minutos, verifica trials expirados
setInterval(async () => {
  const count = await checkAndDisconnectExpiredTrials();
}, 15 * 60 * 1000);
```

---

## 9. Deploy

### Railway

```bash
# Configurar variáveis
railway variables set STRIPE_SECRET_KEY=sk_live_...
railway variables set STRIPE_PUBLISHABLE_KEY=pk_live_...
railway variables set STRIPE_WEBHOOK_SECRET=whsec_...
railway variables set STRIPE_PRICE_STARTER=price_...
railway variables set STRIPE_PRICE_PRO=price_...
railway variables set STRIPE_PRICE_ENTERPRISE=price_...

# Fazer deploy
railway up
```

### Docker

```yaml
# docker-compose.yml (já configurado)
services:
  backend:
    environment:
      - STRIPE_SECRET_KEY=${STRIPE_SECRET_KEY}
      - STRIPE_PUBLISHABLE_KEY=${STRIPE_PUBLISHABLE_KEY}
      - STRIPE_WEBHOOK_SECRET=${STRIPE_WEBHOOK_SECRET}
```

---

## Estrutura de Pastas

```
backend/
├── prisma/
│   └── schema.prisma              # Modelo Payment + Organization fields
├── scripts/
│   └── setup-stripe.js            # Script manual de setup
├── src/
│   ├── config/
│   │   └── database.ts            # PrismaClient singleton
│   ├── middleware/
│   │   ├── auth.ts                # Autenticação JWT
│   │   └── plan.ts                # Verificação de limites do plano
│   ├── routes/
│   │   └── payments.ts            # Endpoints de pagamento + webhook
│   ├── services/
│   │   ├── payment.ts             # Lógica Stripe + recordPayment()
│   │   └── trial.ts               # Gerenciamento de trial grátis
│   └── types/
│       └── index.ts               # Tipos PlanName, PLAN_LIMITS
frontend/
├── src/
│   ├── api/
│   │   └── index.ts               # paymentsApi (getHistory, getInvoices)
│   ├── components/
│   │   └── PlanComparison.tsx      # Tabela de comparação de planos
│   ├── pages/
│   │   ├── SettingsPage.tsx        # Upgrade + assinatura + histórico
│   │   ├── PaymentSuccessPage.tsx  # Pós-pagamento confirmado
│   │   ├── PaymentCancelPage.tsx   # Pagamento cancelado
│   │   └── LandingPage.tsx         # Pricing com CTAs para planos
│   └── types/
│       └── index.ts               # PaymentRecord, SubscriptionInfo
```

---

## Última atualização

Julho 2026 — ZapFlow v1.0
