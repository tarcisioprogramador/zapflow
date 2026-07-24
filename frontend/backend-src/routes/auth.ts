import { Router, Response } from 'express';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import prisma from '../config/database';
import {
  authenticate,
  generateToken,
  generateRefreshToken,
  validateRefreshToken,
  setAccessTokenCookie,
  clearAuthCookies,
  REMEMBER_ME_REFRESH_EXPIRY_MS,
} from '../middleware/auth';
import { linkPaymentToUser } from '../services/payment';
import {
  bruteForceProtection,
  registerRateLimit,
} from '../middleware/rate-limit';
import {
  recordFailedAttempt,
  clearLoginAttempts,
  recordRegisterAttempt,
} from '../services/rate-limit';
import { AuthRequest, AuthPayload, UserRole } from '../types';
import { startUserTrial, getUserTrialStatus } from '../services/trial';

const router = Router();

const MIN_PASSWORD_LENGTH = 6;
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PASSWORD_RESET_TOKEN_EXPIRY_MS = 60 * 60 * 1000; // 1 hour

// ─── Validators ────────────────────────────────────────
function validateEmail(email: string): boolean {
  return typeof email === 'string' && EMAIL_REGEX.test(email) && email.length <= 254;
}

function validatePassword(password: string): { valid: boolean; error?: string } {
  if (typeof password !== 'string') return { valid: false, error: 'Senha invalida' };
  if (password.length < MIN_PASSWORD_LENGTH) return { valid: false, error: `Senha deve ter no minimo ${MIN_PASSWORD_LENGTH} caracteres` };
  if (password.length > 128) return { valid: false, error: 'Senha muito longa' };
  return { valid: true };
}

function validateName(name: string): boolean {
  return typeof name === 'string' && name.trim().length >= 2 && name.length <= 100;
}

