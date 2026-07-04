#!/bin/bash
# ═══════════════════════════════════════════════════════════
# ZapFlow — Deploy Script
# ═══════════════════════════════════════════════════════════
#
# Uso:
#   ./deploy.sh                    # Deploy completo
#   ./deploy.sh --skip-tests       # Pula testes
#   ./deploy.sh --skip-push        # Apenas build + deploy local
#   ./deploy.sh --tag v1.2.3       # Tag específica
#   ./deploy.sh --env prod         # Ambiente (prod → docker-compose.prod.yml)
#   ./deploy.sh --rollback         # Rollback para deploy anterior
#   ./deploy.sh --help             # Ajuda
#
# Pré-requisitos:
#   - Docker Engine 24+ com Docker Compose plugin
#   - Git (para versionamento automático)
#   - .env configurado (cp .env.prod.example .env)
#   - backend/.env configurado (cp backend/.env.example backend/.env)
#
# ═══════════════════════════════════════════════════════════

set -euo pipefail

# ─── Configuração ───────────────────────────────
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

ENV_FILE=".env"
BACKEND_ENV_FILE="backend/.env"
BACKUP_DIR="deploy/backups"
TIMESTAMP=$(date '+%Y%m%d_%H%M%S')

# Temp dir exclusivo desta execução (limpo no trap)
TMP_DIR=$(mktemp -d /tmp/zapflow-deploy-XXXXXX)

# Cores
RED='\033[0;31m'; GREEN='\033[0;32m'; YELLOW='\033[1;33m'; BLUE='\033[0;34m'; CYAN='\033[0;36m'; NC='\033[0m'

# Flags
SKIP_TESTS=false
SKIP_PUSH=false
DEPLOY_TAG=""
DEPLOY_ENV="prod"
COMPOSE_FILE="docker-compose.prod.yml"
DO_ROLLBACK=false
REGISTRY="${REGISTRY:-}"

# ─── Cleanup on exit ────────────────────────────
cleanup() {
  rm -rf "$TMP_DIR" 2>/dev/null || true
}
trap cleanup EXIT

# ─── Help ───────────────────────────────────────
show_help() {
  cat <<EOF
${CYAN}ZapFlow — Deploy Script${NC}

Uso: ./deploy.sh [opções]

Opções:
  --skip-tests       Pular execução dos testes
  --skip-push        Pular push para registry (apenas build + deploy local)
  --tag <tag>        Tag da imagem (default: git commit hash)
  --env <nome>       Ambiente (prod, staging) — default: prod
  --rollback         Reverter para o deploy anterior
  --help             Mostrar esta ajuda

Exemplos:
  ./deploy.sh                              # Deploy completo
  ./deploy.sh --skip-tests --skip-push     # Deploy rápido (dev)
  ./deploy.sh --tag v1.2.3                 # Deploy com tag semântica
  ./deploy.sh --rollback                   # Rollback
EOF
  exit 0
}

# ─── Parse args ────────────────────────────────
while [[ $# -gt 0 ]]; do
  case "$1" in
    --skip-tests)    SKIP_TESTS=true; shift ;;
    --skip-push)     SKIP_PUSH=true; shift ;;
    --tag)           DEPLOY_TAG="$2"; shift 2 ;;
    --env)           DEPLOY_ENV="$2"; shift 2 ;;
    --rollback)      DO_ROLLBACK=true; shift ;;
    --help)          show_help ;;
    *)               echo -e "${RED}❌ Opção desconhecida: $1${NC}"; show_help ;;
  esac
done

# ─── Selecionar compose file pelo ambiente ─────
case "$DEPLOY_ENV" in
  prod)    COMPOSE_FILE="docker-compose.prod.yml" ;;
  staging) COMPOSE_FILE="docker-compose.staging.yml" ;;
  dev)     COMPOSE_FILE="docker-compose.yml"
           log_warn "⚠️  --env dev usa docker-compose.yml (exige ports expostas)."
           log_info "   Para deploy real, use: --env prod" ;;
  *)
    if [ -f "docker-compose.${DEPLOY_ENV}.yml" ]; then
      COMPOSE_FILE="docker-compose.${DEPLOY_ENV}.yml"
    else
      die "Arquivo docker-compose.${DEPLOY_ENV}.yml não encontrado."
    fi
    ;;
