# 🚀 ZapFlow - Guia de Deploy

## Opção 1: Railway (Recomendado) + Vercel

### Deploy do Backend (Railway)

1. **Crie uma conta no [Railway](https://railway.app)**
2. **Clique em "New Project" → "Deploy from GitHub"**
3. **Selecione o repositório ZapFlow**
4. **Configure as variáveis de ambiente:**

```env
NODE_ENV=production
PORT=3001
JWT_SECRET=sua-chave-secreta-aqui-mude-para-producao
WHATSAPP_API_URL=https://sua-evolution-api.com
WHATSAPP_API_KEY=sua-chave-api-evolution
OPENAI_API_KEY=sua-chave-openai
BACKEND_URL=https://seu-app.railway.app
FRONTEND_URL=https://seu-frontend.vercel.app
```

5. **Configure o build (Railway Dashboard → Settings → Deploy):**
   - Root Directory: `.` (raiz do projeto — necessário para o Dockerfile.prod)
   - Dockerfile Path: `backend/Dockerfile.prod`

6. **O Railway vai fazer deploy automaticamente!**

> ⚠️ O `Dockerfile.prod` usa build multi-stage com compilação TypeScript,
>   usuário não-root e `tini` como init. O build pode levar 2-3 minutos na primeira vez.

### Deploy do Frontend (Vercel)

1. **Crie uma conta no [Vercel](https://vercel.com)**
2. **Clique em "New Project" → "Import Git Repository"**
3. **Selecione o repositório ZapFlow**
4. **Configure:**
   - Root Directory: `frontend`
   - Framework: Vite
   - Build Command: `npm run build`
   - Output Directory: `dist`

5. **Configure as variáveis de ambiente:**
   - `VITE_API_URL`: URL do backend Railway (ex: `https://zapflow-backend.railway.app`)

6. **Deploy automático!**

---

## Opção 2: Railway Tudo Junto

Se preferir rodar tudo no Railway:

1. **Crie um novo projeto no Railway**
2. **Adicione um serviço PostgreSQL**
3. **Adicione um serviço Redis (opcional)**
4. **Configure as variáveis de ambiente:**
   ```env
   DATABASE_URL=postgresql://user:pass@host:5432/zapflow
   REDIS_URL=redis://default:pass@host:6379
   JWT_SECRET=sua-chave-secreta
   WHATSAPP_API_URL=https://sua-evolution-api.com
   WHATSAPP_API_KEY=sua-chave
   OPENAI_API_KEY=sua-chave
   BACKEND_URL=https://seu-app.railway.app
   FRONTEND_URL=https://seu-app.railway.app
   ```

5. **Deploy!**

---

## Opção 3: Docker

```bash
# Build e rode com Docker Compose
docker-compose up -d

# Ou manualmente
docker build -t zapflow-backend ./backend
docker build -t zapflow-frontend ./frontend
docker run -p 3001:3001 zapflow-backend
docker run -p 80:80 zapflow-frontend
```

---

## Variáveis de Ambiente Obrigatórias

| Variável | Descrição | Obrigatória |
|----------|-----------|-------------|
| `JWT_SECRET` | Chave secreta para JWT (mude em produção!) | ✅ |
| `DATABASE_URL` | URL do banco de dados | ✅ |
| `WHATSAPP_API_URL` | URL da Evolution API | ❌ (demo) |
| `WHATSAPP_API_KEY` | Chave da Evolution API | ❌ (demo) |
| `OPENAI_API_KEY` | Chave da OpenAI | ❌ (demo) |
| `BACKEND_URL` | URL do backend para CORS | ✅ |
| `FRONTEND_URL` | URL do frontend para CORS | ✅ |

---

## Após o Deploy

1. **Acesse o frontend** (Vercel)
2. **Faça login** com `admin@zapflow.com` / `123456`
3. **Configure** a Evolution API nas configurações
4. **Conecte** seu número de WhatsApp
5. **Crie** fluxos de automação
6. **Teste** o atendimento via WhatsApp!

---

## Troubleshooting

### Erro de CORS
- Verifique se `FRONTEND_URL` está configurado corretamente no backend

### Erro de WebSocket
- Railway suporta WebSocket nativamente
- Verifique se o proxy está configurado corretamente

### Erro de Banco de Dados
- Railway oferece PostgreSQL gerenciado
- SQLite funciona para demo, mas PostgreSQL é recomendado para produção

### Build Falhou
- Verifique os logs no dashboard do Railway/Vercel
- Certifique-se de que todas as dependências estão instaladas
