"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const vitest_1 = require("vitest");
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const helpers_1 = require("./helpers");
const auth_1 = __importDefault(require("../routes/auth"));
// Generate a real JWT for tests that go through the authenticate middleware
const TEST_JWT_SECRET = process.env.JWT_SECRET || 'insecure-dev-fallback';
function generateTestToken(overrides = {}) {
    return jsonwebtoken_1.default.sign({ userId: 'test-user-id', email: 'test@email.com', role: 'OWNER', ...overrides }, TEST_JWT_SECRET, { expiresIn: '15m' });
}
// Helper to call the router's internal handlers by simulating requests
// Handles routes with multiple middleware (e.g., bruteForceProtection + handler)
// Properly awaits async handlers by wrapping each in a Promise that resolves:
// 1. When next() is called (middleware passes to next handler)
// 2. When the handler's promise resolves (async handler)
// 3. Immediately after sync execution (middleware that doesn't call next(), like authenticate on failure)
async function simulateRequest(method, path, req, res) {
    // Access the router's stack to find matching route
    const route = auth_1.default.stack.find((layer) => {
        if (!layer.route)
            return false;
        return layer.route.path === path && layer.route.methods[method];
    });
    if (!route) {
        throw new Error(`Route ${method.toUpperCase()} ${path} not found`);
    }
    // Execute ALL middleware in the route's stack in sequence
    const handlers = route.route.stack.map((layer) => layer.handle);
    for (let i = 0; i < handlers.length; i++) {
        await new Promise((resolve) => {
            let nextCalled = false;
            const next = () => { nextCalled = true; resolve(); };
            const result = handlers[i](req, res, next);
            if (result?.then) {
                // Async handler - wait for it to finish, then resolve if next() wasn't called
                result.then(() => { if (!nextCalled)
                    resolve(); }).catch(() => resolve());
            }
            else if (!nextCalled) {
                // Sync handler that didn't call next() - resolve immediately
                resolve();
            }
        });
    }
}
(0, vitest_1.describe)('Auth Routes', () => {
    (0, vitest_1.beforeEach)(() => {
        (0, helpers_1.mockPrismaClear)();
    });
    (0, vitest_1.describe)('POST /register', () => {
        (0, vitest_1.it)('should register a new user successfully', async () => {
            const req = (0, helpers_1.mockAuthRequest)({
                body: {
                    name: 'New User',
                    email: 'new@email.com',
                    password: 'password123',
                    organizationName: 'New Org',
                },
            });
            const res = (0, helpers_1.mockResponse)();
            // Mock no existing user (first call: check email)
            helpers_1.prismaMock.user.findUnique.mockResolvedValueOnce(null);
            // Mock org creation
            helpers_1.prismaMock.organization.create.mockResolvedValue({
                id: 'new-org-id',
                name: 'New Org',
                plan: 'FREE',
                logo: null,
                mpCustomerId: null,
                mpSubscriptionId: null,
                createdAt: new Date(),
                updatedAt: new Date(),
            });
            // Mock user creation
            const newUser = {
                id: 'new-user-id',
                name: 'New User',
                email: 'new@email.com',
                password: 'hashed',
                role: 'OWNER',
                plan: 'FREE',
                organizationId: 'new-org-id',
                avatar: null,
                phone: null,
                trialStartedAt: null,
                trialExpiresAt: null,
                tourDashboardCompleted: false,
                tourOnboardingCompleted: false,
                createdAt: new Date(),
                updatedAt: new Date(),
            };
            helpers_1.prismaMock.user.create.mockResolvedValue(newUser);
            // Mock freshUser re-fetch (second call: after register, before response)
            // Must include organization for buildUserResponse
            const freshUserWithOrg = {
                ...newUser,
                organization: {
                    id: 'new-org-id',
                    name: 'New Org',
                    plan: 'FREE',
                    logo: null,
                    mpCustomerId: null,
                    mpSubscriptionId: null,
                    mpSubscriptionStatus: null,
                    mpCurrentPeriodEnd: null,
                    createdAt: new Date(),
                    updatedAt: new Date(),
                },
            };
            helpers_1.prismaMock.user.findUnique.mockResolvedValue(freshUserWithOrg);
            await simulateRequest('post', '/register', req, res);
            (0, vitest_1.expect)(res.status).toHaveBeenCalledWith(201);
            (0, vitest_1.expect)(res.json).toHaveBeenCalledWith(vitest_1.expect.objectContaining({
                token: vitest_1.expect.any(String),
                user: vitest_1.expect.objectContaining({
                    id: 'new-user-id',
                    name: 'New User',
                    email: 'new@email.com',
                }),
            }));
        });
        (0, vitest_1.it)('should reject registration with missing fields', async () => {
            const req = (0, helpers_1.mockAuthRequest)({ body: { name: 'Only Name' } });
            const res = (0, helpers_1.mockResponse)();
            await simulateRequest('post', '/register', req, res);
            (0, vitest_1.expect)(res.status).toHaveBeenCalledWith(400);
            (0, vitest_1.expect)(res.json).toHaveBeenCalledWith(vitest_1.expect.objectContaining({ error: vitest_1.expect.any(String) }));
        });
        (0, vitest_1.it)('should reject registration with existing email', async () => {
            const req = (0, helpers_1.mockAuthRequest)({
                body: {
                    name: 'Existing',
                    email: 'existing@email.com',
                    password: 'password123',
                },
            });
            const res = (0, helpers_1.mockResponse)();
            helpers_1.prismaMock.user.findUnique.mockResolvedValue((0, helpers_1.createTestUser)());
            await simulateRequest('post', '/register', req, res);
            (0, vitest_1.expect)(res.status).toHaveBeenCalledWith(409);
            (0, vitest_1.expect)(res.json).toHaveBeenCalledWith(vitest_1.expect.objectContaining({ error: 'Email já cadastrado' }));
        });
    });
    (0, vitest_1.describe)('POST /login', () => {
        (0, vitest_1.it)('should login successfully with valid credentials', async () => {
            const password = 'correctpassword';
            const hashedPassword = await bcryptjs_1.default.hash(password, 12);
            const req = (0, helpers_1.mockAuthRequest)({
                body: { email: 'test@email.com', password },
            });
            const res = (0, helpers_1.mockResponse)();
            helpers_1.prismaMock.user.findUnique.mockResolvedValue((0, helpers_1.createTestUser)({ password: hashedPassword }));
            await simulateRequest('post', '/login', req, res);
            (0, vitest_1.expect)(res.json).toHaveBeenCalledWith(vitest_1.expect.objectContaining({
                token: vitest_1.expect.any(String),
                user: vitest_1.expect.objectContaining({
                    id: 'test-user-id',
                    email: 'test@email.com',
                }),
            }));
        });
        (0, vitest_1.it)('should reject login with wrong password', async () => {
            const req = (0, helpers_1.mockAuthRequest)({
                body: { email: 'test@email.com', password: 'wrongpassword' },
            });
            const res = (0, helpers_1.mockResponse)();
            const hashedPassword = await bcryptjs_1.default.hash('correctpassword', 12);
            helpers_1.prismaMock.user.findUnique.mockResolvedValue((0, helpers_1.createTestUser)({ password: hashedPassword }));
            await simulateRequest('post', '/login', req, res);
            (0, vitest_1.expect)(res.status).toHaveBeenCalledWith(401);
            (0, vitest_1.expect)(res.json).toHaveBeenCalledWith(vitest_1.expect.objectContaining({ error: 'Credenciais inválidas' }));
        });
        (0, vitest_1.it)('should reject login with non-existent email', async () => {
            const req = (0, helpers_1.mockAuthRequest)({
                body: { email: 'nonexistent@email.com', password: 'password123' },
            });
            const res = (0, helpers_1.mockResponse)();
            helpers_1.prismaMock.user.findUnique.mockResolvedValue(null);
            await simulateRequest('post', '/login', req, res);
            (0, vitest_1.expect)(res.status).toHaveBeenCalledWith(401);
            (0, vitest_1.expect)(res.json).toHaveBeenCalledWith(vitest_1.expect.objectContaining({ error: 'Credenciais inválidas' }));
        });
        (0, vitest_1.it)('should reject login with missing fields', async () => {
            const req = (0, helpers_1.mockAuthRequest)({ body: { email: 'test@email.com' } });
            const res = (0, helpers_1.mockResponse)();
            await simulateRequest('post', '/login', req, res);
            (0, vitest_1.expect)(res.status).toHaveBeenCalledWith(400);
        });
    });
    (0, vitest_1.describe)('GET /me', () => {
        (0, vitest_1.it)('should return current user profile when authenticated', async () => {
            const validToken = generateTestToken();
            const req = (0, helpers_1.mockAuthRequest)({
                headers: { authorization: `Bearer ${validToken}` },
            });
            const res = (0, helpers_1.mockResponse)();
            helpers_1.prismaMock.user.findUnique.mockResolvedValue((0, helpers_1.createTestUser)());
            await simulateRequest('get', '/me', req, res);
            (0, vitest_1.expect)(res.json).toHaveBeenCalledWith(vitest_1.expect.objectContaining({
                id: 'test-user-id',
                email: 'test@email.com',
                name: 'Test User',
            }));
        });
        (0, vitest_1.it)('should return 401 when not authenticated', async () => {
            const req = (0, helpers_1.mockAuthRequest)({
                user: undefined,
                headers: {}, // No auth header
            });
            const res = (0, helpers_1.mockResponse)();
            await simulateRequest('get', '/me', req, res);
            (0, vitest_1.expect)(res.status).toHaveBeenCalledWith(401);
        });
    });
    (0, vitest_1.describe)('PUT /profile', () => {
        (0, vitest_1.it)('should update user profile successfully', async () => {
            const validToken = generateTestToken();
            const req = (0, helpers_1.mockAuthRequest)({
                headers: { authorization: `Bearer ${validToken}` },
                body: { name: 'Updated Name', phone: '+5511999999999' },
            });
            const res = (0, helpers_1.mockResponse)();
            helpers_1.prismaMock.user.update.mockResolvedValue({
                ...(0, helpers_1.createTestUser)(),
                name: 'Updated Name',
                phone: '+5511999999999',
            });
            await simulateRequest('put', '/profile', req, res);
            (0, vitest_1.expect)(res.json).toHaveBeenCalledWith(vitest_1.expect.objectContaining({
                name: 'Updated Name',
                phone: '+5511999999999',
            }));
        });
        (0, vitest_1.it)('should return 401 when updating profile without auth', async () => {
            const req = (0, helpers_1.mockAuthRequest)({
                user: undefined,
                headers: {}, // No auth header
            });
            const res = (0, helpers_1.mockResponse)();
            await simulateRequest('put', '/profile', req, res);
            (0, vitest_1.expect)(res.status).toHaveBeenCalledWith(401);
        });
    });
});
//# sourceMappingURL=auth.test.js.map