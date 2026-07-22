#!/bin/bash
set -e
echo ""
echo "  🚀 ZapFlow - Deploy Automatizado"
echo ""

# Push para GitHub
echo "[1/4] Enviando código para GitHub..."
if git remote get-url origin &>/dev/null; then
  git remote set-url origin https://github.com/tarcisioprogramador/zapflow.git
else
  git remote add origin https://github.com/tarcisioprogramador/zapflow.git
fi
git push -u origin master
echo ""

# Railway
echo "[2/4] Deploy do Backend no Railway..."
if command -v railway &> /dev/null; then
  railway login
  railway init
  railway up
else
  echo "Instale: npm install -g @railway/cli"
  echo "Ou acesse railway.app para deploy manual"
fi
echo ""

# Vercel
echo "[3/4] Deploy do Frontend na Vercel..."
if command -v vercel &> /dev/null; then
  cd frontend && vercel --prod && cd ..
else
  echo "Instale: npm install -g vercel"
  echo "Ou acesse vercel.com para deploy manual"
fi
echo ""

echo "[4/4] Finalizando..."
echo ""
echo "  🎉 DEPLOY CONCLUÍDO!"
echo ""
echo " 📧 Login: admin@zapflow.com / 123456"