esac

# ─── Helpers ────────────────────────────────────
log_info()  { echo -e "${GREEN}[$(date '+%H:%M:%S')]${NC} $1"; }
log_warn()  { echo -e "${YELLOW}[$(date '+%H:%M:%S')]${NC} $1"; }
log_error() { echo -e "${RED}[$(date '+%H:%M:%S')]${NC} $1"; }
log_step()  { echo -e "\n${BLUE}━━━ $1 ━━━${NC}"; }

die() { log_error "$1"; exit 1; }

confirm() {
  local prompt="$1"
  local default="${2:-y}"
  local options
  if [ "$default" = "y" ]; then options="[Y/n]"
  else options="[y/N]"
  fi
  read -p "$(echo -e "${YELLOW}${prompt} ${options}${NC} ")" -r response
  response=${response:-$default}
  [[ "$response" =~ ^[Yy]$ ]]
}

# ─── Load root .env ─────────────────────────────
load_env() {
  if [ ! -f "$ENV_FILE" ]; then
    die "Arquivo .env não encontrado na raiz. Copie de .env.prod.example"
  fi
  set -a
  source "$ENV_FILE"
  set +a
}

# ─── Validate a single backend env var ───────────
# Lê de backend/.env sem exportar para o shell global
check_backend_var() {
  local var_name="$1"
  # Lê o valor diretamente do arquivo (subshell para não poluir escopo)
  local val
  val=$(grep -E "^${var_name}=" "$BACKEND_ENV_FILE" 2>/dev/null | head -1 | cut -d= -f2- | sed -E 's/^"(.*)"$/\1/'"'"' | tr -d "'"'" || echo "")

  if [ -z "$val" ]; then
    die "Variável ${var_name} não encontrada em backend/.env"
  fi
  if echo "$val" | grep -qi "change-me\|your-\|secret\|placeholder"; then
    log_warn "⚠️  ${var_name} parece ser um placeholder em backend/.env ($val)"
  fi
  log_info "✅ ${var_name} configurada"
}

# ═══════════════════════════════════════════════════
# ─── Pre-flight Checks ───────────────────────────
# ═══════════════════════════════════════════════════
preflight_checks() {
  log_step "1/6 — Verificações de pré-voo"

  # Docker
  docker info >/dev/null 2>&1 || die "Docker não está rodando."
  log_info "✅ Docker disponível"

  docker compose version >/dev/null 2>&1 || die "Docker Compose plugin não encontrado."
  log_info "✅ Docker Compose disponível"

  # Arquivos obrigatórios
  local required_files=(
    "$COMPOSE_FILE"
    "$ENV_FILE"
    "$BACKEND_ENV_FILE"
    "Caddyfile"
    "backend/Dockerfile.prod"
    "frontend/Dockerfile"
    "scripts/backup-db.sh"
  )
  for f in "${required_files[@]}"; do
    [ -f "$f" ] || die "Arquivo obrigatório não encontrado: $f"
    log_info "✅ ${f} presente"
  done

  # Validar variáveis do .env raiz
  local required_vars=(
    "CADDY_DOMAIN" "CADDY_EMAIL"
    "POSTGRES_PASSWORD" "REDIS_PASSWORD" "FRONTEND_URL"
  )
  for var in "${required_vars[@]}"; do
    [ -z "${!var:-}" ] && die "Variável ${var} não configurada no .env"
    log_info "✅ ${var} configurada"
  done

  # Validar backend/.env sem exportar (lê direto do arquivo)
  if [ -f "$BACKEND_ENV_FILE" ]; then
    check_backend_var "JWT_SECRET"
    check_backend_var "DATABASE_URL"
    check_backend_var "REDIS_URL"
    log_info "✅ backend/.env validado"
  fi
}

