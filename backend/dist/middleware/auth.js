"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AUTH_COOKIE_OPTIONS = void 0;
exports.authenticate = authenticate;
exports.authorize = authorize;
exports.generateToken = generateToken;
exports.generateRefreshToken = generateRefreshToken;
exports.validateRefreshToken = validateRefreshToken;
exports.setAccessTokenCookie = setAccessTokenCookie;
exports.clearAuthCookies = clearAuthCookies;
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const crypto_1 = __importDefault(require("crypto"));
const database_1 = __importDefault(require("../config/database"));
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
exports.AUTH_COOKIE_OPTIONS = {
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
function authenticate(req, res, next) {
    let token;
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
        const decoded = jsonwebtoken_1.default.verify(token, JWT_SECRET);
        req.user = decoded;
        next();
    }
    catch {
        res.status(401).json({ error: 'Token inválido ou expirado' });
    }
}
// ─── Authorization ──────────────────────────────────────
function authorize(...roles) {
    return (req, res, next) => {
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
function generateToken(payload) {
    return jsonwebtoken_1.default.sign({ userId: payload.userId, email: payload.email, role: payload.role }, JWT_SECRET, { expiresIn: ACCESS_TOKEN_EXPIRY });
}
/**
 * Generate a long-lived refresh token, store it in the DB, and set it as httpOnly cookie.
 * If `oldTokenId` is provided, the old refresh token is revoked (rotation).
 * Returns the generated token string so it can also be sent in the response body.
 */
async function generateRefreshToken(payload, res, options) {
    // Generate a cryptographically random token
    const cookieToken = crypto_1.default.randomBytes(40).toString('hex');
    const expiresAt = new Date(Date.now() + REFRESH_TOKEN_EXPIRY_MS);
    // Revoke old refresh token (rotation)
    if (options?.oldTokenId) {
        await database_1.default.refreshToken.update({
            where: { id: options.oldTokenId },
            data: { revoked: true, replacedBy: cookieToken },
        });
    }
    // Store in database
    await database_1.default.refreshToken.create({
        data: {
            token: cookieToken,
            userId: payload.userId,
            expiresAt,
        },
    });
    // Set httpOnly cookie (may be stripped by Railway proxy, but kept for local dev)
    res.cookie(REFRESH_TOKEN_COOKIE, cookieToken, {
        ...exports.AUTH_COOKIE_OPTIONS,
        maxAge: REFRESH_TOKEN_EXPIRY_MS,
    });
    return cookieToken;
}
/**
 * Validate a refresh token against the database.
 * Accepts a token string (from cookie or request body).
 * Returns userId and tokenRecord id if valid.
 */
async function validateRefreshToken(token) {
    if (!token) {
        return { valid: false };
    }
    try {
        const record = await database_1.default.refreshToken.findUnique({
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
    }
    catch {
        return { valid: false };
    }
}
/**
 * Set access token as httpOnly cookie on the response.
 */
function setAccessTokenCookie(res, token) {
    res.cookie(ACCESS_TOKEN_COOKIE, token, {
        ...exports.AUTH_COOKIE_OPTIONS,
        maxAge: 15 * 60 * 1000, // 15 minutes
    });
}
/**
 * Clear auth cookies (for logout).
 */
function clearAuthCookies(res) {
    res.clearCookie(ACCESS_TOKEN_COOKIE, { ...exports.AUTH_COOKIE_OPTIONS });
    res.clearCookie(REFRESH_TOKEN_COOKIE, { ...exports.AUTH_COOKIE_OPTIONS });
}
//# sourceMappingURL=auth.js.map