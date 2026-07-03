import 'dotenv/config';
import express from 'express';
import cors from 'cors';
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
import { checkAndDisconnectExpiredTrials } from './services/trial';

const app = express();
const httpServer = createServer(app);
const io = setupWebSocket(httpServer);

const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors({ origin: process.env.FRONTEND_URL || '*', credentials: true }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

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

// Run initial check on startup
checkAndDisconnectExpiredTrials().catch(console.error);

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
  console.log(`\n🚀 Frontzapp Backend running on http://localhost:${PORT}`);
  console.log(`📡 WebSocket ready`);
  console.log(`🌐 Serving frontend from ${publicPath}\n`);
});

export default app;
