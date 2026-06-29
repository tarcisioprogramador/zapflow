import 'dotenv/config';
import express from 'express';
import cors from 'cors';
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

const app = express();
const httpServer = createServer(app);
const io = setupWebSocket(httpServer);

const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors({ origin: process.env.FRONTEND_URL || 'http://localhost:5173', credentials: true }));
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true }));

// Make io accessible to routes
app.set('io', io);

// Health check
app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', name: process.env.APP_NAME || 'ZapFlow', version: '1.0.0' });
});

// Public webhook route (no auth required - called by Evolution API)
app.use('/api/webhook', webhookRouter);

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

// Start server
httpServer.listen(PORT, () => {
  console.log(`\n🚀 ZapFlow Backend running on http://localhost:${PORT}`);
  console.log(`📡 WebSocket ready`);
  console.log(`🌐 CORS: ${process.env.FRONTEND_URL || 'http://localhost:5173'}\n`);
});

export default app;
