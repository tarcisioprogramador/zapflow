# 💳 Sistema de Pagamento — ZapFlow

## Sumário

1. [Visão Geral](#1-visão-geral)
2. [Pré-requisitos](#2-pré-requisitos)
3. [Configuração do Mercado Pago](#3-configuração-do-mercado-pago)
4. [Modelo de Dados](#4-modelo-de-dados)
5. [API Endpoints](#5-api-endpoints)
6. [Fluxo Completo](#6-fluxo-completo)
7. [Segurança](#7-segurança)
8. [Monitoramento](#8-monitoramento)
9. [Deploy](#9-deploy)

---

## 1. Visão Geral

O ZapFlow utiliza **Mercado Pago** como gateway de pagamento com suporte a:

- ✅ Assinaturas recorrentes (mensal) via PreApproval
- ✅ **PIX** (pagamento instantâneo — já nativo!)
- ✅ Cartão de crédito (até 1 parcela)
- ✅ Boleto bancário
- ✅ Checkout Pro (redirecionamento para página segura do Mercado Pago)
- ✅ Webhooks com status de pagamento e assinatura
- ✅ Histórico completo de transações
- ✅ 3 planos: **IA Starter (R$97)**, **IA Pro (R$197)**, **Enterprise (R$497)**
- ✅ Suporte a teste gratuito de 7 dias

---

## 2. Pré-requisitos

```bash
# Mercado Pago SDK já está no package.json:
cd backend
npm install mercadopago
```

### Variáveis de ambiente necessárias (.env)

```env
# ─── Mercado Pago (Payment Processing) ───────────────────────
# 1. Crie sua conta em https://www.mercadopago.com.br/registration-mp
# 2. Vá em: Seu negócio > Configurações > Credenciais
# 3. Copie as chaves abaixo (modo produção)
MP_ACCESS_TOKEN="APP_USR-..."
MP_PUBLIC_KEY="APP_USR-..."

# 4. Vá em: Seu negócio > Configurações > Webhooks
#    URL: https://SEU-DOMINIO/api/webhook/mercadopago
#    Eventos: payment, subscription_preapproval
# 5. (Opcional) Copie um secret para validar notificações
MP_WEBHOOK_SECRET="..."
```

---

## 3. Configuração do Mercado Pago

### Passo 1: Criar conta no Mercado Pago

1. Acesse [mercadopago.com.br/registration-mp](https://www.mercadopago.com.br/registration-mp)
2. Pode criar como **Pessoa Física (CPF)** — não precisa de CNPJ!
3. Complete o cadastro

### Passo 2: Obter chaves de API

1. Acesse **Seu negócio > Configurações > Credenciais**
2. Copie o **Access Token** (`APP_USR-...`) e a **Public Key** (`APP_USR-...`)
3. Adicione no `.env`:
   ```env
   MP_ACCESS_TOKEN=APP_USR-...
   MP_PUBLIC_KEY=APP_USR-...
   ```

### Passo 3: Verificar configuração

```bash
curl http://localhost:3001/api/payments/status \
  -H "Authorization: Bearer SEU_TOKEN"
```

**Resposta esperada:**
```json
{
  "configured": true,
  "canCheckout": true,
  "keys": { "accessToken": true, "publicKey": true, "webhookSecret": false },
  "missingKeys": ["MP_WEBHOOK_SECRET"],
  "nextStep": "Configurar webhook no Mercado Pago Developer Dashboard"
}
```

### Passo 4: Configurar Webhook

1. No Mercado Pago: **Seu negócio > Configurações > Webhooks**
2. Clique em **"Adicionar Webhook"**
3. **URL:** `https://SEU-DOMINIO/api/webhook/mercadopago`
4. **Eventos para escutar:**
   - `payment` — notificações de pagamento (PIX, cartão, boleto)
   - `subscription_preapproval` — notificações de assinatura (renovação, cancelamento)

> **Diferente do Stripe:** o Mercado Pago não exige um signing secret obrigatório para webhooks. O campo `MP_WEBHOOK_SECRET` é opcional.

### Passo 5: Testar com cartão de testes

Use os cartões de teste do Mercado Pago:
- **Mastercard:** `5031 4332 1540 6351` — CVV: `123` — Vencimento: `11/25`
- **Visa:** `4235 6477 2802 5682` — CVV: `123` — Vencimento: `11/25`
- **PIX:** Gere o QR Code e pague (simulado no Sandbox)

---

## 4. Modelo de Dados

### Tabela: Payment

| Campo | Tipo | Descrição |
|-------|------|-----------|
| `id` | UUID | Identificador único |
| `stripePaymentIntentId` | String? | ID do pagamento no Mercado Pago (reusa campo legado) |
| `stripeInvoiceId` | String? | Reservado para fatura |
| `stripeSubscriptionId` | String? | ID da PreApproval (assinatura) no Mercado Pago |
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
| `stripeCustomerId` | String? | Email do pagador (reusa campo legado) |
| `stripeSubscriptionId` | String? | ID da PreApproval (assinatura) no Mercado Pago |
| `stripeSubscriptionStatus` | String? | Status: active, authorized, cancelled, paused |
| `stripeCurrentPeriodEnd` | DateTime? | Fim do período atual |

> **Nota:** Os campos continuam com prefixo `stripe` no banco para evitar migração de schema. O serviço reusa esses campos para armazenar dados do Mercado Pago.

---

## 5. API Endpoints

### 5.1. Configuração

```http
GET /api/payments/config
Authorization: Bearer <token>
```

**Resposta:**
```json
{
  "publicKey": "APP_USR-...",
  "plans": [
    { "id": "STARTER", "name": "IA Starter", "amount": 9700 },
    { "id": "PRO", "name": "IA Pro", "amount": 19700 },
    { "id": "ENTERPRISE", "name": "Enterprise", "amount": 49700 }
  ]
}
```

```http
GET /api/payments/status
Authorization: Bearer <token>
```

**Resposta:**
```json
{
  "configured": true,
  "canCheckout": true,
  "keys": { "accessToken": true, "publicKey": true, "webhookSecret": false },
  "missingKeys": [],
  "nextStep": "Pronto para vender!"
}
```

### 5.2. Checkout (Assinatura)

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
  "url": "https://www.mercadopago.com.br/subscriptions/preapproval/...",
  "preferenceId": "preapp_xxx"
}
```

> O usuário é redirecionado para esta URL. Após aprovar a assinatura, é redirecionado de volta para `/payment/success?preapproval_id=preapp_xxx`.

### 5.3. Verificar Pagamento / Assinatura

```http
GET /api/payments/session/:paymentIdOrPreapprovalId
Authorization: Bearer <token>
```

**Resposta (pagamento):**
```json
{
  "status": "complete",
  "customerEmail": "cliente@email.com",
  "plan": "PRO"
}
```

**Resposta (assinatura/preapproval):**
```json
{
  "status": "active",
  "plan": null,
  "subscriptionId": "preapp_xxx"
}
```

### 5.4. Status da Assinatura

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
  "subscriptionId": "preapp_xxx",
  "subscriptionStatus": "active",
  "currentPeriodEnd": "2025-08-15T00:00:00.000Z",
  "daysRemaining": 28
}
```

### 5.5. Histórico de Pagamentos

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
      "description": "Pagamento PRO",
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

### 5.6. Faturas

```http
GET /api/payments/invoices
Authorization: Bearer <token>
```

**Resposta:**
```json
[
  {
    "id": "uuid",
    "invoiceNumber": "Fatura #abc12345",
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

### 5.7. Gerenciar Assinatura (Portal)

```http
POST /api/payments/portal
Authorization: Bearer <token>
```

**Resposta:**
```json
{
  "url": "https://www.mercadopago.com.br/subscriptions"
}
```

> Redireciona o usuário para o Mercado Pago onde pode gerenciar a assinatura.

### 5.8. Webhook (público)

```http
POST /api/webhook/mercadopago
Content-Type: application/json
```

> Este endpoint é chamado pelo Mercado Pago automaticamente. Não requer autenticação.

**Tipos de notificação processados:**
- `payment` — pagamento aprovado, rejeitado ou cancelado
- `subscription_preapproval` — assinatura autorizada, cancelada ou pausada

---

## 6. Fluxo Completo

### Fluxo: Usuário → Assinatura → Upgrade

```
1. LandingPage → Cliente clica "Escolher Starter/Pro"
2. Página de Cadastro → Cria conta (ganha 7 dias de trial grátis)
3. Dashboard → Navega para Configurações > Plano
4. Clica "Fazer Upgrade" em um dos planos
5. Redirecionado para Mercado Pago (página segura de assinatura)
6. Cliente aprova assinatura (PIX, cartão ou boleto)
7. Mercado Pago redireciona para /payment/success?preapproval_id=preapp_xxx
8. Frontend verifica: GET /api/payments/session/:preapprovalId
9. Webhook Mercado Pago → POST /api/webhook/mercadopago
   - subscription_preapproval: Atualiza plano do usuário
10. Dashboard agora mostra o plano ativo com data de renovação
11. Pagamentos futuros:
    - Mercado Pago cobra automaticamente a cada mês
    - payment (approved): Grava pagamento no histórico
    - subscription_preapproval (cancelled): Rebaixa para FREE
```

### Fluxo de Upgrade de Plano

```
1. Usuário acessa Configurações > Plano
2. Clica "Fazer Upgrade" no plano desejado
3. Mercado Pago cria nova assinatura e redireciona
4. Webhook processa subscription_preapproval (authorized)
5. Plano atualizado no banco
```

### Fluxo de Cancelamento

```
1. Usuário clica "Gerenciar Assinatura" → Mercado Pago
2. Cancela a assinatura no Mercado Pago
3. Webhook: subscription_preapproval (cancelled)
4. Plano do usuário é rebaixado para FREE
```

---

## 7. Segurança

### Webhook Processing

```typescript
// backend/src/services/payment.ts
// O Mercado Pago envia notificações via POST sem assinatura obrigatória
// O webhook é público e processa eventos de pagamento e assinatura
await handleWebhookNotification(req.body);
```

### Autenticação em endpoints protegidos

```typescript
// backend/src/routes/payments.ts
router.use(authenticate); // JWT middleware
```

---

## 8. Monitoramento

### Logs Estruturados

```typescript
console.log(`[Mercado Pago] Processing notification: ${type}/${action}`);
console.log(`[Mercado Pago] Payment approved for org ${organizationId}`);
console.log(`[Payment] Recorded: ${status} - ${plan} - R$ ${(amount/100).toFixed(2)}`);
```

---

## 9. Deploy

### Railway

```bash
# Configurar variáveis
railway variables set MP_ACCESS_TOKEN=APP_USR-...
railway variables set MP_PUBLIC_KEY=APP_USR-...
railway variables set MP_WEBHOOK_SECRET=...
```

### Docker

```yaml
# docker-compose.yml (já configurado)
services:
  backend:
    environment:
      - MP_ACCESS_TOKEN=${MP_ACCESS_TOKEN}
      - MP_PUBLIC_KEY=${MP_PUBLIC_KEY}
      - MP_WEBHOOK_SECRET=${MP_WEBHOOK_SECRET}
```

---

## Estrutura de Pastas

```
backend/
├── prisma/
│   └── schema.prisma              # Modelo Payment + Organization fields
├── src/
│   ├── config/
│   │   └── database.ts            # PrismaClient singleton
│   ├── middleware/
│   │   ├── auth.ts                # Autenticação JWT
│   │   └── plan.ts                # Verificação de limites do plano
│   ├── routes/
│   │   └── payments.ts            # Endpoints de pagamento + webhook
│   ├── services/
│   │   ├── payment.ts             # Lógica Mercado Pago + recordPayment()
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
│   │   ├── SettingsPage.tsx        # Upgrade + assinatura + histórico + setup MP
│   │   ├── PaymentSuccessPage.tsx  # Pós-pagamento confirmado (PIX/cartão/boleto)
│   │   ├── PaymentCancelPage.tsx   # Pagamento cancelado
│   │   └── LandingPage.tsx         # Pricing com CTAs para planos
│   └── types/
│       └── index.ts               # PaymentRecord, SubscriptionInfo
```

---

## Última atualização

Julho 2026 — ZapFlow v1.0 — Migrado de Stripe para Mercado Pago