// ─── Helper: build user response (no password) ──────────
function buildUserResponse(user: any) {
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
async function setAuthCookies(user: any, res: Response, rememberMe = false) {
  const payload: AuthPayload = {
    userId: user.id,
    email: user.email,
    role: user.role as UserRole,
  };

  const accessToken = generateToken(payload);
  const refreshToken = await generateRefreshToken(payload, res, { rememberMe });
  setAccessTokenCookie(res, accessToken);

  return { accessToken, refreshToken };
}

// ─── POST /api/auth/register ────────────────────────────
router.post('/register', registerRateLimit, async (req: AuthRequest, res: Response): Promise<void> => {
  const ip = req.ip || req.socket.remoteAddress || 'unknown';

  try {
    const { name, email, password, organizationName, paymentId } = req.body;

    if (!name || !email || !password) {
      res.status(400).json({ error: 'Nome, email e senha sao obrigatorios' });
      return;
    }

    if (!validateName(name)) {
      res.status(400).json({ error: 'Nome invalido (2-100 caracteres)' });
      return;
    }

    if (!validateEmail(email)) {
      res.status(400).json({ error: 'Email invalido' });
      return;
    }

    const passwordCheck = validatePassword(password);
    if (!passwordCheck.valid) {
      res.status(400).json({ error: passwordCheck.error });
      return;
    }

    const normalizedEmail = email.toLowerCase().trim();

    const existing = await prisma.user.findUnique({ where: { email: normalizedEmail } });
    if (existing) {
      res.status(409).json({ error: 'Email ja cadastrado' });
      return;
    }

    const hashedPassword = await bcrypt.hash(password, 12);

    const org = await prisma.organization.create({
      data: { name: organizationName || `${name}'s Organization` },
    });

    const user = await prisma.user.create({
      data: {
        name: name.trim(),
        email: normalizedEmail,
        password: hashedPassword,
        role: 'OWNER',
        plan: 'FREE',
        organizationId: org.id,
      },
    });

    let linkedPlan: string | undefined;
    if (paymentId) {
      const linkResult = await linkPaymentToUser({
        paymentId,
        organizationId: org.id,
        userId: user.id,
        userEmail: normalizedEmail,
      });

      if (linkResult?.linked) {
        linkedPlan = linkResult.plan;
        console.log(`[Auth] User ${user.email} linked to payment ${paymentId}, plan=${linkResult.plan}`);
      }
    }

    if (!paymentId) {
      await startUserTrial(user.id);
    }

    recordRegisterAttempt(ip);

    const freshUser = await prisma.user.findUnique({
      where: { id: user.id },
      include: { organization: true },
    });

    if (!freshUser) {
      res.status(500).json({ error: 'Erro ao criar conta' });
      return;
    }

    const { accessToken, refreshToken } = await setAuthCookies(freshUser, res);

    res.status(201).json({
      token: accessToken,
      refreshToken,
      user: buildUserResponse(freshUser),
    });
  } catch (error) {
    console.error('[Auth] Register error:', error);
    res.status(500).json({ error: 'Erro ao criar conta' });
  }
});

// ─── POST /api/auth/login ──────────────────────────────
router.post('/login', bruteForceProtection, async (req: AuthRequest, res: Response): Promise<void> => {
  const ip = req.ip || req.socket.remoteAddress || 'unknown';
  const { email, password, rememberMe } = req.body;

  if (!email || !password) {
    res.status(400).json({ error: 'Email e senha sao obrigatorios' });
    return;
  }

  if (!validateEmail(email)) {
    res.status(400).json({ error: 'Email invalido' });
    return;
  }

  try {
    const normalizedEmail = email.toLowerCase().trim();

    const user = await prisma.user.findUnique({
      where: { email: normalizedEmail },
      include: { organization: true },
    });

    const fakeHash = '$2a$12$00000000000000000000000000000000000000000000000';

    if (!user) {
      recordFailedAttempt(ip, normalizedEmail);
      try { await bcrypt.compare(password, fakeHash); } catch { /* timing decoy */ }
      res.status(401).json({ error: 'Credenciais invalidas' });
      return;
    }

    const valid = await bcrypt.compare(password, user.password);
    if (!valid) {
      recordFailedAttempt(ip, normalizedEmail);
      res.status(401).json({ error: 'Credenciais invalidas' });
      return;
    }

    clearLoginAttempts(ip, normalizedEmail);

    const { accessToken, refreshToken } = await setAuthCookies(user, res, !!rememberMe);

    console.log(`[Auth] Login successful: ${normalizedEmail} from ${ip}`);

    res.json({
      token: accessToken,
      refreshToken,
      user: buildUserResponse(user),
    });
  } catch (error) {
    console.error('[Auth] Login error:', error);
    res.status(500).json({ error: 'Erro ao fazer login' });
  }
});

// ─── POST /api/auth/forgot-password ────────────────────
router.post('/forgot-password', async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { email } = req.body;

    if (!email || !validateEmail(email)) {
      res.status(400).json({ error: 'Email invalido' });
      return;
    }

    const normalizedEmail = email.toLowerCase().trim();
    const user = await prisma.user.findUnique({ where: { email: normalizedEmail } });

    // Always return success to prevent email enumeration
    if (!user) {
      res.json({ message: 'Se o email estiver cadastrado, voce recebera um link de redefinicao.' });
      return;
    }

    // Generate secure reset token
    const resetToken = crypto.randomBytes(32).toString('hex');
    const resetTokenHash = crypto.createHash('sha256').update(resetToken).digest('hex');
    const expiresAt = new Date(Date.now() + PASSWORD_RESET_TOKEN_EXPIRY_MS);

    // Store hashed token (never store raw token in DB)
    await prisma.passwordResetToken.create({
      data: {
        token: resetTokenHash,
        userId: user.id,
        expiresAt,
      },
    });

    // In production, send email here. For now, log the reset link.
    const resetUrl = `${process.env.FRONTEND_URL || 'http://localhost:5173'}/reset-password?token=${resetToken}`;
    console.log(`[Auth] Password reset for ${normalizedEmail}: ${resetUrl}`);

    res.json({ message: 'Se o email estiver cadastrado, voce recebera um link de redefinicao.' });
  } catch (error) {
    console.error('[Auth] Forgot password error:', error);
    res.json({ message: 'Se o email estiver cadastrado, voce recebera um link de redefinicao.' });
  }
});

// ─── POST /api/auth/reset-password ─────────────────────
router.post('/reset-password', async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { token, password } = req.body;

    if (!token || !password) {
      res.status(400).json({ error: 'Token e nova senha sao obrigatorios' });
      return;
    }

    const passwordCheck = validatePassword(password);
    if (!passwordCheck.valid) {
      res.status(400).json({ error: passwordCheck.error });
      return;
    }

    const resetTokenHash = crypto.createHash('sha256').update(token).digest('hex');

    const record = await prisma.passwordResetToken.findUnique({
      where: { token: resetTokenHash },
    });

    if (!record || record.used || record.expiresAt < new Date()) {
      res.status(400).json({ error: 'Token invalido ou expirado' });
      return;
    }

    const hashedPassword = await bcrypt.hash(password, 12);

    await prisma.user.update({
      where: { id: record.userId },
      data: { password: hashedPassword },
    });

    await prisma.passwordResetToken.update({
      where: { id: record.id },
      data: { used: true },
    });

    // Revoke all existing refresh tokens for this user (force re-login everywhere)
    await prisma.refreshToken.updateMany({
      where: { userId: record.userId, revoked: false },
      data: { revoked: true },
    });

    console.log(`[Auth] Password reset completed for user ${record.userId}`);

    res.json({ message: 'Senha redefinida com sucesso. Faca login com sua nova senha.' });
  } catch (error) {
    console.error('[Auth] Reset password error:', error);
    res.status(500).json({ error: 'Erro ao redefinir senha' });
  }
});

