import { describe, it, expect, beforeEach } from 'vitest';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { prismaMock, mockResponse, mockAuthRequest, createTestUser, mockPrismaClear } from './helpers';
import authRouter from '../routes/auth';

const TEST_JWT_SECRET = process.env.JWT_SECRET || 'insecure-dev-fallback';
function generateTestToken(overrides = {}) {
  return jwt.sign(
    { userId: 'test-user-id', email: 'test@email.com', role: 'OWNER', ...overrides },
    TEST_JWT_SECRET,
    { expiresIn: '15m' }
  );
}

async function simulateRequest(method: string, path: string, req: any, res: any) {
  const route = authRouter.stack.find((layer: any) => {
    if (!layer.route) return false;
    return layer.route.path === path && layer.route.methods[method];
  });

  if (!route) throw new Error(`Route ${method.toUpperCase()} ${path} not found`);

  const handlers = route.route!.stack.map((layer: any) => layer.handle);

  for (let i = 0; i < handlers.length; i++) {
    await new Promise<void>((resolve) => {
      let nextCalled = false;
      const next = () => { nextCalled = true; resolve(); };
      const result = handlers[i](req, res, next);
      if (result?.then) {
        result.then(() => { if (!nextCalled) resolve(); }).catch(() => resolve());
      } else if (!nextCalled) {
        resolve();
      }
    });
  }
}

