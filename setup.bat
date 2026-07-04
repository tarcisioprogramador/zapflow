@echo off
title ZapFlow - Setup
cd /d "%~dp0"

:: ════════════════════════════════════════════
:: ZapFlow - Script de Setup (Windows)
:: ════════════════════════════════════════════
:: Uso: 双击 setup.bat  ou  .\setup.bat
:: ════════════════════════════════════════════

echo.
echo  ╔═══════════════════════════════════╗
echo  ║      ⚡ ZapFlow - Setup           ║
echo  ║  Automação Inteligente WhatsApp  ║
echo  ╚═══════════════════════════════════╝
echo.

:: ─── Verificar Node.js ──────────────────────
echo [1/7] Verificando Node.js...
where node >nul 2>&1
if %errorlevel% neq 0 (
    echo  ❌ Node.js não encontrado!
    echo  📥 Instale em: https://nodejs.org (v20+)
    echo  🔄 Após instalar, execute este script novamente.
    pause
    exit /b 1
)
for /f "tokens=*" %%i in ('node -v') do set NODE_VER=%%i
echo  ✅ Node.js %NODE_VER%

:: ─── Verificar npm ─────────────────────────
where npm >nul 2>&1
if %errorlevel% neq 0 (
    echo  ❌ npm não encontrado!
    pause
    exit /b 1
)
for /f "tokens=*" %%i in ('npm -v') do set NPM_VER=%%i
echo  ✅ npm v%NPM_VER%
echo.

:: ─── Docker (opcional) ─────────────────────
echo [2/7] Verificando Docker...
where docker >nul 2>&1
if %errorlevel% equ 0 (
    echo  ✅ Docker encontrado!
    echo  ⚠️  Deseja iniciar PostgreSQL e Redis via Docker?
    echo     Se SIM, certifique-se de que o Docker Desktop está rodando.
    echo.
    choice /c SN /n /m "  Iniciar Docker Compose? (S/N): "
    if errorlevel 2 goto :skip_docker
    if errorlevel 1 (
        echo.
        echo  🐳 Iniciando PostgreSQL + Redis...
        docker compose up -d
        if %errorlevel% equ 0 (
            echo  ✅ PostgreSQL e Redis rodando!
        ) else (
            echo  ⚠️  Erro ao iniciar Docker. Verifique se o Docker Desktop está aberto.
        )
    )
) else (
    echo  ⚠️  Docker não encontrado. Configure PostgreSQL e Redis manualmente.
)
:skip_docker
echo.

:: ─── Backend ────────────────────────────────
echo [3/7] Configurando backend...
cd backend

:: Instalar dependências
echo  📦 Instalando dependências do backend...
call npm install
if %errorlevel% neq 0 (
    echo  ❌ Erro ao instalar dependências do backend.
    pause
    exit /b 1
)
echo  ✅ Dependências instaladas

:: Criar .env se não existir
if not exist .env (
    echo  📝 Criando backend/.env a partir de .env.example...
    copy .env.example .env >nul
    echo  ✅ Arquivo .env criado!
    echo  ⚠️  Edite backend/.env com suas configurações (opcional para teste)
) else (
    echo  ✅ backend/.env já existe
)
echo.

:: ─── Prisma ─────────────────────────────────
echo [4/7] Configurando banco de dados...

:: Gerar Prisma Client
echo  🔧 Gerando Prisma Client...
call npx prisma generate
if %errorlevel% neq 0 (
    echo  ❌ Erro ao gerar Prisma Client. Verifique a conexão com PostgreSQL.
    pause
    exit /b 1
)
echo  ✅ Prisma Client gerado

:: Push schema
echo  📋 Sincronizando schema com banco...
call npx prisma db push --accept-data-loss
if %errorlevel% neq 0 (
    echo  ❌ Erro ao sincronizar banco. Verifique a DATABASE_URL em backend/.env
    pause
    exit /b 1
)
echo  ✅ Schema sincronizado

:: Seed
echo  🌱 Populando banco com dados de demonstração...
call npm run db:seed
if %errorlevel% neq 0 (
    echo  ⚠️  Seed pode já ter sido executado (ignorando).
) else (
    echo  ✅ Dados de demonstração inseridos!
)
echo.

:: ─── Frontend ───────────────────────────────
echo [5/7] Configurando frontend...
cd ..\frontend

:: Instalar dependências
echo  📦 Instalando dependências do frontend...
call npm install
if %errorlevel% neq 0 (
    echo  ❌ Erro ao instalar dependências do frontend.
    pause
    exit /b 1
)
echo  ✅ Dependências instaladas

:: Criar .env se não existir
if not exist .env (
    echo  📝 Criando frontend/.env...
    copy .env.example .env >nul
    echo  ✅ frontend/.env criado!
) else (
    echo  ✅ frontend/.env já existe
)
echo.

:: ─── Testes ─────────────────────────────────
echo [6/7] Executando testes...

cd ..\backend
echo  🧪 Testes do backend...
call npm test
echo.
cd ..\frontend
echo  🧪 Testes do frontend...
call npm test
cd ..
echo.

:: ─── Concluído ──────────────────────────────
echo [7/7] ✅ Setup concluído!
echo.
echo  ╔══════════════════════════════════════════════╗
echo  ║        🚀 ZapFlow pronto para uso!          ║
echo  ╠══════════════════════════════════════════════╣
echo  ║                                              ║
echo  ║  Backend:  npm run dev (em backend/)         ║
echo  ║  Frontend: npm run dev (em frontend/)        ║
echo  ║                                              ║
echo  ║  Login:    admin@zapflow.com / 123456        ║
echo  ║                                              ║
echo  ╚══════════════════════════════════════════════╝
echo.
pause
