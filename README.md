# ⚡ ZapFlow - Automação Inteligente via WhatsApp

<p align="center">
  <a href="https://github.com/tarcisioprogramador/zapflow/actions/workflows/ci.yml">
    <img src="https://github.com/tarcisioprogramador/zapflow/actions/workflows/ci.yml/badge.svg" alt="CI Status">
  </a>
  <img src="https://img.shields.io/badge/testes-95%20passando-brightgreen" alt="Tests">
  <img src="https://img.shields.io/badge/TypeScript-5.6-blue" alt="TypeScript">
  <img src="https://img.shields.io/badge/Node.js-20%2B-339933" alt="Node.js">
  <img src="https://img.shields.io/badge/license-MIT-green" alt="License">
  <img src="https://img.shields.io/badge/PRs-welcome-brightgreen" alt="PRs Welcome">
</p>

> Plataforma SaaS completa de automação de WhatsApp com IA, CRM Kanban, construtor de fluxos visuais e disparos em massa.

---

## 📋 Índice

- [Funcionalidades](#-funcionalidades)
- [Tecnologias](#-tecnologias)
- [Pré-requisitos](#-pré-requisitos)
- [Setup Rápido (Docker)](#-setup-rápido-docker)
- [Setup Manual](#-setup-manual)
  - [Backend](#1-backend)
  - [Frontend](#2-frontend)
- [Variáveis de Ambiente](#-variáveis-de-ambiente)
- [Testes](#-testes)
- [API Endpoints](#-api-endpoints)
- [Estrutura do Projeto](#-estrutura-do-projeto)
- [Login de Demonstração](#-login-de-demonstração)
- [Deploy](#-deploy)

---

## 🚀 Funcionalidades

| Funcionalidade | Descrição |
|---|---|
| **Autenticação** | Cadastro, login, planos (Free, Starter, Pro, Enterprise) |
| **Multi-usuários** | Owner, Admin e Atendente com permissões |
| **WhatsApp** | Conexão multi-número, envio/recebimento em tempo real |
| **Conversas** | Chat em tempo real com interface WhatsApp-like |
| **Construtor de Fluxos** | Interface drag & drop com gatilhos por palavra-chave |
| **Inteligência Artificial** | Respostas automáticas humanizadas (Groq, Gemini ou OpenAI) |
| **CRM Kanban** | Pipeline de vendas com cards, etapas e automação |
| **Disparos em Massa** | Campanhas com texto, imagem, vídeo e áudio |
| **Remarketing** | Sequências automáticas de follow-up |
| **Dashboard** | Métricas de mensagens, conversões e performance |
| **Base de Conhecimento** | Treine a IA com informações do seu negócio |
| **Webhooks** | Integrações externas via API |
| **Tracking de Anúncios** | Capture UTMs e atribua leads a campanhas |

---

## 🛠 Tecnologias

### Backend
| Tecnologia | Versão | Uso |
|---|---|---|
| Node.js | 20+ | Runtime |
| TypeScript | 5.6+ | Tipagem |
| Express.js | 4.21+ | Framework HTTP |
| PostgreSQL | 16 | Banco de dados principal |
| Prisma | 5.22+ | ORM |
| Redis | 7 | Filas (BullMQ) |
| Socket.io | 4.8+ | WebSocket em tempo real |
| JWT | — | Autenticação |
| Stripe | 22+ | Pagamentos |
| OpenAI / Groq / Gemini | — | IA |

### Frontend
| Tecnologia | Versão | Uso |
|---|---|---|
| React | 18.3+ | UI Framework |
| TypeScript | 5.6+ | Tipagem |
| Vite | 5.4+ | Build |
| Tailwind CSS | 3.4+ | Estilização |
| Zustand | 5+ | Estado global |
| React Router | 6.27+ | Roteamento |
| Axios | 1.7+ | HTTP Client |
| Recharts | 2.13+ | Gráficos |
| Socket.io-client | 4.8+ | Tempo real |
| Lucide React | — | Ícones |
| React Query | 5.59+ | Cache de dados |

### Testes
| Tecnologia | Uso |
|---|---|
| Vitest | Runner de testes (backend + frontend) |
| Testing Library | Testes de componentes React |
| jsdom | Simulador de DOM para testes |

---

## 📦 Pré-requisitos

- **Node.js** 20+ (ou Docker Desktop)
- **npm** 9+
- **Docker Desktop** (recomendado para PostgreSQL + Redis)
- **Git**

---

## 🐳 Setup Rápido (Docker)

A maneira mais fácil de começar é usando o Docker Compose para subir PostgreSQL e Redis:

```bash
# 1. Clone o repositório
git clone https://github.com/seu-usuario/zapflow.git
cd zapflow

# 2. Suba os serviços de banco e cache
docker compose up -d
# Isso inicia PostgreSQL na porta 5432 e Redis na porta 6379

# 3. Configure o backend
cd backend
cp .env.example .env
# Edite o .env se necessário (as defaults já funcionam com Docker)

npm install
npx prisma generate
npx prisma db push
npm run db:seed
# ⚠️ Se rodar o seed novamente, pode duplicar dados.
#    Para resetar: npx prisma db push --force-reset && npm run db:seed

# 4. Inicie o backend
npm run dev
# → http://localhost:3001

# 5. Em outro terminal, inicie o frontend
cd frontend
npm install
npm run dev
# → http://localhost:5173
```

**Comandos úteis do Docker:**

```bash
# Ver logs dos serviços
docker compose logs -f

# Parar tudo
docker compose down

# Resetar bancos (APAGA DADOS)
docker compose down -v && docker compose up -d

# Rodar tudo em Docker (backend + frontend buildado)
docker compose --profile full up -d --build
```

---

## 🔧 Setup Manual

### 1. Backend

```bash
cd backend

# Instalar dependências
npm install

# Configurar variáveis de ambiente
cp .env.example .env
# Edite o .env com suas credenciais (veja seção abaixo)

# Gerar cliente Prisma
npx prisma generate

# Criar as tabelas no banco
npx prisma db push

# Popular com dados de demonstração
npm run db:seed

# Iniciar servidor (com hot-reload)
npm run dev
```

O backend roda em `http://localhost:3001`.

**Scripts disponíveis:**

| Script | Descrição |
|---|---|
| `npm run dev` | Servidor com hot-reload (tsx watch) |
| `npm run build` | Compilar TypeScript |
| `npm start` | Rodar versão compilada |
| `npm test` | Executar testes |
| `npm run test:watch` | Testes em modo watch |
| `npm run test:coverage` | Testes com cobertura |
| `npm run db:generate` | Regenerar Prisma Client |
| `npm run db:push` | Sincronizar schema com banco |
| `npm run db:migrate` | Criar migration |
| `npm run db:seed` | Popular com dados demo |

### 2. Frontend

```bash
cd frontend

# Instalar dependências
npm install

# Iniciar servidor de desenvolvimento
npm run dev
```

O frontend roda em `http://localhost:5173`.

> O Vite faz proxy automático de `/api` para o backend em `localhost:3001` (configurado em `vite.config.ts`).

**Scripts disponíveis:**

| Script | Descrição |
|---|---|
| `npm run dev` | Servidor dev com HMR |
| `npm run build` | Build de produção |
| `npm run preview` | Pré-visualizar build |
| `npm test` | Executar testes |
| `npm run test:watch` | Testes em modo watch |
| `npm run test:coverage` | Testes com cobertura |

---

## 🌐 Variáveis de Ambiente

### Backend (`backend/.env`)

Copie `backend/.env.example` para `backend/.env` e preencha:

```env
# ─── Servidor ──────────────────────────────
PORT=3001
NODE_ENV=development
APP_NAME="ZapFlow"
FRONTEND_URL="http://localhost:5173"
BACKEND_URL="http://localhost:3001"
RATE_LIMIT_MAX=100

# ─── Banco de Dados ────────────────────────
# PostgreSQL (local ou Docker)
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/zapflow?schema=public"

# ─── Cache / Filas ─────────────────────────
REDIS_URL="redis://localhost:6379"

# ─── Autenticação JWT ──────────────────────
JWT_SECRET="change-me-to-a-random-secret"
JWT_EXPIRES_IN="7d"

# ─── WhatsApp (Evolution API) ─────────────
# Deixe vazio para modo de demonstração
WHATSAPP_API_URL="https://seu-evolution-api.com"
WHATSAPP_API_KEY="sua-chave-evolution"

# ─── Provedores de IA ─────────────────────
# Pelo menos UM é necessário para auto-resposta
GROQ_API_KEY=""
GEMINI_API_KEY=""
OPENAI_API_KEY=""

# ─── Stripe (Pagamentos) ──────────────────
STRIPE_SECRET_KEY="sk_test_..."
STRIPE_PUBLISHABLE_KEY="pk_test_..."
STRIPE_WEBHOOK_SECRET="whsec_..."
STRIPE_PRICE_STARTER="price_starter_id"
STRIPE_PRICE_PRO="price_pro_id"
```

### Frontend (`frontend/.env`)

Copie `frontend/.env.example` para `frontend/.env`:

```env
# URL base da API (usada pelo socket.io e formulários)
# Em dev, o Vite faz proxy: /api → localhost:3001
VITE_API_URL="/api"
```

---

## 🧪 Testes

O projeto possui **95 testes** (39 backend + 56 frontend).

### Backend

Testes unitários para as rotas principais com Prisma mockado:

```bash
cd backend
npm test                    # Executar uma vez
npm run test:watch          # Modo watch
npm run test:coverage       # Com cobertura
```

**Cobertura:** Auth (10), Campaigns (10), WhatsApp (19)

### Frontend

Testes de componentes com Testing Library:

```bash
cd frontend
npm test                    # Executar uma vez
npm run test:watch          # Modo watch
npm run test:coverage       # Com cobertura
```

**Cobertura:** ThemeProvider, ErrorBoundary, Sidebar, Header, LeadCaptureForm, App routing, Stores

---

## 📡 API Endpoints

### Autenticação

| Método | Rota | Descrição |
|---|---|---|
| `POST` | `/api/auth/register` | Cadastro de usuário |
| `POST` | `/api/auth/login` | Login |
| `GET` | `/api/auth/me` | Dados do usuário logado |
| `PUT` | `/api/auth/profile` | Atualizar perfil |

### WhatsApp

| Método | Rota | Descrição |
|---|---|---|
| `GET` | `/api/whatsapp` | Listar números conectados |
| `POST` | `/api/whatsapp/connect` | Conectar novo número |
| `POST` | `/api/whatsapp/:id/send` | Enviar mensagem |
| `GET` | `/api/whatsapp/:id/qrcode` | Obter QR Code |
| `POST` | `/api/whatsapp/:id/disconnect` | Desconectar número |
| `DELETE` | `/api/whatsapp/:id` | Remover número |
| `GET` | `/api/whatsapp/:id/status` | Status da conexão |

### Conversas

| Método | Rota | Descrição |
|---|---|---|
| `GET` | `/api/conversations` | Listar conversas |
| `GET` | `/api/conversations/:id` | Detalhes da conversa |
| `POST` | `/api/conversations/:id/assign` | Atribuir conversa |
| `PUT` | `/api/conversations/:id/status` | Alterar status |
| `POST` | `/api/conversations/:id/tags` | Adicionar tag |
| `DELETE` | `/api/conversations/:id/tags/:tagId` | Remover tag |

### Automações (Flows)

| Método | Rota | Descrição |
|---|---|---|
| `GET` | `/api/flows` | Listar fluxos |
| `POST` | `/api/flows` | Criar fluxo |
| `GET` | `/api/flows/:id` | Obter fluxo |
| `PUT` | `/api/flows/:id` | Atualizar fluxo |
| `PUT` | `/api/flows/:id/toggle` | Ativar/desativar |
| `DELETE` | `/api/flows/:id` | Excluir fluxo |
| `POST` | `/api/flows/:id/duplicate` | Duplicar fluxo |

### CRM

| Método | Rota | Descrição |
|---|---|---|
| `GET` | `/api/crm/boards` | Listar boards |
| `POST` | `/api/crm/boards` | Criar board |
| `PUT` | `/api/crm/boards/:id` | Atualizar board |
| `DELETE` | `/api/crm/boards/:id` | Excluir board |
| `GET` | `/api/crm/cards` | Listar cards |
| `POST` | `/api/crm/cards` | Criar card |
| `PUT` | `/api/crm/cards/:id` | Atualizar card |
| `PUT` | `/api/crm/cards/:id/move` | Mover card |
| `DELETE` | `/api/crm/cards/:id` | Excluir card |
| `POST` | `/api/crm/stages` | Criar etapa |
| `PUT` | `/api/crm/stages/:id` | Atualizar etapa |
| `DELETE` | `/api/crm/stages/:id` | Excluir etapa |
| `GET` | `/api/crm/contacts` | Listar contatos |
| `POST` | `/api/crm/contacts` | Criar contato |
| `PUT` | `/api/crm/contacts/:id` | Atualizar contato |
| `DELETE` | `/api/crm/contacts/:id` | Excluir contato |

### Campanhas

| Método | Rota | Descrição |
|---|---|---|
| `GET` | `/api/campaigns` | Listar campanhas |
| `GET` | `/api/campaigns/:id` | Obter campanha |
| `POST` | `/api/campaigns` | Criar campanha |
| `PUT` | `/api/campaigns/:id` | Atualizar campanha |
| `PUT` | `/api/campaigns/:id/status` | Alterar status |
| `DELETE` | `/api/campaigns/:id` | Excluir campanha |

### Dashboard

| Método | Rota | Descrição |
|---|---|---|
| `GET` | `/api/dashboard/metrics` | Métricas do dashboard |
| `GET` | `/api/dashboard/activity` | Atividade recente |

### Webhooks

| Método | Rota | Descrição |
|---|---|---|
| `GET` | `/api/webhooks` | Listar webhooks |
| `POST` | `/api/webhooks` | Criar webhook |
| `PUT` | `/api/webhooks/:id` | Atualizar webhook |
| `DELETE` | `/api/webhooks/:id` | Excluir webhook |
| `POST` | `/api/webhooks/:id/test` | Testar webhook |

### Knowledge Base

| Método | Rota | Descrição |
|---|---|---|
| `GET` | `/api/knowledge-base` | Listar itens |
| `GET` | `/api/knowledge-base/stats` | Estatísticas (total, categorias, caracteres) |
| `GET` | `/api/knowledge-base/categories` | Listar categorias |
| `POST` | `/api/knowledge-base` | Criar item |
| `PUT` | `/api/knowledge-base/:id` | Atualizar item |
| `DELETE` | `/api/knowledge-base/:id` | Excluir item |
| `POST` | `/api/knowledge-base/ai-context` | Gerar contexto para IA |

### Outros

| Método | Rota | Descrição |
|---|---|---|
| `GET` | `/api/health` | Health check |
| `GET` | `/api/remarketing` | Sequências de remarketing |
| `POST` | `/api/payments/create-checkout` | Criar checkout Stripe |
| `POST` | `/api/payments/portal` | Portal de assinatura |
| `GET` | `/api/payments/session/:id` | Status da sessão |

---

## 📁 Estrutura do Projeto

```
zapflow/
├── docker-compose.yml           # PostgreSQL + Redis + serviços
├── .github/
│   └── workflows/deploy.yml     # CI/CD
│
├── backend/                     # API Node.js + Express
│   ├── Dockerfile               # Build para deploy
│   ├── prisma/
│   │   ├── schema.prisma        # Schema do banco de dados
│   │   └── seed.ts              # Dados de demonstração
│   ├── src/
│   │   ├── index.ts             # Entry point do servidor
│   │   ├── config/
│   │   │   ├── database.ts      # Conexão Prisma
│   │   │   ├── redis.ts         # Conexão Redis + Queues
│   │   │   └── websocket.ts     # Socket.io setup
│   │   ├── middleware/
│   │   │   ├── auth.ts          # JWT authentication
│   │   │   └── plan.ts          # Limites por plano
│   │   ├── routes/              # Rotas da API
│   │   ├── services/            # Lógica de negócio
│   │   ├── types/               # Tipos TypeScript
│   │   └── __tests__/           # Testes unitários
│   ├── .env.example             # Variáveis de ambiente
│   ├── vitest.config.ts         # Configuração de testes
│   └── package.json
│
├── frontend/                    # App React + Vite
│   ├── Dockerfile               # Build nginx para produção
│   ├── nginx.conf               # Configuração nginx
│   ├── src/
│   │   ├── main.tsx             # Entry point React
│   │   ├── App.tsx              # Rotas e layout
│   │   ├── api/                 # Cliente Axios
│   │   ├── components/          # Componentes React
│   │   ├── pages/               # Páginas da aplicação
│   │   ├── store/               # Zustand (auth + app)
│   │   ├── hooks/               # Custom hooks
│   │   ├── types/               # Tipos TypeScript
│   │   └── __tests__/           # Testes dos componentes
│   ├── .env.example             # Variáveis de ambiente
│   ├── vitest.config.ts         # Configuração de testes
│   └── package.json
│
└── README.md
```

---

## 👤 Login de Demonstração

Após rodar `npm run db:seed`, use:

```
Email: admin@zapflow.com
Senha: 123456
```

---

## 🚢 Deploy

### Railway

O projeto está configurado para deploy no [Railway](https://railway.app):

```bash
# Instalar CLI
npm install -g @railway/cli

# Login
railway login

# Deploy
railway up
```

### Vercel (Frontend)

```bash
cd frontend
npm run build
vercel --prod
```

### Docker (Produção)

```bash
docker compose --profile full up -d --build
```

> ⚠️ Para produção, configure um domínio real e use HTTPS via reverse proxy (nginx, Caddy, Cloudflare Tunnel).

---

## 🤝 Contribuindo

1. Fork o projeto
2. Crie sua branch (`git checkout -b feature/nova-funcionalidade`)
3. Commit suas mudanças (`git commit -m 'feat: adiciona nova funcionalidade'`)
4. Push para a branch (`git push origin feature/nova-funcionalidade`)
5. Abra um Pull Request

---

## 📝 Licença

MIT © 2026 ZapFlow

---

<p align="center">
  Feito com ❤️ por <a href="https://zapflow.com">ZapFlow</a>
</p>
