FROM node:20-slim

WORKDIR /app

# Copy package files
COPY package*.json ./
COPY prisma ./prisma/

# Install dependencies
RUN npm install

# Generate Prisma client
RUN npx prisma generate

# Copy source code
COPY . .

# Build TypeScript
RUN npx tsc || true

# Expose port
EXPOSE 3001

# Start command
CMD ["npx", "tsx", "src/index.ts"]
