#!/bin/bash
set -e

echo ""
echo "╔═══════════════════════════════════════════╗"
echo "║       ZapFlow Backend — Production        ║"
echo "╚═══════════════════════════════════════════╝"
echo ""

# ─── Validate required environment variables ───
echo "🔍 Validating environment variables..."

: "${DATABASE_URL:?❌ DATABASE_URL is required}"
: "${REDIS_URL:?❌ REDIS_URL is required}"
: "${JWT_SECRET:?❌ JWT_SECRET is required}"
: "${POSTGRES_PASSWORD:?❌ POSTGRES_PASSWORD is required}"
: "${REDIS_PASSWORD:?❌ REDIS_PASSWORD is required}"
: "${NODE_ENV:=production}"
: "${PORT:=3001}"

echo "   ✅ All required variables set"
echo ""

# ─── Run database migrations ───────────────────
echo "⏳ Running database migrations..."
npx prisma migrate deploy 2>&1 || {
  echo "   ⚠️  Migrations failed, attempting db push as fallback..."
  npx prisma db push 2>&1
}
echo "   ✅ Migrations applied"
echo ""

# ─── Seed database (if empty) ──────────────────
echo "🌱 Checking if seed is needed..."
npx tsx prisma/seed.ts 2>/dev/null || \
  echo "   ⚠️  Seed skipped or already run"
echo ""

# ─── Start server ──────────────────────────────
echo "🚀 Starting server on port ${PORT}..."
echo ""
exec node dist/src/index.js
