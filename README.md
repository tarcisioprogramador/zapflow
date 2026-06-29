# ZapFlow - Automação Inteligente via WhatsApp

Plataforma SaaS completa de automação de WhatsApp com IA, CRM Kanban, construtor de fluxos visuais e disparos em massa.

## 🚀 Funcionalidades

- **Autenticação** - Cadastro, login, sistema de planos (Free, Starter, Pro, Enterprise)
- **Multi-usuários** - Owner, Admin e Atendente com controle de permissões
- **WhatsApp** - Conexão de múltiplos números, envio/recebimento em tempo real
- **Conversas** - Chat em tempo real com interface WhatsApp-like
- **Construtor de Fluxos** - Interface visual drag & drop com gatilhos por palavra-chave
- **Inteligência Artificial** - Respostas automáticas humanizadas via OpenAI
- **CRM Kanban** - Pipeline de vendas com cards, etapas e movimentação automática
- **Disparos em Massa** - Campanhas com personalização de mensagens
- **Remarketing** - Sequências automáticas de follow-up
- **Dashboard** - Métricas de mensagens, conversões e performance
- **Webhooks** - Integrações via API (GET, POST, PUT)
- **Interface Moderna** - Design dark mode com Tailwind CSS, responsivo

## 📁 Estrutura do Projeto

```
zapflow/
├── backend/                  # Node.js + Express + Prisma
│   ├── prisma/              # Schema do banco + seed
│   ├── src/
│   │   ├── config/          # Database, Redis, WebSocket
│   │   ├── middleware/       # Auth JWT, Plan limits
│   │   ├── routes/          # Todas as rotas da API
│   │   ├── services/        # AI, Queue workers
│   │   └── types/           # Tipos compartilhados
│   └── package.json
├── frontend/                 # React + TypeScript + Tailwind
│   ├── src/
│   │   ├── api/             # Cliente API com Axios
│   │   ├── components/      # Layout, UI components
│   │   ├── pages/           # Todas as páginas
│   │   ├── store/           # Zustand state management
│   │   └── types/           # Tipos TypeScript
│   └── package.json
└── README.md
```

## 🛠 Tecnologias

### Backend
- **Runtime:** Node.js + TypeScript
- **Framework:** Express.js
- **Banco:** PostgreSQL + Prisma ORM
- **Filas:** Redis + BullMQ
- **Real-time:** Socket.io
- **Auth:** JWT (JSON Web Token)
- **IA:** OpenAI API

### Frontend
- **Framework:** React 18 + TypeScript
- **Build:** Vite
- **Estilo:** Tailwind CSS
- **State:** Zustand
- **HTTP:** Axios
- **Gráficos:** Recharts
- **Router:** React Router v6

## 🏃 Como Rodar

### Pré-requisitos
- Node.js 18+
- PostgreSQL
- Redis

### 1. Backend

```bash
cd backend

# Instalar dependências
npm install

# Configurar variáveis de ambiente
cp .env.example .env
# Edite o .env com suas credenciais

# Criar banco de dados
npx prisma db push

# Poplar com dados de demonstração
npm run db:seed

# Iniciar servidor
npm run dev
```

O backend rodará em `http://localhost:3001`

### 2. Frontend

```bash
cd frontend

# Instalar dependências
npm install

# Iniciar servidor de desenvolvimento
npm run dev
```

O frontend rodará em `http://localhost:5173`

### 3. Login de Demonstração

```
Email: admin@zapflow.com
Senha: 123456
```

## 📡 API Endpoints

### Auth
- `POST /api/auth/register` - Cadastro
- `POST /api/auth/login` - Login
- `GET /api/auth/me` - Dados do usuário
- `PUT /api/auth/profile` - Atualizar perfil

### WhatsApp
- `GET /api/whatsapp` - Listar números
- `POST /api/whatsapp/connect` - Conectar número
- `POST /api/whatsapp/:id/send` - Enviar mensagem
- `DELETE /api/whatsapp/:id` - Desconectar

### Conversas
- `GET /api/conversations` - Listar conversas
- `GET /api/conversations/:id` - Detalhe da conversa

### Automações
- `GET /api/flows` - Listar fluxos
- `POST /api/flows` - Criar fluxo
- `PUT /api/flows/:id` - Atualizar fluxo
- `PUT /api/flows/:id/toggle` - Ativar/desativar

### CRM
- `GET /api/crm/boards` - Listar boards
- `POST /api/crm/boards` - Criar board
- `GET /api/crm/cards` - Listar cards
- `POST /api/crm/cards` - Criar card
- `PUT /api/crm/cards/:id/mover` - Mover card

### Campanhas
- `GET /api/campaigns` - Listar campanhas
- `POST /api/campaigns` - Criar campanha

### Dashboard
- `GET /api/dashboard/metrics` - Métricas
- `GET /api/dashboard/activity` - Atividade recente

### Webhooks
- `GET /api/webhooks` - Listar webhooks
- `POST /api/webhooks` - Criar webhook
- `POST /api/webhooks/:id/test` - Testar webhook

## 🎨 Design

O frontend utiliza um design moderno com:
- Tema escuro (dark mode)
- Efeitos glassmorphism
- Gradient accents (verde WhatsApp + azul)
- Animações suaves
- Totalmente responsivo

## 📝 Licença

MIT