describe('Auth Routes', () => {
  beforeEach(() => {
    mockPrismaClear();
  });

  // ─── REGISTER ──────────────────────────────────────────
  describe('POST /register', () => {
    it('should register a new user successfully', async () => {
      const req = mockAuthRequest({
        body: {
          name: 'New User',
          email: 'new@email.com',
          password: 'password123',
          organizationName: 'New Org',
        },
      });
      const res = mockResponse();

      prismaMock.user.findUnique.mockResolvedValueOnce(null);
      prismaMock.organization.create.mockResolvedValue({
        id: 'new-org-id', name: 'New Org', plan: 'FREE', logo: null,
        mpCustomerId: null, mpSubscriptionId: null, mpSubscriptionStatus: 'incomplete',
        mpCurrentPeriodEnd: null, createdAt: new Date(), updatedAt: new Date(),
      });

      const newUser = {
        id: 'new-user-id', name: 'New User', email: 'new@email.com', password: 'hashed',
        role: 'OWNER', plan: 'FREE', organizationId: 'new-org-id', avatar: null, phone: null,
        trialStartedAt: null, trialExpiresAt: null, tourDashboardCompleted: false,
        tourOnboardingCompleted: false, createdAt: new Date(), updatedAt: new Date(),
      };
      prismaMock.user.create.mockResolvedValue(newUser);
      prismaMock.user.findUnique.mockResolvedValue({
        ...newUser,
        organization: { id: 'new-org-id', name: 'New Org', plan: 'FREE', logo: null,
          mpCustomerId: null, mpSubscriptionId: null, mpSubscriptionStatus: null,
          mpCurrentPeriodEnd: null, createdAt: new Date(), updatedAt: new Date() },
      });

      await simulateRequest('post', '/register', req, res);

      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          token: expect.any(String),
          user: expect.objectContaining({ id: 'new-user-id', name: 'New User', email: 'new@email.com' }),
        })
      );
    });

    it('should reject registration with missing fields', async () => {
      const req = mockAuthRequest({ body: { name: 'Only Name' } });
      const res = mockResponse();
      await simulateRequest('post', '/register', req, res);
      expect(res.status).toHaveBeenCalledWith(400);
    });

    it('should reject registration with invalid email format', async () => {
      const req = mockAuthRequest({
        body: { name: 'Test', email: 'not-an-email', password: 'password123' },
      });
      const res = mockResponse();
      await simulateRequest('post', '/register', req, res);
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ error: 'Email invalido' }));
    });

    it('should reject registration with short password', async () => {
      const req = mockAuthRequest({
        body: { name: 'Test', email: 'test@email.com', password: '123' },
      });
      const res = mockResponse();
      await simulateRequest('post', '/register', req, res);
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ error: expect.stringContaining('minimo') })
      );
    });

    it('should reject registration with existing email', async () => {
      const req = mockAuthRequest({
        body: { name: 'Existing', email: 'existing@email.com', password: 'password123' },
      });
      const res = mockResponse();
      prismaMock.user.findUnique.mockResolvedValue(createTestUser());
      await simulateRequest('post', '/register', req, res);
      expect(res.status).toHaveBeenCalledWith(409);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ error: 'Email ja cadastrado' }));
    });

    it('should normalize email to lowercase on register', async () => {
      const req = mockAuthRequest({
        body: { name: 'Test', email: 'TEST@EMAIL.COM', password: 'password123' },
      });
      const res = mockResponse();
      prismaMock.user.findUnique.mockResolvedValueOnce(null);
      prismaMock.organization.create.mockResolvedValue({
        id: 'org-id', name: "Test's Organization", plan: 'FREE', logo: null,
        mpCustomerId: null, mpSubscriptionId: null, mpSubscriptionStatus: 'incomplete',
        mpCurrentPeriodEnd: null, createdAt: new Date(), updatedAt: new Date(),
      });
      prismaMock.user.create.mockResolvedValue({
        id: 'user-id', name: 'Test', email: 'test@email.com', password: 'hashed',
        role: 'OWNER', plan: 'FREE', organizationId: 'org-id', avatar: null, phone: null,
        trialStartedAt: null, trialExpiresAt: null, tourDashboardCompleted: false,
        tourOnboardingCompleted: false, createdAt: new Date(), updatedAt: new Date(),
      });
      prismaMock.user.findUnique.mockResolvedValue({
        id: 'user-id', name: 'Test', email: 'test@email.com', password: 'hashed',
        role: 'OWNER', plan: 'FREE', organizationId: 'org-id', avatar: null, phone: null,
        trialStartedAt: null, trialExpiresAt: null, tourDashboardCompleted: false,
        tourOnboardingCompleted: false, createdAt: new Date(), updatedAt: new Date(),
        organization: { id: 'org-id', name: "Test's Organization", plan: 'FREE', logo: null,
          mpCustomerId: null, mpSubscriptionId: null, mpSubscriptionStatus: null,
          mpCurrentPeriodEnd: null, createdAt: new Date(), updatedAt: new Date() },
      });

      await simulateRequest('post', '/register', req, res);

      expect(prismaMock.user.create).toHaveBeenCalledWith(
        expect.objectContaining({ data: expect.objectContaining({ email: 'test@email.com' }) })
      );
    });
  });

  // ─── LOGIN ─────────────────────────────────────────────
  describe('POST /login', () => {
    it('should login successfully with valid credentials', async () => {
      const password = 'correctpassword';
      const hashedPassword = await bcrypt.hash(password, 12);

      const req = mockAuthRequest({ body: { email: 'test@email.com', password } });
      const res = mockResponse();

      prismaMock.user.findUnique.mockResolvedValue(createTestUser({ password: hashedPassword }));

      await simulateRequest('post', '/login', req, res);

      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          token: expect.any(String),
          user: expect.objectContaining({ id: 'test-user-id', email: 'test@email.com' }),
        })
      );
    });

    it('should login with rememberMe=true (extended refresh token)', async () => {
      const password = 'correctpassword';
      const hashedPassword = await bcrypt.hash(password, 12);

      const req = mockAuthRequest({ body: { email: 'test@email.com', password, rememberMe: true } });
      const res = mockResponse();

      prismaMock.user.findUnique.mockResolvedValue(createTestUser({ password: hashedPassword }));

      await simulateRequest('post', '/login', req, res);

      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ token: expect.any(String) })
      );
    });

    it('should reject login with wrong password', async () => {
      const req = mockAuthRequest({
        body: { email: 'test@email.com', password: 'wrongpassword' },
      });
      const res = mockResponse();
      const hashedPassword = await bcrypt.hash('correctpassword', 12);
      prismaMock.user.findUnique.mockResolvedValue(createTestUser({ password: hashedPassword }));

      await simulateRequest('post', '/login', req, res);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ error: 'Credenciais invalidas' })
      );
    });

    it('should reject login with non-existent email (same error as wrong password)', async () => {
      const req = mockAuthRequest({
        body: { email: 'nonexistent@email.com', password: 'password123' },
      });
      const res = mockResponse();
      prismaMock.user.findUnique.mockResolvedValue(null);

      await simulateRequest('post', '/login', req, res);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ error: 'Credenciais invalidas' })
      );
    });

    it('should reject login with missing fields', async () => {
      const req = mockAuthRequest({ body: { email: 'test@email.com' } });
      const res = mockResponse();
      await simulateRequest('post', '/login', req, res);
      expect(res.status).toHaveBeenCalledWith(400);
    });

    it('should reject login with invalid email format', async () => {
      const req = mockAuthRequest({
        body: { email: 'not-valid', password: 'password' },
      });
      const res = mockResponse();
      await simulateRequest('post', '/login', req, res);
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ error: 'Email invalido' }));
    });

    it('should normalize email to lowercase on login', async () => {
      const password = 'correctpassword';
      const hashedPassword = await bcrypt.hash(password, 12);

      const req = mockAuthRequest({ body: { email: 'TEST@EMAIL.COM', password } });
      const res = mockResponse();

      prismaMock.user.findUnique.mockResolvedValue(createTestUser({ password: hashedPassword }));

      await simulateRequest('post', '/login', req, res);

      expect(prismaMock.user.findUnique).toHaveBeenCalledWith(
        expect.objectContaining({ where: { email: 'test@email.com' } })
      );
    });
  });

  // ─── FORGOT PASSWORD ───────────────────────────────────
  describe('POST /forgot-password', () => {
    it('should always return success message (prevent email enumeration)', async () => {
      const req = mockAuthRequest({ body: { email: 'test@email.com' } });
      const res = mockResponse();

      prismaMock.user.findUnique.mockResolvedValue(null); // user does not exist

      await simulateRequest('post', '/forgot-password', req, res);

      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ message: expect.stringContaining('email') })
      );
    });

    it('should return success even when user exists', async () => {
      const req = mockAuthRequest({ body: { email: 'test@email.com' } });
      const res = mockResponse();

      prismaMock.user.findUnique.mockResolvedValue(createTestUser());
      prismaMock.passwordResetToken.create.mockResolvedValue({
        id: 'token-id', token: 'hash', userId: 'test-user-id',
        expiresAt: new Date(), used: false, createdAt: new Date(),
      });

      await simulateRequest('post', '/forgot-password', req, res);

      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ message: expect.stringContaining('email') })
      );
    });

    it('should reject with invalid email format', async () => {
      const req = mockAuthRequest({ body: { email: 'not-valid' } });
      const res = mockResponse();

      await simulateRequest('post', '/forgot-password', req, res);

      expect(res.status).toHaveBeenCalledWith(400);
    });
  });

  // ─── RESET PASSWORD ────────────────────────────────────
  describe('POST /reset-password', () => {
    it('should reject reset with missing token', async () => {
      const req = mockAuthRequest({ body: { password: 'newpassword' } });
      const res = mockResponse();
      await simulateRequest('post', '/reset-password', req, res);
      expect(res.status).toHaveBeenCalledWith(400);
    });

    it('should reject reset with short password', async () => {
      const req = mockAuthRequest({ body: { token: 'some-token', password: '123' } });
      const res = mockResponse();
      await simulateRequest('post', '/reset-password', req, res);
      expect(res.status).toHaveBeenCalledWith(400);
    });

    it('should reject reset with invalid/expired token', async () => {
      const req = mockAuthRequest({
        body: { token: 'invalid-token', password: 'newpassword123' },
      });
      const res = mockResponse();
      prismaMock.passwordResetToken.findUnique.mockResolvedValue(null);
      await simulateRequest('post', '/reset-password', req, res);
      expect(res.status).toHaveBeenCalledWith(400);
    });
  });

  // ─── GET /me ───────────────────────────────────────────
  describe('GET /me', () => {
    it('should return current user profile when authenticated', async () => {
      const validToken = generateTestToken();
      const req = mockAuthRequest({ headers: { authorization: `Bearer ${validToken}` } });
      const res = mockResponse();
      prismaMock.user.findUnique.mockResolvedValue(createTestUser());

      await simulateRequest('get', '/me', req, res);

      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ id: 'test-user-id', email: 'test@email.com', name: 'Test User' })
      );
    });

    it('should return 401 when not authenticated', async () => {
      const req = mockAuthRequest({ user: undefined, headers: {} });
      const res = mockResponse();
      await simulateRequest('get', '/me', req, res);
      expect(res.status).toHaveBeenCalledWith(401);
    });
  });

  // ─── PUT /profile ──────────────────────────────────────
  describe('PUT /profile', () => {
    it('should update user profile successfully', async () => {
      const validToken = generateTestToken();
      const req = mockAuthRequest({
        headers: { authorization: `Bearer ${validToken}` },
        body: { name: 'Updated Name', phone: '+5511999999999' },
      });
      const res = mockResponse();
      prismaMock.user.update.mockResolvedValue({
        ...createTestUser(), name: 'Updated Name', phone: '+5511999999999',
      });

      await simulateRequest('put', '/profile', req, res);

      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ name: 'Updated Name', phone: '+5511999999999' })
      );
    });

    it('should return 401 when updating profile without auth', async () => {
      const req = mockAuthRequest({ user: undefined, headers: {} });
      const res = mockResponse();
      await simulateRequest('put', '/profile', req, res);
      expect(res.status).toHaveBeenCalledWith(401);
    });
  });
});