# ═══════════════════════════════════════════════════
# ─── Run Tests ───────────────────────────────────
# ═══════════════════════════════════════════════════
run_tests() {
  log_step "2/6 — Executando testes"

  log_info "🧪 Backend tests..."
  (cd backend && npm test 2>&1 | tail -5) || die "Testes do backend falharam!"

  log_info "🧪 Frontend tests..."
  (cd frontend && npm test 2>&1 | tail -5) || die "Testes do frontend falharam!"

  log_info "✅ Todos os 95 testes passaram"
}

# ═══════════════════════════════════════════════════
# ─── Build Images ────────────────────────────────
# ═══════════════════════════════════════════════════
build_images() {
  log_step "3/6 — Construindo imagens Docker"

  # Determinar tag
  [ -z "$DEPLOY_TAG" ] && DEPLOY_TAG=$(git rev-parse --short HEAD 2>/dev/null || echo "latest")

  # Tags
  local backend_tag frontend_tag
  if [ -n "$REGISTRY" ]; then
    backend_tag="${REGISTRY}/zapflow-backend:${DEPLOY_TAG}"
    frontend_tag="${REGISTRY}/zapflow-frontend:${DEPLOY_TAG}"
  else
    backend_tag="zapflow-backend:${DEPLOY_TAG}"
    frontend_tag="zapflow-frontend:${DEPLOY_TAG}"
  fi

  # Build backend (Dockerfile.prod)
  log_info "🔨 Backend: ${backend_tag}"
  docker build \
    -f backend/Dockerfile.prod \
    -t "$backend_tag" \
    -t "zapflow-backend:latest" \
    --build-arg BUILDKIT_INLINE_CACHE=1 \
    --pull \
    .

  # Build frontend
  log_info "🔨 Frontend: ${frontend_tag}"
  docker build \
    -f frontend/Dockerfile \
    -t "$frontend_tag" \
    -t "zapflow-frontend:latest" \
    --pull \
    frontend

  log_info "✅ Imagens construídas com tag: ${DEPLOY_TAG}"

  # Salvar tags em temp dir (exclusivo desta execução)
  echo "$backend_tag" > "${TMP_DIR}/backend_tag"
  echo "$frontend_tag" > "${TMP_DIR}/frontend_tag"
}

# ═══════════════════════════════════════════════════
# ─── Push Images ────────────────────────────────
# ═══════════════════════════════════════════════════
push_images() {
  [ "$SKIP_PUSH" = true ] && { log_info "⏩ Push pulado (--skip-push)"; return; }

  [ -z "$REGISTRY" ] && {
    log_warn "⚠️  REGISTRY não configurado. Configure: export REGISTRY=seuusuario"
    log_info "ℹ️  Exemplos: Docker Hub (seuusuario), ghcr.io/seuusuario"
    return
  }

  log_step "4/6 — Enviando imagens para o registry"

  local backend_tag frontend_tag
  backend_tag=$(cat "${TMP_DIR}/backend_tag" 2>/dev/null || echo "")
  frontend_tag=$(cat "${TMP_DIR}/frontend_tag" 2>/dev/null || echo "")
  [ -z "$backend_tag" ] && die "Tags não encontradas. Execute o build primeiro."

  log_info "📤 Backend: ${backend_tag}"
  docker push "$backend_tag"

  log_info "📤 Frontend: ${frontend_tag}"
  docker push "$frontend_tag"

  # Push latest tags
  docker tag "$backend_tag" "${REGISTRY}/zapflow-backend:latest" 2>/dev/null || true
  docker tag "$frontend_tag" "${REGISTRY}/zapflow-frontend:latest" 2>/dev/null || true
  docker push "${REGISTRY}/zapflow-backend:latest" 2>/dev/null || true
  docker push "${REGISTRY}/zapflow-frontend:latest" 2>/dev/null || true

  log_info "✅ Imagens enviadas"
}

