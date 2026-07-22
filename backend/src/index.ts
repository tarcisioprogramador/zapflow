import 'dotenv/config';
import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import compression from 'compression';
import cookieParser from 'cookie-parser';
import rateLimit from 'express-rate-limit';
import path from 'path';
import { createServer } from 'http';
import { exec } from 'child_process';
import { setupWebSocket } from './config/websocket';
import authRoutes from './routes/auth';
import userRoutes from './routes/users';
import whatsappRoutes, { webhookRouter } from './routes/whatsapp';
import conversationRoutes from './routes/conversations';
import flowRoutes from './routes/flows';
import crmRoutes from './routes/crm';
import campaignRoutes from './routes/campaigns';
import dashboardRoutes from './routes/dashboard';
import webhookRoutes from './routes/webhooks';
import remarketingRoutes from './routes/remarketing';
import knowledgeBaseRoutes from './routes/knowledge-base';
import trackingRoutes from './routes/tracking';
import paymentRoutes, { paymentWebhookRouter } from './routes/payments';
import { checkAndDisconnectExpiredTrials, migrateExistingUsersWithoutTrial } from './services/trial';

const app = express();
const httpServer = createServer(app);
const io = setupWebSocket(httpServer);

const PORT = process.env.PORT || 3001;

// Middleware
app.set('trust proxy', 1); // Trust first proxy (Caddy/Nginx) for real client IP

// ─── Helmet Security Headers ───────────────────────────
const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';

app.use(helmet({
  crossOriginResourcePolicy: { policy: 'cross-origin' }, // Allow frontend to load resources
  contentSecurityPolicy: {
    useDefaults: true,
    directives: {
      'default-src': ["'self'"],
      'script-src': ["'self'"],
      'style-src': ["'self'", "'unsafe-inline'", 'https://fonts.googleapis.com'],
      'img-src': ["'self'", 'data:', 'blob:', 'https:'],
      'media-src': ["'self'", 'https:'],
      'connect-src': ["'self'", frontendUrl, 'https:', 'wss:'],
      'font-src': ["'self'", 'data:', 'https://fonts.gstatic.com'],
      'frame-ancestors': ["'none'"],
      'form-action': ["'self'"],
      'base-uri': ["'self'"],
      'upgrade-insecure-requests': [],
    },
  },
  referrerPolicy: { policy: 'strict-origin-when-cross-origin' },
  hsts: {
    maxAge: 15768000, // 6 months
    includeSubDomains: true,
    preload: true,
  },
  frameguard: { action: 'deny' },
  noSniff: true,
  hidePoweredBy: true,
  ieNoOpen: true,
  xssFilter: true,
}));

app.use(compression()); // Gzip response compression
app.use(cors({
  origin: frontendUrl,
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  exposedHeaders: ['Content-Length', 'X-Request-Id'],
}));
app.use(cookieParser()); // Parse cookies for httpOnly auth tokens
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Rate limiting for API routes
const apiLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: parseInt(process.env.RATE_LIMIT_MAX || '100'),
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Muitas requisições. Tente novamente em instantes.' },
});
app.use('/api', apiLimiter);

// Stricter rate limit for login specifically (global safety net) — placed BEFORE routes
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 20, // 20 req / 15 min global — per-IP+email lockout is handled by bruteForceProtection middleware
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Muitas tentativas de login. Tente novamente em 15 minutos.' },
});
app.use('/api/auth/login', loginLimiter);

// Gentler rate limit for register
const registerLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 10, // 10 registration attempts per hour — per-IP limit is handled by registerRateLimit middleware
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Muitas tentativas de cadastro. Tente novamente mais tarde.' },
});
app.use('/api/auth/register', registerLimiter);

// Light rate limit for other auth routes (refresh, logout, me, profile)
const authLightLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
});
app.use('/api/auth', authLightLimiter);

// Parse JSON body
app.use(express.json({ limit: '10mb' }));

// Make io accessible to routes
app.set('io', io);

// Serve frontend static files (built from frontend/)
const publicPath = path.join(__dirname, '..', 'public');
app.use(express.static(publicPath));

// Check for expired trials every 15 minutes
setInterval(async () => {
  try {
    const count = await checkAndDisconnectExpiredTrials();
    if (count > 0) {
      console.log(`[Cron] Auto-disconnected ${count} expired trial(s)`);
    }
  } catch (error) {
    console.error('[Cron] Trial check failed:', error);
  }
}, 15 * 60 * 1000);

// Migrate existing users and check expired trials before handling requests
(async () => {
  try {
    const migrated = await migrateExistingUsersWithoutTrial();
    if (migrated > 0) {
      console.log(`[Trial] Migrated ${migrated} existing users with 7-day trial`);
    }
  } catch (err) {
    console.error('[Trial] Migration failed:', err);
  }

  try {
    const expired = await checkAndDisconnectExpiredTrials();
    if (expired > 0) {
      console.log(`[Cron] Found ${expired} expired trial(s)`);
    }
  } catch (err) {
    console.error('[Cron] Trial check failed:', err);
  }
})();

// ─── Database setup (async, non-blocking) ───────────────────
function runMigrationsAndSeed(maxRetries = 3) {
  // Run prisma db push in background (non-blocking)
  exec('npx prisma db push --accept-data-loss 2>&1', (err, stdout) => {
    if (err) {
      if (maxRetries <= 0) {
        console.log('[DB] ❌ Max retries reached. Database setup will continue in background.');
        return;
      }
      console.log(`[DB] ⏳ Database not ready yet. Retries left: ${maxRetries}...`);
      setTimeout(() => runMigrationsAndSeed(maxRetries - 1), 30000);
      return;
    }
    console.log('[DB] ✅ Migrations applied');

    // Run seed after successful migration
    exec('npx tsx prisma/seed.ts 2>&1', (err2) => {
      if (err2) {
        console.log('[DB] ⚠️ Seed may have already run, continuing...');
      } else {
        console.log('[DB] ✅ Seed data created');
      }
    });
  });
}

// Health check
app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', name: process.env.APP_NAME || 'ZapFlow', version: '1.0.0' });
});

// Run database setup on startup (non-blocking — server starts first)
runMigrationsAndSeed();

// Public webhook routes (no auth required)
app.use('/api/webhook', webhookRouter);
app.use('/api/webhook', paymentWebhookRouter);

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/whatsapp', whatsappRoutes);
app.use('/api/conversations', conversationRoutes);
app.use('/api/flows', flowRoutes);
app.use('/api/crm', crmRoutes);
app.use('/api/campaigns', campaignRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/webhooks', webhookRoutes);
app.use('/api/remarketing', remarketingRoutes);
app.use('/api/knowledge-base', knowledgeBaseRoutes);
app.use('/api/tracking', trackingRoutes);
app.use('/api/payments', paymentRoutes);

// SPA fallback — all non-API routes serve index.html
app.get('*', (_req, res) => {
  res.sendFile(path.join(publicPath, 'index.html'));
});

// Only start the server when NOT running on Vercel (serverless)
if (!process.env.VERCEL) {
  httpServer.listen(PORT, () => {
    console.log(`\n🚀 ZapFlow Backend running on http://localhost:${PORT}`);
    console.log(`📡 WebSocket ready`);
    console.log(`🌐 Serving frontend from ${publicPath}\n`);
  });
}

export default app;
export { httpServer, io };
