import { Router, Response } from 'express';
import bcrypt from 'bcryptjs';
import prisma from '../config/database';
import {
  authenticate,
  generateToken,
  generateRefreshToken,
  validateRefreshToken,
  setAccessTokenCookie,
  clearAuthCookies,
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
async function setAuthCookies(user: any, res: Response) {
  const payload: AuthPayload = {
    userId: user.id,
    email: user.email,
    role: user.role as UserRole,
  };

  const accessToken = generateToken(payload);
  const refreshToken = await generateRefreshToken(payload, res);
  setAccessTokenCookie(res, accessToken);

  return { accessToken, refreshToken };
}

// POST /api/auth/register — with IP-based rate limit
router.post('/register', registerRateLimit, async (req: AuthRequest, res: Response): Promise<void> => {
  const ip = req.ip || req.socket.remoteAddress || 'unknown';

  try {
    const { name, email, password, organizationName, paymentId } = req.body;

    if (!name || !email || !password) {
      res.status(400).json({ error: 'Nome, email e senha são obrigatórios' });
      return;
    }

    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      res.status(409).json({ error: 'Email já cadastrado' });
      return;
    }

    const hashedPassword = await bcrypt.hash(password, 12);

    // Create organization (always create an org for every user)
    const org = await prisma.organization.create({
      data: { name: organizationName || `${name}'s Organization` },
    });
    const organizationId = org.id;

    const user = await prisma.user.create({
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
    let linkedPlan: string | undefined;
    if (paymentId) {
      const linkResult = await linkPaymentToUser({
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
      await startUserTrial(user.id);
    }

    // Record successful registration for rate limiting
    recordRegisterAttempt(ip);

    // Re-fetch user to get updated plan (from payment linking) and organization relation
    const freshUser = await prisma.user.findUnique({
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
  } catch (error) {
    console.error('Register error:', error);
    res.status(500).json({ error: 'Erro ao criar conta' });
  }
});

// POST /api/auth/login — with brute force protection
router.post('/login', bruteForceProtection, async (req: AuthRequest, res: Response): Promise<void> => {
  const ip = req.ip || req.socket.remoteAddress || 'unknown';
  const { email, password } = req.body;

  if (!email || !password) {
    res.status(400).json({ error: 'Email e senha são obrigatórios' });
    return;
  }

  try {
    const user = await prisma.user.findUnique({
      where: { email },
      include: { organization: true },
    });

    // Use same error message for non-existent user and wrong password
    // This prevents user enumeration via timing/oracle attacks
    const fakeHash = '$2a$12$00000000000000000000000000000000000000000000000'; // 60 chars

    if (!user) {
      // Record failed attempt even for non-existent emails to prevent enumeration
      recordFailedAttempt(ip, email);
      // Simulate bcrypt work factor to prevent timing-based user enumeration
      try {
        await bcrypt.compare(password, fakeHash);
      } catch {
        // Ignore bcrypt errors on fake hash — we just need the delay
      }
      res.status(401).json({ error: 'Credenciais inválidas' });
      return;
    }

    const valid = await bcrypt.compare(password, user.password);
    if (!valid) {
      recordFailedAttempt(ip, email);
      res.status(401).json({ error: 'Credenciais inválidas' });
      return;
    }

    // Successful login — clear failed attempts
    clearLoginAttempts(ip, email);

    // Set httpOnly cookies + return tokens in body (for Railway proxy that strips cookies)
    const { accessToken, refreshToken } = await setAuthCookies(user, res);

    res.json({
      token: accessToken,
      refreshToken,
      user: buildUserResponse(user),
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Erro ao fazer login' });
  }
});

// POST /api/auth/refresh — Refresh access token
// Tries httpOnly cookie first, then falls back to request body (for Railway proxy that strips cookies)
router.post('/refresh', async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    // Try cookie first (local dev), fallback to body (production/Railway)
    const refreshTokenStr = req.cookies?.zapflow_refresh_token || req.body?.refreshToken;
    const { valid, userId, tokenRecord } = await validateRefreshToken(refreshTokenStr);

    if (!valid || !userId) {
      clearAuthCookies(res);
      res.status(401).json({ error: 'Sessão expirada. Faça login novamente.' });
      return;
    }

    // Fetch fresh user data for the new token
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: { organization: true },
    });

    if (!user) {
      clearAuthCookies(res);
      res.status(401).json({ error: 'Usuário não encontrado' });
      return;
    }

    // Issue new tokens (rotate refresh token)
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
    console.error('Refresh error:', error);
    clearAuthCookies(res);
    res.status(500).json({ error: 'Erro ao renovar sessão' });
  }
});

// POST /api/auth/logout — Clear cookies and revoke refresh token
router.post('/logout', async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    // Try cookie first, fallback to request body
    const refreshTokenStr = req.cookies?.zapflow_refresh_token || req.body?.refreshToken;

    if (refreshTokenStr) {
      // Revoke the refresh token in database
      await prisma.refreshToken.updateMany({
        where: { token: refreshTokenStr, revoked: false },
        data: { revoked: true },
      });
    }

    clearAuthCookies(res);
    res.json({ message: 'Sessão encerrada' });
  } catch (error) {
    console.error('Logout error:', error);
    clearAuthCookies(res);
    res.json({ message: 'Sessão encerrada' });
  }
});

// GET /api/auth/me — uses authenticate middleware for token verification
router.get('/me', authenticate, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user!.userId },
      include: { organization: true },
    });

    if (!user) {
      res.status(404).json({ error: 'Usuário não encontrado' });
      return;
    }

    res.json(buildUserResponse(user));
  } catch (error) {
    res.status(500).json({ error: 'Erro ao buscar usuário' });
  }
});

// GET /api/auth/trial — status do trial
router.get('/trial', authenticate, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const status = await getUserTrialStatus(req.user!.userId);
    res.json(status);
  } catch (error) {
    res.status(500).json({ error: 'Erro ao buscar status do trial' });
  }
});

// PUT /api/auth/profile
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

// GET /api/auth/tour-status - Get tour completion status
router.get('/tour-status', authenticate, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user!.userId },
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
  } catch (error) {
    console.error('[Tour] Error fetching status:', error);
    res.status(500).json({ error: 'Erro ao buscar status do tour' });
  }
});

// PUT /api/auth/tour-status - Update tour completion status
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