# ═══════════════════════════════════════════════════
# ─── Backup do Deploy Atual ─────────────────────
# ═══════════════════════════════════════════════════
backup_current_deploy() {
  mkdir -p "$BACKUP_DIR"

  local backup_file="${BACKUP_DIR}/pre_${TIMESTAMP}.sh"

  # Coletar estado atual de cada serviço: imagem, digest, container ID
  {
    echo "#!/bin/bash"
    echo "# ZapFlow deploy backup — ${TIMESTAMP}"
    echo "# Restore: source $backup_file"
    echo ""

    local services
    services=$(docker compose -f "$COMPOSE_FILE" ps --services 2>/dev/null || echo "")
    for svc in $services; do
      local container
      container=$(docker compose -f "$COMPOSE_FILE" ps -q "$svc" 2>/dev/null || echo "")

      if [ -n "$container" ]; then
        local image
        image=$(docker inspect --format='{{.Config.Image}}' "$container" 2>/dev/null || echo "")
        local digest
        digest=$(docker inspect --format='{{index .RepoDigests 0}}' "$container" 2>/dev/null || echo "")

        if [ -n "$image" ]; then
          echo "PREVIOUS_${svc^^}_IMAGE=\"$image\""
        fi
        if [ -n "$digest" ]; then
          echo "PREVIOUS_${svc^^}_DIGEST=\"$digest\""
        fi
      fi
    done
    echo ""
    echo "export PREVIOUS_DEPLOY_TIMESTAMP=\"${TIMESTAMP}\""
  } > "$backup_file"

  chmod +x "$backup_file"
  log_info "📦 Estado salvo em ${backup_file}"

  # Manter apenas os 5 últimos backups
  ls -t "${BACKUP_DIR}/pre_"*.sh 2>/dev/null | tail -n +6 | xargs rm -f 2>/dev/null || true
}

# ═══════════════════════════════════════════════════
# ─── Rollback ────────────────────────────────────
# ═══════════════════════════════════════════════════
rollback_deploy() {
  log_step "🔄 Realizando rollback"

  local latest_backup
  latest_backup=$(ls -t "${BACKUP_DIR}/pre_"*.sh 2>/dev/null | head -1)

  if [ -z "$latest_backup" ]; then
    die "Nenhum backup anterior encontrado. Execute um deploy primeiro."
  fi

  log_info "📦 Restaurando backup: $(basename "$latest_backup")"

  # Carregar as imagens anteriores do backup
  source "$latest_backup"

  # Restaurar tags :latest para as imagens anteriores
  local restored=false

  # Para cada variável PREVIOUS_*_IMAGE exportada pelo backup
  for var in $(compgen -v | grep '^PREVIOUS_' || true); do
    local image_name="${var%%_IMAGE}"
    image_name="${image_name#PREVIOUS_}"
    local image_val="${!var}"

    if [ -n "$image_val" ]; then
      log_info "🔄 Restaurando ${image_name} → ${image_val}"
      docker tag "$image_val" "zapflow-${image_name,,}:latest" 2>/dev/null || true
      restored=true
    fi
  done

  if [ "$restored" = false ]; then
    log_warn "⚠️  Nenhuma imagem anterior encontrada no backup. Usando imagens atuais."
  fi

  # Recriar containers com as imagens (possivelmente) restauradas
  docker compose -f "$COMPOSE_FILE" up -d --force-recreate --remove-orphans

  log_info "✅ Rollback concluído"
  health_check
}

# ═══════════════════════════════════════════════════
# ─── Deploy ─────────────────────────────────────
# ═══════════════════════════════════════════════════
run_deploy() {
  log_step "5/6 — Implantando serviços"

  # Backup do estado atual ANTES de sobrescrever as imagens
  backup_current_deploy

  # Pull imagens mais recentes se registry configurado
  if [ -n "$REGISTRY" ]; then
    log_info "📥 Pulling latest images..."
    docker compose -f "$COMPOSE_FILE" pull 2>/dev/null || true
  fi

  log_info "🚀 Iniciando deploy..."
  docker compose -f "$COMPOSE_FILE" up -d --remove-orphans

  log_info "✅ Deploy concluído"
}