// ─── POST /api/auth/refresh ────────────────────────────
router.post('/refresh', async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const refreshTokenStr = req.cookies?.zapflow_refresh_token || req.body?.refreshToken;
    const { valid, userId, tokenRecord } = await validateRefreshToken(refreshTokenStr);

    if (!valid || !userId) {
      clearAuthCookies(res);
      res.status(401).json({ error: 'Sessao expirada. Faca login novamente.' });
      return;
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: { organization: true },
    });

    if (!user) {
      clearAuthCookies(res);
      res.status(401).json({ error: 'Usuario nao encontrado' });
      return;
    }

    const newPayload: AuthPayload = {
      userId: user.id,
      email: user.email,
      role: user.role as UserRole,
    };

    const accessToken = generateToken(newPayload);
    setAccessTokenCookie(res, accessToken);

    const newRefreshToken = await generateRefreshToken(newPayload, res, {
      oldTokenId: tokenRecord?.id,
    });

    res.json({
      token: accessToken,
      refreshToken: newRefreshToken,
      user: buildUserResponse(user),
    });
  } catch (error) {
    console.error('[Auth] Refresh error:', error);
    clearAuthCookies(res);
    res.status(500).json({ error: 'Erro ao renovar sessao' });
  }
});

// ─── POST /api/auth/logout ─────────────────────────────
router.post('/logout', async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const refreshTokenStr = req.cookies?.zapflow_refresh_token || req.body?.refreshToken;

    if (refreshTokenStr) {
      await prisma.refreshToken.updateMany({
        where: { token: refreshTokenStr, revoked: false },
        data: { revoked: true },
      });
    }

    clearAuthCookies(res);
    res.json({ message: 'Sessao encerrada' });
  } catch (error) {
    console.error('[Auth] Logout error:', error);
    clearAuthCookies(res);
    res.json({ message: 'Sessao encerrada' });
  }
});

// ─── GET /api/auth/me ──────────────────────────────────
router.get('/me', authenticate, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user!.userId },
      include: { organization: true },
    });

    if (!user) {
      res.status(404).json({ error: 'Usuario nao encontrado' });
      return;
    }

    res.json(buildUserResponse(user));
  } catch (error) {
    res.status(500).json({ error: 'Erro ao buscar usuario' });
  }
});

// ─── GET /api/auth/trial ───────────────────────────────
router.get('/trial', authenticate, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const status = await getUserTrialStatus(req.user!.userId);
    res.json(status);
  } catch (error) {
    res.status(500).json({ error: 'Erro ao buscar status do trial' });
  }
});

// ─── PUT /api/auth/profile ─────────────────────────────
router.put('/profile', authenticate, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { name, avatar, phone } = req.body;

    const user = await prisma.user.update({
      where: { id: req.user!.userId },
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
  } catch (error) {
    res.status(500).json({ error: 'Erro ao atualizar perfil' });
  }
});

// ─── GET /api/auth/tour-status ─────────────────────────
router.get('/tour-status', authenticate, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user!.userId },
      select: { tourDashboardCompleted: true, tourOnboardingCompleted: true },
    });

    if (!user) {
      res.status(404).json({ error: 'Usuario nao encontrado' });
      return;
    }

    res.json({
      dashboard: user.tourDashboardCompleted,
      onboarding: user.tourOnboardingCompleted,
    });
  } catch (error) {
    console.error('[Tour] Error fetching status:', error);
    res.status(500).json({ error: 'Erro ao buscar status do tour' });
  }
});

// ─── PUT /api/auth/tour-status ─────────────────────────
router.put('/tour-status', authenticate, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { dashboard, onboarding } = req.body;

    const data: any = {};
    if (typeof dashboard === 'boolean') data.tourDashboardCompleted = dashboard;
    if (typeof onboarding === 'boolean') data.tourOnboardingCompleted = onboarding;

    if (Object.keys(data).length === 0) {
      res.status(400).json({ error: 'Envie ao menos um campo: dashboard ou onboarding' });
      return;
    }

    const user = await prisma.user.update({
      where: { id: req.user!.userId },
      data,
      select: { tourDashboardCompleted: true, tourOnboardingCompleted: true },
    });

    res.json({
      dashboard: user.tourDashboardCompleted,
      onboarding: user.tourOnboardingCompleted,
    });
  } catch (error) {
    console.error('[Tour] Error updating status:', error);
    res.status(500).json({ error: 'Erro ao atualizar status do tour' });
  }
});

export default router;
