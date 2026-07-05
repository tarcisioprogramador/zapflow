import { describe, it, expect, beforeEach } from 'vitest';
import bcrypt from 'bcryptjs';
import { prismaMock, mockResponse, mockAuthRequest, createTestUser, mockPrismaClear } from './helpers';
import authRouter from '../routes/auth';

// Helper to call the router's internal handlers by simulating requests
// Handles routes with multiple middleware (e.g., bruteForceProtection + handler)
// Properly awaits async handlers by wrapping each in a Promise that resolves on next()
async function simulateRequest(method: string, path: string, req: any, res: any) {
  // Access the router's stack to find matching route
  const route = authRouter.stack.find((layer: any) => {
    if (!layer.route) return false;
    return layer.route.path === path && layer.route.methods[method];
  });

  if (!route) {
    throw new Error(`Route ${method.toUpperCase()} ${path} not found`);
  }

  // Execute ALL middleware in the route's stack in sequence
  // Each handler resolves when it calls next(), which triggers the next handler
  const handlers = route.route!.stack.map((layer: any) => layer.handle);

  for (let i = 0; i < handlers.length; i++) {
    await new Promise<void>((resolve) => {
      const next = () => resolve();
      const result = handlers[i](req, res, next);
      // If handler returns a Promise (async), await it, but also resolve via next() for sync middleware
      if (result?.then) {
        result.then(resolve).catch(resolve);
      }
    });
  }
}

describe('Auth Routes', () => {
  beforeEach(() => {
    mockPrismaClear();
  });

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

      // Mock no existing user
      prismaMock.user.findUnique.mockResolvedValue(null);

      // Mock org creation
      prismaMock.organization.create.mockResolvedValue({
        id: 'new-org-id',
        name: 'New Org',
        plan: 'FREE',
        logo: null,
        stripeCustomerId: null,
        stripeSubscriptionId: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      // Mock user creation
      prismaMock.user.create.mockResolvedValue({
        id: 'new-user-id',
        name: 'New User',
        email: 'new@email.com',
        password: 'hashed',
        role: 'OWNER',
        plan: 'FREE',
        avatar: null,
        phone: null,
        organizationId: 'new-org-id',
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      await simulateRequest('post', '/register', req, res);

      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          token: expect.any(String),
          user: expect.objectContaining({
            id: 'new-user-id',
            name: 'New User',
            email: 'new@email.com',
          }),
        })
      );
    });

    it('should reject registration with missing fields', async () => {
      const req = mockAuthRequest({ body: { name: 'Only Name' } });
      const res = mockResponse();

      await simulateRequest('post', '/register', req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ error: expect.any(String) })
      );
    });

    it('should reject registration with existing email', async () => {
      const req = mockAuthRequest({
        body: {
          name: 'Existing',
          email: 'existing@email.com',
          password: 'password123',
        },
      });
      const res = mockResponse();

      prismaMock.user.findUnique.mockResolvedValue(createTestUser());

      await simulateRequest('post', '/register', req, res);

      expect(res.status).toHaveBeenCalledWith(409);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ error: 'Email já cadastrado' })
      );
    });
  });

  describe('POST /login', () => {
    it('should login successfully with valid credentials', async () => {
      const password = 'correctpassword';
      const hashedPassword = await bcrypt.hash(password, 12);

      const req = mockAuthRequest({
        body: { email: 'test@email.com', password },
      });
      const res = mockResponse();

      prismaMock.user.findUnique.mockResolvedValue(
        createTestUser({ password: hashedPassword })
      );

      await simulateRequest('post', '/login', req, res);

      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          token: expect.any(String),
          user: expect.objectContaining({
            id: 'test-user-id',
            email: 'test@email.com',
          }),
        })
      );
    });

    it('should reject login with wrong password', async () => {
      const req = mockAuthRequest({
        body: { email: 'test@email.com', password: 'wrongpassword' },
      });
      const res = mockResponse();

      const hashedPassword = await bcrypt.hash('correctpassword', 12);
      prismaMock.user.findUnique.mockResolvedValue(
        createTestUser({ password: hashedPassword })
      );

      await simulateRequest('post', '/login', req, res);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ error: 'Credenciais inválidas' })
      );
    });

    it('should reject login with non-existent email', async () => {
      const req = mockAuthRequest({
        body: { email: 'nonexistent@email.com', password: 'password123' },
      });
      const res = mockResponse();

      prismaMock.user.findUnique.mockResolvedValue(null);

      await simulateRequest('post', '/login', req, res);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ error: 'Credenciais inválidas' })
      );
    });

    it('should reject login with missing fields', async () => {
      const req = mockAuthRequest({ body: { email: 'test@email.com' } });
      const res = mockResponse();

      await simulateRequest('post', '/login', req, res);

      expect(res.status).toHaveBeenCalledWith(400);
    });
  });

  describe('GET /me', () => {
    it('should return current user profile when authenticated', async () => {
      const req = mockAuthRequest();
      const res = mockResponse();

      prismaMock.user.findUnique.mockResolvedValue(createTestUser());

      await simulateRequest('get', '/me', req, res);

      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          id: 'test-user-id',
          email: 'test@email.com',
          name: 'Test User',
        })
      );
    });

    it('should return 401 when not authenticated', async () => {
      const req = mockAuthRequest({ user: undefined });
      const res = mockResponse();

      await simulateRequest('get', '/me', req, res);

      expect(res.status).toHaveBeenCalledWith(401);
    });
  });

  describe('PUT /profile', () => {
    it('should update user profile successfully', async () => {
      const req = mockAuthRequest({
        body: { name: 'Updated Name', phone: '+5511999999999' },
      });
      const res = mockResponse();

      prismaMock.user.update.mockResolvedValue({
        ...createTestUser(),
        name: 'Updated Name',
        phone: '+5511999999999',
      });

      await simulateRequest('put', '/profile', req, res);

      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          name: 'Updated Name',
          phone: '+5511999999999',
        })
      );
    });

    it('should return 401 when updating profile without auth', async () => {
      const req = mockAuthRequest({ user: undefined });
      const res = mockResponse();

      await simulateRequest('put', '/profile', req, res);

      expect(res.status).toHaveBeenCalledWith(401);
    });
  });
});
