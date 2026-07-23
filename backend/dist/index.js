"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.io = exports.httpServer = void 0;
require("dotenv/config");
const express_1 = __importDefault(require("express"));
const helmet_1 = __importDefault(require("helmet"));
const cors_1 = __importDefault(require("cors"));
const compression_1 = __importDefault(require("compression"));
const cookie_parser_1 = __importDefault(require("cookie-parser"));
const express_rate_limit_1 = __importDefault(require("express-rate-limit"));
const path_1 = __importDefault(require("path"));
const http_1 = require("http");
const child_process_1 = require("child_process");
const websocket_1 = require("./config/websocket");
const auth_1 = __importDefault(require("./routes/auth"));
const users_1 = __importDefault(require("./routes/users"));
const whatsapp_1 = __importStar(require("./routes/whatsapp"));
const conversations_1 = __importDefault(require("./routes/conversations"));
const flows_1 = __importDefault(require("./routes/flows"));
const crm_1 = __importDefault(require("./routes/crm"));
const campaigns_1 = __importDefault(require("./routes/campaigns"));
const dashboard_1 = __importDefault(require("./routes/dashboard"));
const webhooks_1 = __importDefault(require("./routes/webhooks"));
const remarketing_1 = __importDefault(require("./routes/remarketing"));
const knowledge_base_1 = __importDefault(require("./routes/knowledge-base"));
const tracking_1 = __importDefault(require("./routes/tracking"));
const payments_1 = __importStar(require("./routes/payments"));
const trial_1 = require("./services/trial");
const app = (0, express_1.default)();
const httpServer = (0, http_1.createServer)(app);
exports.httpServer = httpServer;
const io = (0, websocket_1.setupWebSocket)(httpServer);
exports.io = io;
const PORT = process.env.PORT || 3001;
// Middleware
app.set('trust proxy', 1); // Trust first proxy (Caddy/Nginx) for real client IP
// ─── Helmet Security Headers ───────────────────────────
const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
app.use((0, helmet_1.default)({
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
app.use((0, compression_1.default)()); // Gzip response compression
app.use((0, cors_1.default)({
    origin: frontendUrl,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
    exposedHeaders: ['Content-Length', 'X-Request-Id'],
}));
app.use((0, cookie_parser_1.default)()); // Parse cookies for httpOnly auth tokens
app.use(express_1.default.urlencoded({ extended: true, limit: '10mb' }));
// Rate limiting for API routes
const apiLimiter = (0, express_rate_limit_1.default)({
    windowMs: 60 * 1000, // 1 minute
    max: parseInt(process.env.RATE_LIMIT_MAX || '100'),
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: 'Muitas requisições. Tente novamente em instantes.' },
});
app.use('/api', apiLimiter);
// Stricter rate limit for login specifically (global safety net) — placed BEFORE routes
const loginLimiter = (0, express_rate_limit_1.default)({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 20, // 20 req / 15 min global — per-IP+email lockout is handled by bruteForceProtection middleware
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: 'Muitas tentativas de login. Tente novamente em 15 minutos.' },
});
app.use('/api/auth/login', loginLimiter);
// Gentler rate limit for register
const registerLimiter = (0, express_rate_limit_1.default)({
    windowMs: 60 * 60 * 1000, // 1 hour
    max: 10, // 10 registration attempts per hour — per-IP limit is handled by registerRateLimit middleware
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: 'Muitas tentativas de cadastro. Tente novamente mais tarde.' },
});
app.use('/api/auth/register', registerLimiter);
// Light rate limit for other auth routes (refresh, logout, me, profile)
const authLightLimiter = (0, express_rate_limit_1.default)({
    windowMs: 60 * 1000,
    max: 30,
    standardHeaders: true,
    legacyHeaders: false,
});
app.use('/api/auth', authLightLimiter);
// Parse JSON body
app.use(express_1.default.json({ limit: '10mb' }));
// Make io accessible to routes
app.set('io', io);
// Serve frontend static files (built from frontend/)
const publicPath = path_1.default.join(__dirname, '..', 'public');
app.use(express_1.default.static(publicPath));
// Check for expired trials every 15 minutes
setInterval(async () => {
    try {
        const count = await (0, trial_1.checkAndDisconnectExpiredTrials)();
        if (count > 0) {
            console.log(`[Cron] Auto-disconnected ${count} expired trial(s)`);
        }
    }
    catch (error) {
        console.error('[Cron] Trial check failed:', error);
    }
}, 15 * 60 * 1000);
// Migrate existing users and check expired trials before handling requests
(async () => {
    try {
        const migrated = await (0, trial_1.migrateExistingUsersWithoutTrial)();
        if (migrated > 0) {
            console.log(`[Trial] Migrated ${migrated} existing users with 7-day trial`);
        }
    }
    catch (err) {
        console.error('[Trial] Migration failed:', err);
    }
    try {
        const expired = await (0, trial_1.checkAndDisconnectExpiredTrials)();
        if (expired > 0) {
            console.log(`[Cron] Found ${expired} expired trial(s)`);
        }
    }
    catch (err) {
        console.error('[Cron] Trial check failed:', err);
    }
})();
// ─── Database setup (async, non-blocking) ───────────────────
function runMigrationsAndSeed(maxRetries = 3) {
    // Run prisma db push in background (non-blocking)
    (0, child_process_1.exec)('npx prisma db push --accept-data-loss 2>&1', (err, stdout) => {
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
        (0, child_process_1.exec)('npx tsx prisma/seed.ts 2>&1', (err2) => {
            if (err2) {
                console.log('[DB] ⚠️ Seed may have already run, continuing...');
            }
            else {
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
app.use('/api/webhook', whatsapp_1.webhookRouter);
app.use('/api/webhook', payments_1.paymentWebhookRouter);
// Routes
app.use('/api/auth', auth_1.default);
app.use('/api/users', users_1.default);
app.use('/api/whatsapp', whatsapp_1.default);
app.use('/api/conversations', conversations_1.default);
app.use('/api/flows', flows_1.default);
app.use('/api/crm', crm_1.default);
app.use('/api/campaigns', campaigns_1.default);
app.use('/api/dashboard', dashboard_1.default);
app.use('/api/webhooks', webhooks_1.default);
app.use('/api/remarketing', remarketing_1.default);
app.use('/api/knowledge-base', knowledge_base_1.default);
app.use('/api/tracking', tracking_1.default);
app.use('/api/payments', payments_1.default);
// SPA fallback — all non-API routes serve index.html
app.get('*', (_req, res) => {
    res.sendFile(path_1.default.join(publicPath, 'index.html'));
});
// Only start the server when NOT running on Vercel (serverless)
if (!process.env.VERCEL) {
    httpServer.listen(PORT, () => {
        console.log(`\n🚀 ZapFlow Backend running on http://localhost:${PORT}`);
        console.log(`📡 WebSocket ready`);
        console.log(`🌐 Serving frontend from ${publicPath}\n`);
    });
}
exports.default = app;
//# sourceMappingURL=index.js.map