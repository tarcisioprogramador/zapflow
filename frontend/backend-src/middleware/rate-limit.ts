import { Response, NextFunction } from 'express';
import { AuthRequest } from '../types';
import {
  checkLoginAttempt,
  recordFailedAttempt,
  clearLoginAttempts,
  checkRegisterAllowed,
  recordRegisterAttempt,
} from '../services/rate-limit';

/**
 * Brute force protection middleware for login routes.
 *
 * - Tracks failed attempts by IP + email combination
 * - Locks out after 5 failed attempts (15 min cooldown)
 * - Clears on successful login
 * - Prevents both credential stuffing and brute force
 *
 * Usage: Apply to POST /auth/login before the main handler.
 * On failure, the route handler should call recordFailedAttempt() before returning error.
 * On success, the route handler should call clearLoginAttempts().
 */
export function bruteForceProtection(req: AuthRequest, res: Response, next: NextFunction): void {
  const ip = req.ip || req.socket.remoteAddress || 'unknown';
  const email = req.body?.email;

  if (!email) {
    // No email in body — let the route handler return validation error
    next();
    return;
  }

  const result = checkLoginAttempt(ip, email);

  if (!result.allowed) {
    res.status(429).json({
      error: `Muitas tentativas de login. Tente novamente em ${result.retryAfterSeconds} segundos.`,
      retryAfterSeconds: result.retryAfterSeconds,
      locked: true,
    });
    return;
  }

  // Attach remaining attempts to request for logging
  (req as any)._loginRemaining = result.remaining;

  next();
}

/**
 * Rate limit middleware for registration (by IP).
 *
 * - Max 3 registrations per IP per hour
 * - Prevents bulk account creation (spam / abuse)
 */
export function registerRateLimit(req: AuthRequest, res: Response, next: NextFunction): void {
  const ip = req.ip || req.socket.remoteAddress || 'unknown';

  const result = checkRegisterAllowed(ip);

  if (!result.allowed) {
    const hours = Math.ceil(result.retryAfterSeconds / 3600);
    res.status(429).json({
      error: `Limite de cadastros atingido para este IP. Tente novamente em ${hours} hora(s).`,
      retryAfterSeconds: result.retryAfterSeconds,
    });
    return;
  }

  next();
}
