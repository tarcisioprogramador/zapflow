# Sistema de Pagamento — ZapFlow

## Sumário

1. [Visão Geral](#1-visão-geral)
2. [Pré-requisitos](#2-pré-requisitos)
3. [Configuração do Mercado Pago](#3-configuração-do-mercado-pago)
4. [Modelo de Dados](#4-modelo-de-dados)
5. [API Endpoints](#5-api-endpoints)
6. [Cupons de Desconto](#6-cupons-de-desconto)
7. [Fluxo Completo](#7-fluxo-completo)
8. [Segurança](#8-segurança)
9. [Monitoramento e Logs](#9-monitoramento-e-logs)
10. [Deploy](#10-deploy)

---

## 1. Visão Geral

O ZapFlow utiliza **Mercado Pago** como gateway de pagamento com suporte a:

- Assinaturas recorrentes (mensal) via PreApproval
- **PIX** (pagamento instantâneo)
- Cartão de crédito (até 1 parcela)
- Boleto bancário
- Checkout Pro (redirecionamento para página segura do Mercado Pago)
- Webhooks com idempotência e validação de assinatura HMAC-SHA256
- Histórico completo de transações
- **Sistema de cupons de desconto** (% ou valor fixo)
- **Cancelamento de assinatura via dashboard**
- 3 planos: **IA Starter (R$97)**, **IA Pro (R$197)**, **Enterprise (R$497)**
- Teste gratuito de 7 dias

---

## 2. Pré-requisitos

```bash
cd backend
npm install
```

### Variáveis de ambiente (.env)

```env
MP_ACCESS_TOKEN="APP_USR-..."
MP_PUBLIC_KEY="APP_USR-..."
MP_WEBHOOK_SECRET="..."
```

---

## 3. Configuração do Mercado Pago

### Passo 1: Criar conta

Acesse [mercadopago.com.br/registration-mp](https://www.mercadopago.com.br/registration-mp)

### Passo 2: Obter chaves

1. **Seu negócio > Configurações > Credenciais**
2. Copie **Access Token** e **Public Key**

### Passo 3: Configurar Webhook

1. **Seu negócio > Configurações > Webhooks**
2. URL: `https://SEU-DOMINIO/api/webhook/mercadopago`
3. Eventos: `payment`, `subscription_preapproval`
4. (Opcional) Configure um secret para validação HMAC

### Passo 4: Verificar

```bash
curl http://localhost:3001/api/payments/status -H "Authorization: Bearer SEU_TOKEN"
```

---

## 4. Modelo de Dados

### Payment

| Campo | Tipo | Descrição |
|-------|------|-----------|
| `id` | UUID | Identificador único |
| `mpPaymentIntentId` | String? | ID do pagamento no MP |
| `mpInvoiceId` | String? | ID da fatura no MP |
| `mpSubscriptionId` | String? | ID da assinatura no MP |
| `amount` | Int | Valor pago em centavos |
| `originalAmount` | Int? | Valor original antes do desconto |
| `discountAmount` | Int? | Valor do desconto aplicado |
| `couponCode` | String? | Cupom utilizado |
| `status` | String | pending, succeeded, failed, refunded |
| `plan` | String | STARTER, PRO, ENTERPRISE |

### Organization (campos de pagamento)

| Campo | Tipo | Descrição |
|-------|------|-----------|
| `mpCustomerId` | String? | ID do cliente no Mercado Pago |
| `mpSubscriptionId` | String? | ID da assinatura no MP |
| `mpSubscriptionStatus` | String? | Status da assinatura (authorized, paused, cancelled) |
| `mpCurrentPeriodEnd` | DateTime? | Fim do período atual |

### Coupon

| Campo | Tipo | Descrição |
|-------|------|-----------|
| `code` | String | Código do cupom (unique, uppercase) |
| `discountType` | String | "percentage" ou "fixed" |
| `discountValue` | Float | Ex: 20 para 20% ou 5000 para R$50 |
| `minValue` | Int? | Valor mínimo do pedido (cents) |
| `maxUses` | Int? | Limite total de usos |
| `maxUsesPerUser` | Int? | Limite por usuário |
| `appliesToPlans` | String? | JSON array de planos |
| `startsAt` / `expiresAt` | DateTime? | Período de validade |
| `isActive` | Boolean | Ativar/desativar |

### WebhookEvent

| Campo | Tipo | Descrição |
|-------|------|-----------|
| `source` | String | "mercadopago" |
| `eventId` | String? | Chave de idempotência |
| `eventType` | String | payment, subscription_preapproval |
| `dataId` | String? | ID do recurso no MP |
| `status` | String | received, processing, processed, failed |
| `requestBody` / `responseBody` | String? | Payload JSON |
| `errorMessage` | String? | Erro se houver |

---

## 5. API Endpoints

### 5.1. Validação com Zod

Todas as rotas de pagamento e cupons validam o corpo da requisição com schemas Zod:

| Schema | Campos validados |
|--------|-----------------|
| `publicCheckoutSchema` | `plan` (enum: STARTER, PRO, ENTERPRISE), `couponCode` (opcional) |
| `authCheckoutSchema` | `plan` (enum), `couponCode` (opcional) |
| `validateCouponSchema` | `code` (string min 1), `plan` (string opcional), `amount` (int positivo opcional) |
| `createCouponSchema` | `code`, `discountType`, `discountValue`, `maxUses`, `maxUsesPerUser`, `appliesToPlans`, etc. |
| `updateCouponSchema` | Todos opcionais: `description`, `discountType`, `discountValue`, `isActive`, etc. |

Erros de validação retornam `400` com mensagem em português:
```json
{ "error": "Plano inválido. Escolha STARTER, PRO ou ENTERPRISE." }
```

### 5.2. Configuração

```http
GET /api/payments/config
Authorization: Bearer <token>
```

### 5.3. Checkout (Assinatura)

```http
POST /api/payments/create-checkout
Authorization: Bearer <token>
Content-Type: application/json

{
  "plan": "PRO",
  "couponCode": "WELCOME10"
}
```

**Resposta:**
```json
{
  "url": "https://www.mercadopago.com.br/...",
  "preapprovalId": "preapp_xxx",
  "originalAmount": 19700,
  "discountAmount": 1970,
  "finalAmount": 17730
}
```

### 5.4. Checkout Avulso (PIX/Cartão/Boleto)

```http
POST /api/payments/create-one-time-pix
Authorization: Bearer <token>
Content-Type: application/json

{
  "plan": "PRO",
  "couponCode": "WELCOME10"
}
```

### 5.5. Checkout Público (sem auth)

```http
POST /api/payments/public-checkout
Content-Type: application/json

{
  "plan": "PRO",
  "couponCode": "WELCOME10"
}
```

### 5.6. Validar Cupom

```http
POST /api/payments/validate-coupon
Authorization: Bearer <token>
Content-Type: application/json

{
  "code": "WELCOME10",
  "plan": "PRO"
}
```

**Resposta (válido):**
```json
{
  "valid": true,
  "coupon": { "id": "...", "code": "WELCOME10", "discountType": "percentage", "discountValue": 10 },
  "discountAmount": 1970,
  "finalAmount": 17730
}
```

**Resposta (inválido):**
```json
{
  "valid": false,
  "reason": "Cupom expirado"
}
```

### 5.7. Cancelar Assinatura

```http
POST /api/payments/cancel
Authorization: Bearer <token>
```

**Resposta:**
```json
{ "canceled": true }
```

### 5.8. Gerenciar Cupons (Admin)

```http
POST   /api/payments/coupons          # Criar cupom
GET    /api/payments/coupons          # Listar cupons
PUT    /api/payments/coupons/:id      # Atualizar cupom
DELETE /api/payments/coupons/:id      # Excluir cupom
```

Requires `OWNER` or `ADMIN` role.

**Exemplo de criação:**
```json
{
  "code": "BLACKFRIDAY30",
  "description": "30% off na Black Friday",
  "discountType": "percentage",
  "discountValue": 30,
  "maxUses": 100,
  "expiresAt": "2026-12-01T00:00:00Z",
  "appliesToPlans": ["STARTER", "PRO", "ENTERPRISE"]
}
```

### 5.9. Logs de Webhook (Admin)

```http
GET /api/payments/webhook-events?page=1&limit=20
Authorization: Bearer <token>
```

### 5.10. Subscription Info & History

```http
GET /api/payments/subscription       # Status da assinatura atual
GET /api/payments/history?page=1     # Histórico de pagamentos
GET /api/payments/invoices           # Faturas
POST /api/payments/portal            # Link para gerenciar no MP
GET /api/payments/session/:id        # Verificar pagamento/preapproval
```

---

## 6. Cupons de Desconto

### Tipos de desconto

- **percentage**: percentual (`discountValue = 10` = 10%)
- **fixed**: valor fixo em centavos (`discountValue = 1000` = R$10)

### Validação automática

O sistema valida:
- Se o cupom existe e está ativo
- Se não expirou
- Se não atingiu o limite de usos (`maxUses`)
- Se o plano é elegível (`appliesToPlans`)
- Se o valor mínimo do pedido foi atingido (`minValue`)

### Onde usar

- No dashboard (SettingsPage) — input de cupom nos cards de plano (`CouponInput`)
- Na landing page (LandingPage) — campo `CouponField` + `couponCode` nos `BuyButton` e `PixBuyButton`
- Via API — campo `couponCode` nos endpoints de checkout

---

## 7. Fluxo Completo

### Upgrade com cupom

```
1. Dashboard > Configurações > Plano
2. Usuário digita cupom no campo "CUPOM" do card desejado
3. Frontend valida via POST /api/payments/validate-coupon
4. Se válido, mostra o desconto
5. Clica "Fazer Upgrade"
6. POST /api/payments/create-checkout com couponCode
7. Mercado Pago cria PreApproval com valor com desconto
8. Webhook subscription_preapproval (authorized) → ativa plano
```

### Cancelamento

```
1. Dashboard > Configurações > Plano > "Cancelar Assinatura"
2. Modal de confirmação
3. POST /api/payments/cancel
4. Cancela no Mercado Pago + rebaixa para FREE no banco
```

---

## 8. Segurança

### Webhook

- **Validação de assinatura**: HMAC-SHA256 com `MP_WEBHOOK_SECRET`
- **Anti-replay**: timestamp ≤ 5 minutos
- **Idempotência**: evento já processado é ignorado (pelo `data.id` nos últimos 60s)
- **Log completo**: todo evento recebido é registrado em `WebhookEvent`

### APIs

- JWT obrigatório (exceto `public-checkout` e webhook)
- Rate limiting por IP (100 req/min global, 60 req/min no `/api/webhook/evolution`)
- Validação de corpo com **Zod** em todas as rotas de pagamento e cupons
- Validação de email no `linkPaymentToUser` (impede linking fraudulenta)
- Apenas `OWNER`/`ADMIN` podem gerenciar cupons
- **CSP**: `script-src 'self'` (sem `unsafe-inline`/`unsafe-eval`) — Helmet config

---

## 9. Monitoramento e Logs

### Estrutura de Logs

```typescript
console.log(`[Mercado Pago] Webhook signature verified ✓ (data.id=...)`);
console.log(`[Mercado Pago] Payment approved for org ... (cupom: WELCOME10)`);
console.log(`[Mercado Pago] Event ... already processed — skipping (idempotency)`);
console.log(`[Payment] Recorded: succeeded - PRO - R$ 177,30`);
console.log(`[WebhookEvents] Created log: ...`);
```

### WebhookEvent (tabela de auditoria)

Toda notificação recebida é registrada com:
- Payload completo (`requestBody`)
- Resultado do processamento (`responseBody`)
- Status e erro se houver
- Timestamps de recebimento e processamento

---

## 10. Deploy

### Banco de Dados

O schema Prisma suporta dois providers:

| Provider | Uso | DATABASE_URL |
|----------|-----|-------------|
| `sqlite` | Desenvolvimento local | `file:./dev.db` |
| `postgresql` | Produção (Railway, Render, etc.) | `postgresql://user:pass@host:5432/zapflow` |

Para alternar, edite `backend/prisma/schema.prisma`:
```prisma
datasource db {
  provider = "sqlite"    // ou "postgresql"
  url      = env("DATABASE_URL")
}
```

**Local (SQLite):**
```bash
cd backend
npx prisma db push --accept-data-loss   # sincroniza schema
```

**Produção (PostgreSQL) — gerar migração e aplicar:**
```bash
cd backend
npx prisma migrate dev --name rename_stripe_to_mp   # criar migration
npx prisma migrate deploy                            # aplicar
```

### Variáveis de Ambiente

```bash
railway variables set DATABASE_URL=postgresql://...
railway variables set JWT_SECRET=...
railway variables set MP_ACCESS_TOKEN=APP_USR-...
railway variables set MP_PUBLIC_KEY=APP_USR-...
railway variables set MP_WEBHOOK_SECRET=...
```

### Docker

```yaml
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
├── prisma/schema.prisma          # Payment, Coupon, WebhookEvent
├── src/
│   ├── routes/payments.ts        # Todos os endpoints de pagamento + cupons
│   ├── services/
│   │   ├── payment.ts            # Núcleo Mercado Pago + cupons
│   │   ├── coupon.ts             # CRUD + validação de cupons
│   │   └── webhook-events.ts     # Idempotência + auditoria
│   └── middleware/plan.ts        # Limites por plano
frontend/
├── src/
│   ├── api/index.ts              # paymentsApi com cupons
│   ├── pages/SettingsPage.tsx    # Upgrade + cupom + cancelamento
│   └── pages/PaymentSuccessPage.tsx
```

---

## Última atualização

Julho 2026 — ZapFlow v1.0 — Mercado Pago + Cupons + Zod Validation + CSP + Rate Limit + Landing com cupom
