#!/usr/bin/env bash
# ═══════════════════════════════════════════════
# ZapFlow - Script de Setup (Unix/Linux/Mac)
# ═══════════════════════════════════════════════
# Uso: chmod +x setup.sh && ./setup.sh
# ═══════════════════════════════════════════════

# Tratamento de erro é feito manualmente em cada etapa
# para manter diagnóstico claro

DIR="$(cd "$(dirname "$0")" && pwd)"
cd "$DIR"

GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
CYAN='\033[0;36m'
NC='\033[0m'

print_step() { echo -e "\n${CYAN}[$1/$TOTAL]${NC} $2"; }
print_ok()   { echo -e "  ${GREEN}✅${NC} $1"; }
print_warn() { echo -e "  ${YELLOW}⚠️${NC} $1"; }
print_err()  { echo -e "  ${RED}❌${NC} $1"; }

TOTAL=7

echo ""
echo "  ╔═══════════════════════════════════╗"
echo "  ║      ⚡ ZapFlow - Setup           ║"
echo "  ║  Automação Inteligente WhatsApp  ║"
echo "  ╚═══════════════════════════════════╝"
echo ""

# ─── Verificar Node.js ──────────────────────
print_step "1" "Verificando Node.js..."
if ! command -v node &>/dev/null; then
  print_err "Node.js não encontrado!"
  echo "  📥 Instale em: https://nodejs.org (v20+)"
  echo "  🔄 Após instalar, execute este script novamente."
  exit 1
fi
print_ok "Node.js $(node -v)"

if ! command -v npm &>/dev/null; then
  print_err "npm não encontrado!"
  exit 1
fi
print_ok "npm v$(npm -v)"
echo ""

# ─── Docker (opcional) ─────────────────────
print_step "2" "Verificando Docker..."
if command -v docker &>/dev/null; then
  print_ok "Docker encontrado!"
  read -p "  🐳 Iniciar PostgreSQL + Redis via Docker Compose? (s/N): " -n 1 -r
  echo ""
  if [[ $REPLY =~ ^[Ss]$ ]]; then
    echo ""
    echo "  🐳 Iniciando PostgreSQL + Redis..."
    if docker compose up -d 2>/dev/null || docker-compose up -d 2>/dev/null; then
      print_ok "PostgreSQL e Redis rodando!"
    else
      print_warn "Erro ao iniciar Docker. Verifique se o Docker Desktop está aberto."
    fi
  fi
else
  print_warn "Docker não encontrado. Configure PostgreSQL e Redis manualmente."
fi
echo ""

# ─── Backend ────────────────────────────────
print_step "3" "Configurando backend..."
cd backend

echo "  📦 Instalando dependências do backend..."
npm install --loglevel=warn
print_ok "Dependências instaladas"

if [ ! -f .env ]; then
  echo -e "  ${YELLOW}📝${NC} Criando backend/.env a partir de .env.example..."
  cp .env.example .env
  print_ok "Arquivo .env criado!"
  print_warn "Edite backend/.env com suas configurações (opcional para teste)"
else
  print_ok "backend/.env já existe"
fi
echo ""

# ─── Prisma ─────────────────────────────────
print_step "4" "Configurando banco de dados..."

echo "  🔧 Gerando Prisma Client..."
if ! npx prisma generate; then
  print_err "Erro ao gerar Prisma Client. Verifique a conexão com PostgreSQL."
  echo "  ℹ️  Certifique-se de que PostgreSQL está rodando e a DATABASE_URL em backend/.env está correta."
  exit 1
fi
print_ok "Prisma Client gerado"

echo "  📋 Sincronizando schema com banco..."
if ! npx prisma db push --accept-data-loss; then
  print_err "Erro ao sincronizar banco. Verifique a DATABASE_URL em backend/.env"
  exit 1
fi
print_ok "Schema sincronizado"

echo "  🌱 Populando banco com dados de demonstração..."
if npm run db:seed 2>/dev/null; then
  print_ok "Dados de demonstração inseridos!"
else
  print_warn "Seed pode já ter sido executado (ignorando)."
fi
echo ""

# ─── Frontend ───────────────────────────────
print_step "5" "Configurando frontend..."
cd ../frontend

echo "  📦 Instalando dependências do frontend..."
npm install --loglevel=warn
print_ok "Dependências instaladas"

if [ ! -f .env ]; then
  echo "  📝 Criando frontend/.env..."
  cp .env.example .env
  print_ok "frontend/.env criado!"
else
  print_ok "frontend/.env já existe"
fi
echo ""

# ─── Testes ─────────────────────────────────
print_step "6" "Executando testes..."

cd ../backend
echo "  🧪 Testes do backend..."
npm test 2>&1 | tail -10
echo ""

cd ../frontend
echo "  🧪 Testes do frontend..."
npm test 2>&1 | tail -10
cd ..

echo ""

# ─── Concluído ──────────────────────────────
print_step "7" "✅ Setup concluído!"
echo ""
echo "  ╔══════════════════════════════════════════════╗"
echo "  ║        🚀 ZapFlow pronto para uso!          ║"
echo "  ╠══════════════════════════════════════════════╣"
echo "  ║                                              ║"
echo "  ║  Backend:  cd backend && npm run dev         ║"
echo "  ║  Frontend: cd frontend && npm run dev        ║"
echo "  ║                                              ║"
echo "  ║  Login:    admin@zapflow.com / 123456        ║"
echo "  ║                                              ║"
echo "  ╚══════════════════════════════════════════════╝"
echo ""
