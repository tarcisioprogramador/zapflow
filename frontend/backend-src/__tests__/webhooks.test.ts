import { describe, it, expect, beforeEach, vi } from 'vitest';
import { prismaMock, mockResponse, mockAuthRequest, createTestUser, mockPrismaClear } from './helpers';

// Mock DNS lookup to prevent actual DNS queries in tests (webhook URL validation)
vi.mock('dns', () => ({
  lookup: vi.fn((hostname: string, options: any, callback?: any) => {
    if (typeof options === 'function') {
      callback = options;
      options = 4;
    }
    // Return a public IP that passes SSRF validation
    if (callback) {
      callback(null, { address: '93.184.216.34' }); // example.com
    } else {
      return Promise.resolve({ address: '93.184.216.34' });
    }
  }),
  promises: {
    lookup: vi.fn().mockResolvedValue({ address: '93.184.216.34' }),
  },
  promisify: vi.fn(),
}));

import webhooksRouter from '../routes/webhooks';

function simulateRequest(method: string, path: string, req: any, res: any) {
  const route = webhooksRouter.stack.find((layer: any) => {
    if (!layer.route) return false;
    return layer.route.path === path && layer.route.methods[method];
  });

  if (!route) {
    throw new Error(`Route ${method.toUpperCase()} ${path} not found`);
  }

  const handler = route.route!.stack[route.route!.stack.length - 1].handle;
  return handler(req, res, () => {});
}

describe('Webhooks Routes', () => {
  beforeEach(() => {
    mockPrismaClear();
  });

  const mockWebhook = {
    id: 'wh-1',
    name: 'Notify Sales',
    url: 'https://hooks.example.com/sales',
    events: ['new_lead', 'new_conversation'],
    secret: 'whsec_test',
    isActive: true,
    organizationId: 'test-org-id',
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  describe('GET /', () => {
    it('should list all webhooks for the organization', async () => {
      const req = mockAuthRequest();
      const res = mockResponse();

      prismaMock.user.findUnique.mockResolvedValue(createTestUser());
      prismaMock.webhook.findMany.mockResolvedValue([mockWebhook]);

      await simulateRequest('get', '/', req, res);

      expect(res.json).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.objectContaining({ id: 'wh-1', name: 'Notify Sales' }),
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
    it('should create a new webhook', async () => {
      const req = mockAuthRequest({
        body: {
          name: 'New Webhook',
          url: 'https://api.example.com/webhook',
          events: ['new_message', 'campaign_completed'],
          secret: 'mysecret',
        },
      });
      const res = mockResponse();

      prismaMock.user.findUnique.mockResolvedValue(createTestUser());
      prismaMock.webhook.create.mockResolvedValue({
        ...mockWebhook,
        id: 'wh-2',
        name: 'New Webhook',
        url: 'https://api.example.com/webhook',
        events: ['new_message', 'campaign_completed'],
      });

      await simulateRequest('post', '/', req, res);

      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ name: 'New Webhook' })
      );
    });

    it('should reject creation with invalid URL', async () => {
      const req = mockAuthRequest({
        body: {
          name: 'Bad Webhook',
          url: 'http://localhost:3000/internal',
          events: ['test'],
        },
      });
      const res = mockResponse();

      prismaMock.user.findUnique.mockResolvedValue(createTestUser());

      await simulateRequest('post', '/', req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ error: expect.any(String) })
      );
    });

    it('should reject creation when user has no organization', async () => {
      const req = mockAuthRequest({
        body: { name: 'Test', url: 'https://example.com' },
      });
      const res = mockResponse();

      prismaMock.user.findUnique.mockResolvedValue(
        createTestUser({ organizationId: null, organization: null })
      );

      await simulateRequest('post', '/', req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ error: 'Sem organização' })
      );
    });

    it('should validate URL against SSRF', async () => {
      const req = mockAuthRequest({
        body: {
          name: 'SSRF Test',
          url: 'http://localhost:3000',
          events: ['test'],
        },
      });
      const res = mockResponse();

      prismaMock.user.findUnique.mockResolvedValue(createTestUser());

      await simulateRequest('post', '/', req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ error: expect.any(String) })
      );
    });
  });

  describe('PUT /:id', () => {
    it('should update a webhook', async () => {
      const req = mockAuthRequest({
        params: { id: 'wh-1' },
        body: { name: 'Updated Webhook', isActive: false },
      });
      const res = mockResponse();

      prismaMock.webhook.findUnique.mockResolvedValue(mockWebhook);
      prismaMock.user.findUnique.mockResolvedValue(createTestUser());
      prismaMock.webhook.update.mockResolvedValue({ ...mockWebhook, name: 'Updated Webhook', isActive: false });

      await simulateRequest('put', '/:id', req, res);

      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ name: 'Updated Webhook', isActive: false })
      );
    });

    it('should return 404 when webhook not found', async () => {
      const req = mockAuthRequest({ params: { id: 'nonexistent' }, body: { name: 'Updated' } });
      const res = mockResponse();

      prismaMock.webhook.findUnique.mockResolvedValue(null);

      await simulateRequest('put', '/:id', req, res);

      expect(res.status).toHaveBeenCalledWith(404);
    });
  });

  describe('DELETE /:id', () => {
    it('should delete a webhook', async () => {
      const req = mockAuthRequest({ params: { id: 'wh-1' } });
      const res = mockResponse();

      prismaMock.webhook.findUnique.mockResolvedValue(mockWebhook);
      prismaMock.user.findUnique.mockResolvedValue(createTestUser());
      prismaMock.webhook.delete.mockResolvedValue(mockWebhook);

      await simulateRequest('delete', '/:id', req, res);

      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ message: 'Webhook removido' })
      );
    });
  });

  describe('POST /:id/test', () => {
    it('should test a webhook by sending a payload', async () => {
      const req = mockAuthRequest({ params: { id: 'wh-1' } });
      const res = mockResponse();

      prismaMock.webhook.findUnique.mockResolvedValue(mockWebhook);
      prismaMock.user.findUnique.mockResolvedValue(createTestUser());

      // Mock fetch to succeed
      global.fetch = vi.fn().mockResolvedValue({ ok: true });

      await simulateRequest('post', '/:id/test', req, res);

      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ success: true, message: expect.any(String) })
      );
    });

    it('should return 404 when webhook not found', async () => {
      const req = mockAuthRequest({ params: { id: 'nonexistent' } });
      const res = mockResponse();

      prismaMock.webhook.findUnique.mockResolvedValue(null);

      await simulateRequest('post', '/:id/test', req, res);

      expect(res.status).toHaveBeenCalledWith(404);
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
