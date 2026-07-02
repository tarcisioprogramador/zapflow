FROM node:20-slim

WORKDIR /app

# Install OpenSSL (required by Prisma for PostgreSQL)
RUN apt-get update -y && apt-get install -y openssl ca-certificates && rm -rf /var/lib/apt/lists/*

# Copy package files — using backend/ prefix since Railway uses project root as build context
COPY backend/package*.json ./
COPY backend/prisma ./prisma/

# Install dependencies
RUN npm install

# Generate Prisma client
RUN npx prisma generate

# Copy source code (from backend/)
COPY backend/ ./

# Create startup script
RUN echo '#!/bin/bash\n\
echo "⏳ Running database migrations..."\n\
npx prisma db push --accept-data-loss 2>&1 || echo "⚠️  Migration failed, continuing..."\n\
echo "🚀 Starting server..."\n\
npx tsx src/index.ts' > /app/start.sh && chmod +x /app/start.sh

# Expose port
EXPOSE 3001

# Start command
CMD ["/app/start.sh"]
