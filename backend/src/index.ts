import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import compression from 'compression';
import rateLimit from 'express-rate-limit';
import path from 'path';
import { createServer } from 'http';
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
app.use(compression()); // Gzip response compression
app.use(cors({ origin: process.env.FRONTEND_URL || '*', credentials: true }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Rate limiting for API routes
const apiLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: parseInt(process.env.RATE_LIMIT_MAX || '100'),
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Muitas requisições. Tente novamente em instantes.' },
});
app.use('/api', apiLimiter);

// Stricter rate limit for auth routes
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Muitas tentativas de login. Tente novamente em 15 minutos.' },
});
app.use('/api/auth', authLimiter);

// Parse JSON body but preserve raw body for Stripe webhook signature verification
app.use(
  express.json({
    limit: '50mb',
    verify: (req: any, _res, buf) => {
      // Store raw body for Stripe webhook signature verification
      if (req.headers['stripe-signature']) {
        req.rawBody = buf.toString();
      }
    },
  })
);

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

// Health check
app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', name: process.env.APP_NAME || 'ZapFlow', version: '1.0.0' });
});

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

// Start server
httpServer.listen(PORT, () => {
  console.log(`\n🚀 ZapFlow Backend running on http://localhost:${PORT}`);
  console.log(`📡 WebSocket ready`);
  console.log(`🌐 Serving frontend from ${publicPath}\n`);
});

export default app;
