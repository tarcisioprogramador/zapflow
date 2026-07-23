import { Response, NextFunction } from 'express';
import { AuthRequest } from '../types';
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
export declare function bruteForceProtection(req: AuthRequest, res: Response, next: NextFunction): void;
/**
 * Rate limit middleware for registration (by IP).
 *
 * - Max 3 registrations per IP per hour
 * - Prevents bulk account creation (spam / abuse)
 */
export declare function registerRateLimit(req: AuthRequest, res: Response, next: NextFunction): void;
//# sourceMappingURL=rate-limit.d.ts.map