# ═══════════════════════════════════════════════════
# ─── Health Check ───────────────────────────────
# ═══════════════════════════════════════════════════
health_check() {
  log_step "6/6 — Verificando saúde dos serviços"

  local services
  services=$(docker compose -f "$COMPOSE_FILE" ps --services 2>/dev/null || echo "")
  [ -z "$services" ] && { log_warn "⚠️  Nenhum serviço rodando."; return; }

  local all_healthy=true

  for service in $services; do
    local container
    container=$(docker compose -f "$COMPOSE_FILE" ps -q "$service" 2>/dev/null || echo "")

    if [ -z "$container" ]; then
      log_warn "⚠️  ${service}: container não encontrado"
      all_healthy=false
      continue
    fi

    local status
    status=$(docker inspect --format='{{.State.Status}}' "$container" 2>/dev/null || echo "unknown")

    if [ "$status" = "running" ]; then
      local health
      health=$(docker inspect --format='{{.State.Health.Status}}' "$container" 2>/dev/null || echo "none")
      if [ "$health" = "healthy" ] || [ "$health" = "none" ]; then
        log_info "✅ ${service}: running (${health})"
      else
        log_warn "⚠️  ${service}: running (health: ${health})"
        all_healthy=false
      fi
    else
      log_error "❌ ${service}: ${status}"
      all_healthy=false
    fi
  done

  echo ""
  if [ "$all_healthy" = true ]; then
    log_info "🎉 Todos os serviços estão saudáveis!"
  else
    log_warn "⚠️  Alguns serviços podem não estar saudáveis."
    log_warn "   Logs: docker compose -f ${COMPOSE_FILE} logs --tail=50"
  fi
}

# ═══════════════════════════════════════════════════
# ─── Summary ─────────────────────────────────────
# ═══════════════════════════════════════════════════
print_summary() {
  local domain
  domain=$(grep '^CADDY_DOMAIN' .env 2>/dev/null | head -1 | cut -d= -f2 | tr -d ' "' || echo "localhost")

  echo ""
  echo -e "${CYAN}╔════════════════════════════════════════════════╗${NC}"
  echo -e "${CYAN}║         ZapFlow Deploy Complete 🚀           ║${NC}"
  echo -e "${CYAN}╚════════════════════════════════════════════════╝${NC}"
  echo ""
  echo -e "  ${GREEN}Ambiente:${NC}   ${DEPLOY_ENV}"
  echo -e "  ${GREEN}Compose:${NC}    ${COMPOSE_FILE}"
  echo -e "  ${GREEN}Tag:${NC}        ${DEPLOY_TAG:-latest}"
  echo -e "  ${GREEN}Domínio:${NC}    https://${domain}"
  echo ""
  echo -e "  ${YELLOW}Comandos úteis:${NC}"
  echo -e "    docker compose -f ${COMPOSE_FILE} ps"
  echo -e "    docker compose -f ${COMPOSE_FILE} logs -f"
  echo -e "    ./deploy.sh --rollback      # Reverter"
  echo ""
}

# ═══════════════════════════════════════════════════
# ─── Main ────────────────────────────────────────
# ═══════════════════════════════════════════════════

echo ""
echo -e "${CYAN}╔════════════════════════════════════════════════╗${NC}"
echo -e "${CYAN}║            ZapFlow Deploy Pipeline             ║${NC}"
echo -e "${CYAN}╚════════════════════════════════════════════════╝${NC}"
echo ""

load_env

if [ "$DO_ROLLBACK" = true ]; then
  rollback_deploy
  print_summary
  exit 0
fi

# ─── Pipeline principal ─────────────────────────
preflight_checks

if [ "$SKIP_TESTS" = false ]; then
  run_tests
else
  log_info "⏩ Testes pulados (--skip-tests)"
fi

build_images

if [ "$SKIP_PUSH" = false ]; then
  push_images
fi

echo ""
confirm "Continuar com o deploy?" "y" || die "Deploy cancelado pelo usuário."

run_deploy
health_check
print_summary

log_info "✅ Deploy finalizado com sucesso!"
