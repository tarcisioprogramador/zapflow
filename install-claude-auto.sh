#!/usr/bin/env bash
#
# install-claude-auto.sh
# Instalação automática do Claude CLI + abertura do login
# Compatível com Linux, macOS e Windows (Git Bash / WSL)
#
# Uso:
#   chmod +x install-claude-auto.sh && ./install-claude-auto.sh
#

set -e

# ─── Cores ──────────────────────────────────────────────
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

log_info()  { echo -e "${CYAN}[INFO]${NC} $1"; }
log_ok()    { echo -e "${GREEN}[OK]${NC} $1"; }
log_warn()  { echo -e "${YELLOW}[WARN]${NC} $1"; }
log_error() { echo -e "${RED}[ERROR]${NC} $1"; }

# ─── Banner ─────────────────────────────────────────────
echo ""
echo -e "${CYAN}╔══════════════════════════════════════════╗${NC}"
echo -e "${CYAN}║    🤖 Claude Code - Instalação Auto     ║${NC}"
echo -e "${CYAN}╚══════════════════════════════════════════╝${NC}"
echo ""

# ─── 1. Verificar dependências ─────────────────────────
log_info "Verificando dependências..."

# curl ou wget
HAS_CURL=false
HAS_WGET=false
command -v curl >/dev/null 2>&1 && HAS_CURL=true
command -v wget >/dev/null 2>&1 && HAS_WGET=true

if [ "$HAS_CURL" = false ] && [ "$HAS_WGET" = false ]; then
    log_error "É necessário curl ou wget para baixar o instalador."
    exit 1
fi
log_ok "Dependências básicas OK (curl=$HAS_CURL, wget=$HAS_WGET)"

# ─── 2. Verificar se já está instalado ─────────────────
log_info "Verificando instalação existente..."

if command -v claude &>/dev/null; then
    INSTALLED_VERSION=$(claude --version 2>/dev/null || echo "desconhecida")
    log_ok "Claude Code já instalado! Versão: ${INSTALLED_VERSION}"

    echo ""
    log_info "Deseja reinstalar/atualizar? (s/N)"
    read -r REINSTALL
    if [[ ! "$REINSTALL" =~ ^[Ss]$ ]]; then
        log_info "Pulando instalação..."
        GOTO_LOGIN=true
    else
        log_info "Reinstalando..."
        GOTO_LOGIN=false
    fi
else
    GOTO_LOGIN=false
fi

# ─── 3. Instalar ────────────────────────────────────────
if [ "$GOTO_LOGIN" != true ]; then
    echo ""
    log_info "Baixando e executando instalador oficial..."
    echo ""

    if [ "$HAS_CURL" = true ]; then
        if bash -c "$(curl -fsSL https://claude.ai/install.sh)"; then
            log_ok "Instalação concluída com sucesso!"
        else
            log_error "Falha na instalação. Verifique sua conexão ou tente manualmente."
            log_info "Manual: curl -fsSL https://claude.ai/install.sh | bash"
            exit 1
        fi
    else
        if wget -qO- https://claude.ai/install.sh | bash; then
            log_ok "Instalação concluída com sucesso!"
        else
            log_error "Falha na instalação."
            exit 1
        fi
    fi

    # ─── 4. Validar instalação ──────────────────────────
    echo ""
    log_info "Validando instalação..."

    # Recarregar PATH caso o instalador tenha adicionado um diretório novo
    export PATH="$HOME/.local/bin:$HOME/bin:$PATH"

    sleep 1

    if command -v claude &>/dev/null; then
        VERSION=$(claude --version 2>/dev/null || echo "version N/A")
        log_ok "Claude Code instalado corretamente: ${GREEN}${VERSION}${NC}"
    else
        log_warn "Comando 'claude' não encontrado no PATH."
        log_info "Tente: source ~/.bashrc && claude --version"
        log_info "Ou adicione ao PATH: export PATH=\"\$HOME/.local/bin:\$PATH\""
    fi
fi

# ─── 5. Abrir login ─────────────────────────────────────
echo ""
log_info "Abrindo navegador para login no Claude Code..."
echo ""

LOGIN_URL="https://claude.ai/login?returnTo=%2Fcode"

# Tenta abrir no navegador padrão
BROWSER_OPENED=false

if command -v xdg-open &>/dev/null; then
    xdg-open "$LOGIN_URL" && BROWSER_OPENED=true
elif command -v open &>/dev/null; then
    open "$LOGIN_URL" && BROWSER_OPENED=true
elif command -v start &>/dev/null; then
    start "$LOGIN_URL" && BROWSER_OPENED=true
elif command -v python3 &>/dev/null; then
    python3 -c "import webbrowser; webbrowser.open('$LOGIN_URL')" && BROWSER_OPENED=true
elif command -v python &>/dev/null; then
    python -c "import webbrowser; webbrowser.open('$LOGIN_URL')" && BROWSER_OPENED=true
fi

if [ "$BROWSER_OPENED" = true ]; then
    log_ok "Navegador aberto! Faça login na página."
else
    log_warn "Não foi possível abrir o navegador automaticamente."
    log_info "Abra manualmente o link abaixo:"
    echo ""
    echo -e "  ${CYAN}${LOGIN_URL}${NC}"
    echo ""
fi

# ─── 6. Mensagem final ──────────────────────────────────
echo ""
echo -e "${GREEN}╔══════════════════════════════════════════╗${NC}"
echo -e "${GREEN}║   ✅ Claude instalado e pronto!         ║${NC}"
echo -e "${GREEN}║   Faça login no navegador para ativar.  ║${NC}"
echo -e "${GREEN}╚══════════════════════════════════════════╝${NC}"
echo ""
echo -e "  📖  Documentação: ${CYAN}https://docs.anthropic.com/claude-code${NC}"
echo -e "  💻  Uso:          ${CYAN}claude${NC}"
echo -e "  🔧  Ajuda:        ${CYAN}claude --help${NC}"
echo ""

# ─── 7. Sugerir login após instalação ──────────────────
if command -v claude &>/dev/null; then
    echo -e "${YELLOW}Dica: Após fazer login, rode 'claude' para começar.${NC}"
    echo -e "${YELLOW}      Use 'claude --help' para ver todas as opções.${NC}"
    echo ""
fi
