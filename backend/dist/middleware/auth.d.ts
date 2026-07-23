import { Response, NextFunction, CookieOptions } from 'express';
import { AuthRequest, AuthPayload, UserRole } from '../types';
/** Default cookie options for httpOnly auth cookies */
export declare const AUTH_COOKIE_OPTIONS: CookieOptions;
/**
 * Authenticate a request using either:
 * 1. Cookie-based access token (zapflow_access_token)
 * 2. Authorization: Bearer <token> header (legacy support for API clients)
 */
export declare function authenticate(req: AuthRequest, res: Response, next: NextFunction): void;
export declare function authorize(...roles: UserRole[]): (req: AuthRequest, res: Response, next: NextFunction) => void;
/** Generate a short-lived access token (15 min) */
export declare function generateToken(payload: AuthPayload): string;
/**
 * Generate a long-lived refresh token, store it in the DB, and set it as httpOnly cookie.
 * If `oldTokenId` is provided, the old refresh token is revoked (rotation).
 * Returns the generated token string so it can also be sent in the response body.
 */
export declare function generateRefreshToken(payload: AuthPayload, res: Response, options?: {
    oldTokenId?: string;
}): Promise<string>;
/**
 * Validate a refresh token against the database.
 * Accepts a token string (from cookie or request body).
 * Returns userId and tokenRecord id if valid.
 */
export declare function validateRefreshToken(token: string | undefined): Promise<{
    valid: boolean;
    userId?: string;
    tokenRecord?: {
        id: string;
    };
}>;
/**
 * Set access token as httpOnly cookie on the response.
 */
export declare function setAccessTokenCookie(res: Response, token: string): void;
/**
 * Clear auth cookies (for logout).
 */
export declare function clearAuthCookies(res: Response): void;
//# sourceMappingURL=auth.d.ts.map