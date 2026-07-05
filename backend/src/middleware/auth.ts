import { Response, NextFunction, CookieOptions } from 'express';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import prisma from '../config/database';
import { AuthRequest, AuthPayload, UserRole } from '../types';

const JWT_SECRET_ENV = process.env.JWT_SECRET;
if (!JWT_SECRET_ENV || JWT_SECRET_ENV === 'secret' || JWT_SECRET_ENV === 'change-me-to-a-random-secret') {
  console.error('[Auth] JWT_SECRET não configurado ou está usando o valor padrão!');
  if (process.env.NODE_ENV === 'production') {
    throw new Error('JWT_SECRET não configurado. O aplicativo não pode iniciar em produção sem uma chave JWT segura.');
  }
}
const JWT_SECRET = JWT_SECRET_ENV || 'insecure-dev-fallback';

// ─── Cookie helpers ─────────────────────────────────────

const isProduction = process.env.NODE_ENV === 'production';

const REFRESH_TOKEN_COOKIE = 'zapflow_refresh_token';
const ACCESS_TOKEN_COOKIE = 'zapflow_access_token';

/** Default cookie options for httpOnly auth cookies */
export const AUTH_COOKIE_OPTIONS: CookieOptions = {
  httpOnly: true,
  secure: isProduction,
  sameSite: isProduction ? 'none' : 'lax',
  path: '/api',
};

/** Access token lives 15 minutes */
const ACCESS_TOKEN_EXPIRY = '15m';

/** Refresh token lives 7 days */
const REFRESH_TOKEN_EXPIRY_MS = 7 * 24 * 60 * 60 * 1000; // 7 days in ms

// ─── Authentication ─────────────────────────────────────

/**
 * Authenticate a request using either:
 * 1. Cookie-based access token (zapflow_access_token)
 * 2. Authorization: Bearer <token> header (legacy support for API clients)
 */
export function authenticate(req: AuthRequest, res: Response, next: NextFunction): void {
  let token: string | undefined;

  // Try cookie first
  if (req.cookies?.[ACCESS_TOKEN_COOKIE]) {
    token = req.cookies[ACCESS_TOKEN_COOKIE];
  }

  // Fallback to Bearer header (API clients, testing)
  if (!token) {
    const authHeader = req.headers.authorization;
    if (authHeader?.startsWith('Bearer ')) {
      token = authHeader.split(' ')[1];
    }
  }

  if (!token) {
    res.status(401).json({ error: 'Token não fornecido' });
    return;
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET) as AuthPayload;
    req.user = decoded;
    next();
  } catch {
    res.status(401).json({ error: 'Token inválido ou expirado' });
  }
}

// ─── Authorization ──────────────────────────────────────

export function authorize(...roles: UserRole[]) {
  return (req: AuthRequest, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({ error: 'Não autenticado' });
      return;
    }
    if (roles.length > 0 && !roles.includes(req.user.role)) {
      res.status(403).json({ error: 'Sem permissão' });
      return;
    }
    next();
  };
}

// ─── Token Generation ───────────────────────────────────

/** Generate a short-lived access token (15 min) */
export function generateToken(payload: AuthPayload): string {
  return jwt.sign(
    { userId: payload.userId, email: payload.email, role: payload.role },
    JWT_SECRET,
    { expiresIn: ACCESS_TOKEN_EXPIRY }
  );
}

/**
 * Generate a long-lived refresh token, store it in the DB, and set it as httpOnly cookie.
 * If `oldTokenId` is provided, the old refresh token is revoked (rotation).
 * Returns the generated token string so it can also be sent in the response body.
 */
export async function generateRefreshToken(
  payload: AuthPayload,
  res: Response,
  options?: { oldTokenId?: string }
): Promise<string> {
  // Generate a cryptographically random token
  const cookieToken = crypto.randomBytes(40).toString('hex');

  const expiresAt = new Date(Date.now() + REFRESH_TOKEN_EXPIRY_MS);

  // Revoke old refresh token (rotation)
  if (options?.oldTokenId) {
    await prisma.refreshToken.update({
      where: { id: options.oldTokenId },
      data: { revoked: true, replacedBy: cookieToken },
    });
  }

  // Store in database
  await prisma.refreshToken.create({
    data: {
      token: cookieToken,
      userId: payload.userId,
      expiresAt,
    },
  });

  // Set httpOnly cookie (may be stripped by Railway proxy, but kept for local dev)
  res.cookie(REFRESH_TOKEN_COOKIE, cookieToken, {
    ...AUTH_COOKIE_OPTIONS,
    maxAge: REFRESH_TOKEN_EXPIRY_MS,
  });

  return cookieToken;
}

/**
 * Validate a refresh token against the database.
 * Accepts a token string (from cookie or request body).
 * Returns userId and tokenRecord id if valid.
 */
export async function validateRefreshToken(token: string | undefined): Promise<{
  valid: boolean;
  userId?: string;
  tokenRecord?: { id: string };
}> {
  if (!token) {
    return { valid: false };
  }

  try {
    const record = await prisma.refreshToken.findUnique({
      where: { token },
    });

    if (!record || record.revoked || record.expiresAt < new Date()) {
      return { valid: false };
    }

    return {
      valid: true,
      userId: record.userId,
      tokenRecord: { id: record.id },
    };
  } catch {
    return { valid: false };
  }
}

/**
 * Set access token as httpOnly cookie on the response.
 */
export function setAccessTokenCookie(res: Response, token: string): void {
  res.cookie(ACCESS_TOKEN_COOKIE, token, {
    ...AUTH_COOKIE_OPTIONS,
    maxAge: 15 * 60 * 1000, // 15 minutes
  });
}

/**
 * Clear auth cookies (for logout).
 */
export function clearAuthCookies(res: Response): void {
  res.clearCookie(ACCESS_TOKEN_COOKIE, { ...AUTH_COOKIE_OPTIONS });
  res.clearCookie(REFRESH_TOKEN_COOKIE, { ...AUTH_COOKIE_OPTIONS });
}
