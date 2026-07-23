/**
 * Brute Force Protection Service
 *
 * Tracks failed login attempts per IP + email combination.
 * After MAX_ATTEMPTS failed tries, the account+IP is locked for LOCKOUT_DURATION_MS.
 *
 * Uses in-memory Map (production should use Redis for horizontal scaling).
 *
 * Architecture:
 * - Key: "ip:email" (e.g., "192.168.1.1:admin@zapflow.com")
 * - Value: { count, firstAttempt, lockedUntil }
 * - After successful login: clear the key
 * - After MAX_ATTEMPTS failures: lock until (now + LOCKOUT_DURATION_MS)
 */
/**
 * Check if a login attempt is allowed for the given IP + email.
 *
 * Returns:
 * - allowed: true if the attempt is allowed
 * - remaining: number of attempts remaining before lockout
 * - lockedUntil: timestamp when the lockout expires (null if not locked)
 * - retryAfterSeconds: seconds to wait before next attempt (only when locked)
 */
export declare function checkLoginAttempt(ip: string, email: string): {
    allowed: boolean;
    remaining: number;
    lockedUntil: number | null;
    retryAfterSeconds: number;
};
/**
 * Record a failed login attempt for the given IP + email.
 */
export declare function recordFailedAttempt(ip: string, email: string): void;
/**
 * Clear failed attempts for the given IP + email (called on successful login).
 */
export declare function clearLoginAttempts(ip: string, email: string): void;
/** Check if registration is allowed from this IP */
export declare function checkRegisterAllowed(ip: string): {
    allowed: boolean;
    retryAfterSeconds: number;
};
/** Record a registration attempt from this IP */
export declare function recordRegisterAttempt(ip: string): void;
/**
 * Graceful shutdown — clear timers
 */
export declare function shutdown(): void;
//# sourceMappingURL=rate-limit.d.ts.map