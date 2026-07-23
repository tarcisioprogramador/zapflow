import { describe, it, expect, beforeEach } from 'vitest';
import { prismaMock, mockResponse, mockAuthRequest, createTestUser, mockPrismaClear } from './helpers';
import usersRouter from '../routes/users';

function simulateRequest(method: string, path: string, req: any, res: any) {
  const route = usersRouter.stack.find((layer: any) => {
    if (!layer.route) return false;
    return layer.route.path === path && layer.route.methods[method];
  });

  if (!route) {
    throw new Error(`Route ${method.toUpperCase()} ${path} not found`);
  }

  const handler = route.route!.stack[route.route!.stack.length - 1].handle;
  return handler(req, res, () => {});
}

describe('Users Routes', () => {
  beforeEach(() => {
    mockPrismaClear();
  });

  const mockOrgUser = {
    id: 'other-user-id',
    name: 'Other User',
    email: 'other@email.com',
    role: 'ATTENDANT',
    avatar: null,
    createdAt: new Date(),
  };

  describe('GET /', () => {
    it('should list all users in the organization', async () => {
      const req = mockAuthRequest();
      const res = mockResponse();

      prismaMock.user.findUnique.mockResolvedValue(createTestUser());
      prismaMock.user.findMany.mockResolvedValue([mockOrgUser]);

      await simulateRequest('get', '/', req, res);

      expect(res.json).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.objectContaining({ id: 'other-user-id', name: 'Other User' }),
        ])
      );
    });

    it('should return empty array when user has no organization', async () => {
      const req = mockAuthRequest();
      const res = mockResponse();

      prismaMock.user.findUnique.mockResolvedValue(
        createTestUser({ organizationId: null, organization: null })
      );

      await simulateRequest('get', '/', req, res);

      expect(res.json).toHaveBeenCalledWith([]);
    });
  });

  describe('POST /', () => {
    it('should invite a new user to the organization', async () => {
      const req = mockAuthRequest({
        body: { name: 'New Member', email: 'new@email.com', password: 'password123', role: 'ATTENDANT' },
      });
      const res = mockResponse();

      prismaMock.user.findUnique.mockResolvedValue(createTestUser());
      prismaMock.user.create.mockResolvedValue({
        id: 'new-user-id',
        name: 'New Member',
        email: 'new@email.com',
        role: 'ATTENDANT',
      });

      await simulateRequest('post', '/', req, res);

      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ name: 'New Member', email: 'new@email.com', role: 'ATTENDANT' })
      );
    });

    it('should reject invitation with missing fields', async () => {
      const req = mockAuthRequest({ body: { name: 'Only Name' } });
      const res = mockResponse();

      prismaMock.user.findUnique.mockResolvedValue(createTestUser());

      await simulateRequest('post', '/', req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ error: expect.any(String) })
      );
    });

    it('should reject invitation when user has no organization', async () => {
      const req = mockAuthRequest({
        body: { name: 'New', email: 'new@email.com', password: '123456' },
      });
      const res = mockResponse();

      prismaMock.user.findUnique.mockResolvedValue(
        createTestUser({ organizationId: null, organization: null })
      );

      await simulateRequest('post', '/', req, res);

      expect(res.status).toHaveBeenCalledWith(400);
    });
  });

  describe('PUT /:id', () => {
    it('should update a user role', async () => {
      const req = mockAuthRequest({
        params: { id: 'other-user-id' },
        body: { role: 'ADMIN' },
      });
      const res = mockResponse();

      prismaMock.user.update.mockResolvedValue({
        id: 'other-user-id',
        name: 'Other User',
        email: 'other@email.com',
        role: 'ADMIN',
      });

      await simulateRequest('put', '/:id', req, res);

      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ role: 'ADMIN' })
      );
    });
  });

  describe('DELETE /:id', () => {
    it('should remove a user from the organization', async () => {
      const req = mockAuthRequest({ params: { id: 'other-user-id' } });
      const res = mockResponse();

      prismaMock.user.delete.mockResolvedValue({ id: 'other-user-id' });

      await simulateRequest('delete', '/:id', req, res);

      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ message: 'Usuário removido' })
      );
    });
  });

  describe('Error handling', () => {
    it('should handle database errors gracefully', async () => {
      const req = mockAuthRequest();
      const res = mockResponse();

      prismaMock.user.findUnique.mockRejectedValue(new Error('DB Error'));

      await simulateRequest('get', '/', req, res);

      expect(res.status).toHaveBeenCalledWith(500);
    });
  });
});
