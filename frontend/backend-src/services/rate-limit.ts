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

// ─── Configuration ─────────────────────────────────────

/** Max failed attempts before lockout */
const MAX_ATTEMPTS = 5;

/** Lockout duration in ms (15 minutes) */
const LOCKOUT_DURATION_MS = 15 * 60 * 1000;

/** How often to clean up expired entries (5 minutes) */
const CLEANUP_INTERVAL_MS = 5 * 60 * 1000;

/** Max stored entries before cleanup triggers automatically */
const MAX_STORED_ENTRIES = 10000;

// ─── Types ──────────────────────────────────────────────

interface AttemptRecord {
  count: number;
  firstAttempt: number; // timestamp
  lockedUntil: number | null; // timestamp or null if not locked
}

// ─── In-Memory Store ───────────────────────────────────

const store = new Map<string, AttemptRecord>();

// Periodic cleanup to prevent memory leaks
const cleanupTimer = setInterval(() => {
  const now = Date.now();
  let deleted = 0;

  for (const [key, record] of store.entries()) {
    // Remove entries that are past lockout AND older than 1 hour
    if (!record.lockedUntil && (now - record.firstAttempt) > 3600000) {
      store.delete(key);
      deleted++;
    }
    // Remove entries where lockout has expired
    if (record.lockedUntil && record.lockedUntil < now) {
      store.delete(key);
      deleted++;
    }
  }

  if (deleted > 0) {
    console.log(`[RateLimit] Cleaned up ${deleted} expired attempt records`);
  }
}, CLEANUP_INTERVAL_MS);

// Prevent the timer from keeping the process alive in tests
if (process.env.NODE_ENV === 'test') {
  cleanupTimer.unref();
}

// ─── Public API ────────────────────────────────────────

/**
 * Check if a login attempt is allowed for the given IP + email.
 *
 * Returns:
 * - allowed: true if the attempt is allowed
 * - remaining: number of attempts remaining before lockout
 * - lockedUntil: timestamp when the lockout expires (null if not locked)
 * - retryAfterSeconds: seconds to wait before next attempt (only when locked)
 */
export function checkLoginAttempt(ip: string, email: string): {
  allowed: boolean;
  remaining: number;
  lockedUntil: number | null;
  retryAfterSeconds: number;
} {
  const key = `${ip}:${email.toLowerCase()}`;
  const now = Date.now();
  const record = store.get(key);

  // No prior attempts — allowed
  if (!record) {
    return { allowed: true, remaining: MAX_ATTEMPTS, lockedUntil: null, retryAfterSeconds: 0 };
  }

  // Currently locked
  if (record.lockedUntil && record.lockedUntil > now) {
    const remainingMs = record.lockedUntil - now;
    return {
      allowed: false,
      remaining: 0,
      lockedUntil: record.lockedUntil,
      retryAfterSeconds: Math.ceil(remainingMs / 1000),
    };
  }

  // Lock expired — reset and allow
  if (record.lockedUntil && record.lockedUntil <= now) {
    store.delete(key);
    return { allowed: true, remaining: MAX_ATTEMPTS, lockedUntil: null, retryAfterSeconds: 0 };
  }

  // Within attempt window
  const remaining = MAX_ATTEMPTS - record.count;
  if (remaining <= 0) {
    // Lock the account
    const lockedUntil = now + LOCKOUT_DURATION_MS;
    store.set(key, { ...record, lockedUntil });
    return {
      allowed: false,
      remaining: 0,
      lockedUntil,
      retryAfterSeconds: Math.ceil(LOCKOUT_DURATION_MS / 1000),
    };
  }

  return { allowed: true, remaining, lockedUntil: null, retryAfterSeconds: 0 };
}

/**
 * Record a failed login attempt for the given IP + email.
 */
export function recordFailedAttempt(ip: string, email: string): void {
  const key = `${ip}:${email.toLowerCase()}`;
  const now = Date.now();
  const existing = store.get(key);

  if (existing) {
    store.set(key, {
      count: existing.count + 1,
      firstAttempt: existing.firstAttempt,
      lockedUntil: existing.lockedUntil,
    });
  } else {
    store.set(key, { count: 1, firstAttempt: now, lockedUntil: null });
  }

  // Prevent memory leak — if store grows too large, trim aggressively
  if (store.size > MAX_STORED_ENTRIES) {
    const entries = [...store.entries()];
    // Keep only the most recent 5000 entries
    const toDelete = entries.slice(0, entries.length - 5000);
    for (const [key] of toDelete) {
      store.delete(key);
    }
    console.warn(`[RateLimit] Store exceeded ${MAX_STORED_ENTRIES} entries, trimmed to 5000`);
  }
}

/**
 * Clear failed attempts for the given IP + email (called on successful login).
 */
export function clearLoginAttempts(ip: string, email: string): void {
  const key = `${ip}:${email.toLowerCase()}`;
  store.delete(key);
}

/**
 * Register-specific rate limit (in-memory counter by IP).
 * Prevents rapid-fire account creation from the same IP.
 */
const registerStore = new Map<string, { count: number; firstAttempt: number }>();

const REGISTER_MAX = 3; // max registrations per IP
const REGISTER_WINDOW_MS = 3600000; // 1 hour window

/** Check if registration is allowed from this IP */
export function checkRegisterAllowed(ip: string): { allowed: boolean; retryAfterSeconds: number } {
  const now = Date.now();
  const record = registerStore.get(ip);

  if (!record) {
    return { allowed: true, retryAfterSeconds: 0 };
  }

  // Outside window — reset
  if (now - record.firstAttempt > REGISTER_WINDOW_MS) {
    registerStore.delete(ip);
    return { allowed: true, retryAfterSeconds: 0 };
  }

  if (record.count >= REGISTER_MAX) {
    const remainingMs = REGISTER_WINDOW_MS - (now - record.firstAttempt);
    return { allowed: false, retryAfterSeconds: Math.ceil(remainingMs / 1000) };
  }

  return { allowed: true, retryAfterSeconds: 0 };
}

/** Record a registration attempt from this IP */
export function recordRegisterAttempt(ip: string): void {
  const now = Date.now();
  const existing = registerStore.get(ip);

  if (existing) {
    registerStore.set(ip, { count: existing.count + 1, firstAttempt: existing.firstAttempt });
  } else {
    registerStore.set(ip, { count: 1, firstAttempt: now });
  }
}

/**
 * Graceful shutdown — clear timers
 */
export function shutdown(): void {
  clearInterval(cleanupTimer);
}
