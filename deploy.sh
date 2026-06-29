#!/bin/bash
# ZapFlow Deployment Script
# Usage: ./deploy.sh [railway|vercel]

set -e

echo "🚀 ZapFlow Deployment Helper"
echo "=============================="

case "$1" in
  railway)
    echo "📦 Deploying to Railway..."
    
    # Check if Railway CLI is installed
    if ! command -v railway &> /dev/null; then
      echo "❌ Railway CLI not found. Installing..."
      npm install -g @railway/cli
    fi
    
    # Login check
    echo "🔐 Checking Railway login..."
    railway whoami || railway login
    
    # Link project
    echo "🔗 Linking project..."
    railway link
    
    # Add variables
    echo "⚙️  Adding environment variables..."
    railway variables set NODE_ENV=production
    railway variables set PORT=3001
    
    # Deploy
    echo "🚀 Deploying..."
    railway up
    
    echo "✅ Deployment complete!"
    echo "📋 Don't forget to set these variables in Railway dashboard:"
    echo "   - JWT_SECRET (generate a secure random string)"
    echo "   - WHATSAPP_API_URL (your Evolution API URL)"
    echo "   - WHATSAPP_API_KEY (your Evolution API key)"
    echo "   - OPENAI_API_KEY (your OpenAI API key)"
    echo "   - BACKEND_URL (your Railway app URL)"
    ;;
    
  vercel)
    echo "📦 Deploying frontend to Vercel..."
    
    # Check if Vercel CLI is installed
    if ! command -v vercel &> /dev/null; then
      echo "❌ Vercel CLI not found. Installing..."
      npm install -g vercel
    fi
    
    # Login check
    echo "🔐 Checking Vercel login..."
    vercel whoami || vercel login
    
    # Deploy
    echo "🚀 Deploying..."
    cd frontend && vercel --prod
    
    echo "✅ Frontend deployed!"
    echo "📋 Don't forget to:"
    echo "   1. Update vercel.json with your Railway backend URL"
    echo "   2. Set environment variables in Vercel dashboard"
    ;;
    
  *)
    echo "Usage: ./deploy.sh [railway|vercel]"
    echo ""
    echo "Options:"
    echo "  railway  - Deploy backend to Railway"
    echo "  vercel   - Deploy frontend to Vercel"
    echo ""
    echo "Recommended setup:"
    echo "  1. Deploy backend to Railway: ./deploy.sh railway"
    echo "  2. Deploy frontend to Vercel: ./deploy.sh vercel"
    echo "  3. Update vercel.json with Railway backend URL"
    ;;
esac
