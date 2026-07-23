"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const database_1 = __importDefault(require("../config/database"));
const auth_1 = require("../middleware/auth");
const payment_1 = require("../services/payment");
const rate_limit_1 = require("../middleware/rate-limit");
const rate_limit_2 = require("../services/rate-limit");
const trial_1 = require("../services/trial");
const router = (0, express_1.Router)();
// ─── Helper: build user response (no password) ──────────
function buildUserResponse(user) {
    return {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        plan: user.plan,
        avatar: user.avatar,
        phone: user.phone,
        organization: user.organization
            ? { id: user.organization.id, name: user.organization.name, plan: user.organization.plan }
            : null,
    };
}
// ─── Helper: set auth cookies and return tokens ──
async function setAuthCookies(user, res) {
    const payload = {
        userId: user.id,
        email: user.email,
        role: user.role,
    };
    const accessToken = (0, auth_1.generateToken)(payload);
    const refreshToken = await (0, auth_1.generateRefreshToken)(payload, res);
    (0, auth_1.setAccessTokenCookie)(res, accessToken);
    return { accessToken, refreshToken };
}
// POST /api/auth/register — with IP-based rate limit
router.post('/register', rate_limit_1.registerRateLimit, async (req, res) => {
    const ip = req.ip || req.socket.remoteAddress || 'unknown';
    try {
        const { name, email, password, organizationName, paymentId } = req.body;
        if (!name || !email || !password) {
            res.status(400).json({ error: 'Nome, email e senha são obrigatórios' });
            return;
        }
        const existing = await database_1.default.user.findUnique({ where: { email } });
        if (existing) {
            res.status(409).json({ error: 'Email já cadastrado' });
            return;
        }
        const hashedPassword = await bcryptjs_1.default.hash(password, 12);
        // Create organization (always create an org for every user)
        const org = await database_1.default.organization.create({
            data: { name: organizationName || `${name}'s Organization` },
        });
        const organizationId = org.id;
        const user = await database_1.default.user.create({
            data: {
                name,
                email,
                password: hashedPassword,
                role: 'OWNER',
                plan: 'FREE',
                organizationId,
            },
        });
        // If paymentId was provided, try to link a public checkout payment
        let linkedPlan;
        if (paymentId) {
            const linkResult = await (0, payment_1.linkPaymentToUser)({
                paymentId,
                organizationId,
                userId: user.id,
                userEmail: email,
            });
            if (linkResult?.linked) {
                linkedPlan = linkResult.plan;
                console.log(`[Auth] User ${user.email} linked to payment ${paymentId}, plan=${linkResult.plan}`);
            }
        }
        // Start 7-day free trial for new users (only if no payment was linked)
        if (!paymentId) {
            await (0, trial_1.startUserTrial)(user.id);
        }
        // Record successful registration for rate limiting
        (0, rate_limit_2.recordRegisterAttempt)(ip);
        // Re-fetch user to get updated plan (from payment linking) and organization relation
        const freshUser = await database_1.default.user.findUnique({
            where: { id: user.id },
            include: { organization: true },
        });
        if (!freshUser) {
            // Should never happen, but handle gracefully
            res.status(500).json({ error: 'Erro ao criar conta' });
            return;
        }
        // Set httpOnly cookies + return tokens in body (for Railway proxy that strips cookies)
        const { accessToken, refreshToken } = await setAuthCookies(freshUser, res);
        res.status(201).json({
            token: accessToken,
            refreshToken,
            user: buildUserResponse(freshUser),
        });
    }
    catch (error) {
        console.error('Register error:', error);
        res.status(500).json({ error: 'Erro ao criar conta' });
    }
});
// POST /api/auth/login — with brute force protection
router.post('/login', rate_limit_1.bruteForceProtection, async (req, res) => {
    const ip = req.ip || req.socket.remoteAddress || 'unknown';
    const { email, password } = req.body;
    if (!email || !password) {
        res.status(400).json({ error: 'Email e senha são obrigatórios' });
        return;
    }
    try {
        const user = await database_1.default.user.findUnique({
            where: { email },
            include: { organization: true },
        });
        // Use same error message for non-existent user and wrong password
        // This prevents user enumeration via timing/oracle attacks
        const fakeHash = '$2a$12$00000000000000000000000000000000000000000000000'; // 60 chars
        if (!user) {
            // Record failed attempt even for non-existent emails to prevent enumeration
            (0, rate_limit_2.recordFailedAttempt)(ip, email);
            // Simulate bcrypt work factor to prevent timing-based user enumeration
            try {
                await bcryptjs_1.default.compare(password, fakeHash);
            }
            catch {
                // Ignore bcrypt errors on fake hash — we just need the delay
            }
            res.status(401).json({ error: 'Credenciais inválidas' });
            return;
        }
        const valid = await bcryptjs_1.default.compare(password, user.password);
        if (!valid) {
            (0, rate_limit_2.recordFailedAttempt)(ip, email);
            res.status(401).json({ error: 'Credenciais inválidas' });
            return;
        }
        // Successful login — clear failed attempts
        (0, rate_limit_2.clearLoginAttempts)(ip, email);
        // Set httpOnly cookies + return tokens in body (for Railway proxy that strips cookies)
        const { accessToken, refreshToken } = await setAuthCookies(user, res);
        res.json({
            token: accessToken,
            refreshToken,
            user: buildUserResponse(user),
        });
    }
    catch (error) {
        console.error('Login error:', error);
        res.status(500).json({ error: 'Erro ao fazer login' });
    }
});
// POST /api/auth/refresh — Refresh access token
// Tries httpOnly cookie first, then falls back to request body (for Railway proxy that strips cookies)
router.post('/refresh', async (req, res) => {
    try {
        // Try cookie first (local dev), fallback to body (production/Railway)
        const refreshTokenStr = req.cookies?.zapflow_refresh_token || req.body?.refreshToken;
        const { valid, userId, tokenRecord } = await (0, auth_1.validateRefreshToken)(refreshTokenStr);
        if (!valid || !userId) {
            (0, auth_1.clearAuthCookies)(res);
            res.status(401).json({ error: 'Sessão expirada. Faça login novamente.' });
            return;
        }
        // Fetch fresh user data for the new token
        const user = await database_1.default.user.findUnique({
            where: { id: userId },
            include: { organization: true },
        });
        if (!user) {
            (0, auth_1.clearAuthCookies)(res);
            res.status(401).json({ error: 'Usuário não encontrado' });
            return;
        }
        // Issue new tokens (rotate refresh token)
        const newPayload = {
            userId: user.id,
            email: user.email,
            role: user.role,
        };
        const accessToken = (0, auth_1.generateToken)(newPayload);
        (0, auth_1.setAccessTokenCookie)(res, accessToken);
        const newRefreshToken = await (0, auth_1.generateRefreshToken)(newPayload, res, {
            oldTokenId: tokenRecord?.id,
        });
        res.json({
            token: accessToken,
            refreshToken: newRefreshToken,
            user: buildUserResponse(user),
        });
    }
    catch (error) {
        console.error('Refresh error:', error);
        (0, auth_1.clearAuthCookies)(res);
        res.status(500).json({ error: 'Erro ao renovar sessão' });
    }
});
// POST /api/auth/logout — Clear cookies and revoke refresh token
router.post('/logout', async (req, res) => {
    try {
        // Try cookie first, fallback to request body
        const refreshTokenStr = req.cookies?.zapflow_refresh_token || req.body?.refreshToken;
        if (refreshTokenStr) {
            // Revoke the refresh token in database
            await database_1.default.refreshToken.updateMany({
                where: { token: refreshTokenStr, revoked: false },
                data: { revoked: true },
            });
        }
        (0, auth_1.clearAuthCookies)(res);
        res.json({ message: 'Sessão encerrada' });
    }
    catch (error) {
        console.error('Logout error:', error);
        (0, auth_1.clearAuthCookies)(res);
        res.json({ message: 'Sessão encerrada' });
    }
});
// GET /api/auth/me — uses authenticate middleware for token verification
router.get('/me', auth_1.authenticate, async (req, res) => {
    try {
        const user = await database_1.default.user.findUnique({
            where: { id: req.user.userId },
            include: { organization: true },
        });
        if (!user) {
            res.status(404).json({ error: 'Usuário não encontrado' });
            return;
        }
        res.json(buildUserResponse(user));
    }
    catch (error) {
        res.status(500).json({ error: 'Erro ao buscar usuário' });
    }
});
// GET /api/auth/trial — status do trial
router.get('/trial', auth_1.authenticate, async (req, res) => {
    try {
        const status = await (0, trial_1.getUserTrialStatus)(req.user.userId);
        res.json(status);
    }
    catch (error) {
        res.status(500).json({ error: 'Erro ao buscar status do trial' });
    }
});
// PUT /api/auth/profile
router.put('/profile', auth_1.authenticate, async (req, res) => {
    try {
        const { name, avatar, phone } = req.body;
        const user = await database_1.default.user.update({
            where: { id: req.user.userId },
            data: { name, avatar, phone },
        });
        res.json({
            id: user.id,
            name: user.name,
            email: user.email,
            role: user.role,
            avatar: user.avatar,
            phone: user.phone,
        });
    }
    catch (error) {
        res.status(500).json({ error: 'Erro ao atualizar perfil' });
    }
});
// GET /api/auth/tour-status - Get tour completion status
router.get('/tour-status', auth_1.authenticate, async (req, res) => {
    try {
        const user = await database_1.default.user.findUnique({
            where: { id: req.user.userId },
            select: { tourDashboardCompleted: true, tourOnboardingCompleted: true },
        });
        if (!user) {
            res.status(404).json({ error: 'Usuário não encontrado' });
            return;
        }
        res.json({
            dashboard: user.tourDashboardCompleted,
            onboarding: user.tourOnboardingCompleted,
        });
    }
    catch (error) {
        console.error('[Tour] Error fetching status:', error);
        res.status(500).json({ error: 'Erro ao buscar status do tour' });
    }
});
// PUT /api/auth/tour-status - Update tour completion status
router.put('/tour-status', auth_1.authenticate, async (req, res) => {
    try {
        const { dashboard, onboarding } = req.body;
        const data = {};
        if (typeof dashboard === 'boolean')
            data.tourDashboardCompleted = dashboard;
        if (typeof onboarding === 'boolean')
            data.tourOnboardingCompleted = onboarding;
        if (Object.keys(data).length === 0) {
            res.status(400).json({ error: 'Envie ao menos um campo: dashboard ou onboarding' });
            return;
        }
        const user = await database_1.default.user.update({
            where: { id: req.user.userId },
            data,
            select: { tourDashboardCompleted: true, tourOnboardingCompleted: true },
        });
        res.json({
            dashboard: user.tourDashboardCompleted,
            onboarding: user.tourOnboardingCompleted,
        });
    }
    catch (error) {
        console.error('[Tour] Error updating status:', error);
        res.status(500).json({ error: 'Erro ao atualizar status do tour' });
    }
});
exports.default = router;
//# sourceMappingURL=auth.js.map