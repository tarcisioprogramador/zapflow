import { describe, it, expect, beforeEach, vi } from 'vitest';
import { prismaMock, mockResponse, mockAuthRequest, createTestUser, mockPrismaClear } from './helpers';
import whatsappRouter from '../routes/whatsapp';

// Mock the whatsapp service
vi.mock('../services/whatsapp', () => ({
  createInstance: vi.fn().mockResolvedValue({
    instance: { instanceName: 'test-instance', instanceId: 'inst-1', status: 'created' },
  }),
  getQRCode: vi.fn().mockResolvedValue({ base64: 'qrcode-data', code: 'abc123' }),
  getConnectionState: vi.fn().mockResolvedValue({
    instance: { connectionStatus: 'open' },
  }),
  logoutInstance: vi.fn().mockResolvedValue(undefined),
  deleteInstance: vi.fn().mockResolvedValue(undefined),
  sendText: vi.fn().mockResolvedValue({ key: { id: 'msg-1' } }),
  sendMedia: vi.fn().mockResolvedValue({ key: { id: 'msg-1' } }),
  setWebhook: vi.fn().mockResolvedValue({}),
  BASE_URL: '',
  API_KEY: '',
}));

// Mock the trial service
vi.mock('../services/trial', () => ({
  startUserTrial: vi.fn().mockResolvedValue(undefined),
  isUserTrialExpired: vi.fn().mockResolvedValue(false),
  getUserTrialStatus: vi.fn().mockResolvedValue({
    isActive: true,
    isExpired: false,
    daysRemaining: 6,
    startedAt: new Date().toISOString(),
    expiresAt: new Date(Date.now() + 7 * 86400000).toISOString(),
    plan: 'FREE',
  }),
  checkAndDisconnectExpiredTrials: vi.fn().mockResolvedValue(0),
}));

function simulateRequest(method: string, path: string, req: any, res: any) {
  const route = whatsappRouter.stack.find((layer: any) => {
    if (!layer.route) return false;
    return layer.route.path === path && layer.route.methods[method];
  });

  if (!route) {
    throw new Error(`Route ${method.toUpperCase()} ${path} not found`);
  }

  const handler = route.route!.stack[route.route!.stack.length - 1].handle;
  return handler(req, res, () => {});
}

describe('WhatsApp Routes', () => {
  beforeEach(() => {
    mockPrismaClear();
  });

  const mockNumber = {
    id: 'number-1',
    number: '5511999999999',
    name: 'Test Number',
    status: 'CONNECTED',
    instanceId: 'test-instance',
    qrcode: 'qrcode-data',
    trialExpiresAt: null,
    organizationId: 'test-org-id',
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockConversation = {
    id: 'conv-1',
    status: 'open',
    whatsappNumberId: 'number-1',
    contactId: 'contact-1',
    userId: 'test-user-id',
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockContact = {
    id: 'contact-1',
    name: 'Test Contact',
    phone: '5511999999991',
    email: null,
    company: null,
    tags: '[]',
    notes: null,
    utmSource: null,
    utmMedium: null,
    utmCampaign: null,
    adId: null,
    adTitle: null,
    userId: 'test-user-id',
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  describe('GET /', () => {
    it('should list all connected numbers for the user', async () => {
      const req = mockAuthRequest();
      const res = mockResponse();

      prismaMock.user.findUnique.mockResolvedValue(createTestUser());
      prismaMock.whatsAppNumber.findMany.mockResolvedValue([mockNumber]);

      await simulateRequest('get', '/', req, res);

      expect(res.json).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.objectContaining({
            id: 'number-1',
            number: '5511999999999',
          }),
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

  describe('POST /connect', () => {
    it('should connect a new number successfully', async () => {
      const req = mockAuthRequest({
        body: { number: '5511999999999', name: 'My Number' },
      });
      const res = mockResponse();

      prismaMock.user.findUnique.mockResolvedValue(createTestUser());

      // Mock that we're in demo mode (no EVOLUTION API configured)
      const { BASE_URL } = await vi.importMock<{ BASE_URL: string }>('../services/whatsapp');

      prismaMock.whatsAppNumber.create.mockResolvedValue(mockNumber);

      await simulateRequest('post', '/connect', req, res);

      // In demo mode, should create the number and respond with 201
      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          id: 'number-1',
        })
      );
    });

    it('should reject connection without number', async () => {
      const req = mockAuthRequest({ body: { name: 'Only Name' } });
      const res = mockResponse();

      prismaMock.user.findUnique.mockResolvedValue(createTestUser());

      await simulateRequest('post', '/connect', req, res);

      expect(res.status).toHaveBeenCalledWith(400);
    });

    it('should reject connection without name', async () => {
      const req = mockAuthRequest({ body: { number: '5511999999999' } });
      const res = mockResponse();

      prismaMock.user.findUnique.mockResolvedValue(createTestUser());

      await simulateRequest('post', '/connect', req, res);

      expect(res.status).toHaveBeenCalledWith(400);
    });

    it('should return 400 when user has no organization', async () => {
      const req = mockAuthRequest({
        body: { number: '5511999999999', name: 'My Number' },
      });
      const res = mockResponse();

      prismaMock.user.findUnique.mockResolvedValue(
        createTestUser({ organizationId: null, organization: null })
      );

      await simulateRequest('post', '/connect', req, res);

      expect(res.status).toHaveBeenCalledWith(400);
    });
  });

  describe('POST /:id/send', () => {
    it('should send a message successfully', async () => {
      const req = mockAuthRequest({
        params: { id: 'number-1' },
        body: { to: '5511999999991', message: 'Hello!' },
      });
      const res = mockResponse();

      prismaMock.whatsAppNumber.findUnique.mockResolvedValue(mockNumber);
      prismaMock.contact.findFirst.mockResolvedValue(mockContact);
      prismaMock.conversation.findFirst.mockResolvedValue(mockConversation);
      prismaMock.message.create.mockResolvedValue({
        id: 'msg-1',
        content: 'Hello!',
        type: 'TEXT',
        from: '5511999999999',
        to: '5511999999991',
        status: 'SENT',
        mediaUrl: null,
        isFromBot: true,
        conversationId: 'conv-1',
        createdAt: new Date(),
      });

      await simulateRequest('post', '/:id/send', req, res);

      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          content: 'Hello!',
          to: '5511999999991',
        })
      );
    });

    it('should reject sending without destination', async () => {
      const req = mockAuthRequest({
        params: { id: 'number-1' },
        body: { message: 'Hello!' },
      });
      const res = mockResponse();

      await simulateRequest('post', '/:id/send', req, res);

      expect(res.status).toHaveBeenCalledWith(400);
    });

    it('should reject sending when number is not connected', async () => {
      const req = mockAuthRequest({
        params: { id: 'number-1' },
        body: { to: '5511999999991', message: 'Hello!' },
      });
      const res = mockResponse();

      prismaMock.whatsAppNumber.findUnique.mockResolvedValue({
        ...mockNumber,
        status: 'DISCONNECTED',
      });

      await simulateRequest('post', '/:id/send', req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ error: 'Número não conectado' })
      );
    });
  });

  describe('POST /:id/disconnect', () => {
    it('should disconnect a number successfully', async () => {
      const req = mockAuthRequest({ params: { id: 'number-1' } });
      const res = mockResponse();

      prismaMock.whatsAppNumber.findUnique.mockResolvedValue(mockNumber);
      prismaMock.whatsAppNumber.update.mockResolvedValue({
        ...mockNumber,
        status: 'DISCONNECTED',
        qrcode: null,
      });

      await simulateRequest('post', '/:id/disconnect', req, res);

      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ message: 'Número desconectado' })
      );
    });

    it('should return 404 when number not found', async () => {
      const req = mockAuthRequest({ params: { id: 'nonexistent' } });
      const res = mockResponse();

      prismaMock.whatsAppNumber.findUnique.mockResolvedValue(null);

      await simulateRequest('post', '/:id/disconnect', req, res);

      expect(res.status).toHaveBeenCalledWith(404);
    });
  });

  describe('DELETE /:id', () => {
    it('should delete a number successfully', async () => {
      const req = mockAuthRequest({ params: { id: 'number-1' } });
      const res = mockResponse();

      prismaMock.whatsAppNumber.findUnique.mockResolvedValue(mockNumber);
      prismaMock.whatsAppNumber.delete.mockResolvedValue(mockNumber);

      await simulateRequest('delete', '/:id', req, res);

      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ message: 'Número removido' })
      );
    });
  });

  describe('GET /:id/qrcode', () => {
    it('should return QR code for a number', async () => {
      const req = mockAuthRequest({ params: { id: 'number-1' } });
      const res = mockResponse();

      prismaMock.whatsAppNumber.findUnique.mockResolvedValue(mockNumber);

      await simulateRequest('get', '/:id/qrcode', req, res);

      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          qrcode: 'qrcode-data',
          status: 'CONNECTED',
        })
      );
    });

    it('should return 404 when number not found', async () => {
      const req = mockAuthRequest({ params: { id: 'nonexistent' } });
      const res = mockResponse();

      prismaMock.whatsAppNumber.findUnique.mockResolvedValue(null);

      await simulateRequest('get', '/:id/qrcode', req, res);

      expect(res.status).toHaveBeenCalledWith(404);
    });
  });

  describe('GET /:id/status', () => {
    it('should return connection status', async () => {
      const req = mockAuthRequest({ params: { id: 'number-1' } });
      const res = mockResponse();

      prismaMock.whatsAppNumber.findUnique.mockResolvedValue(mockNumber);

      await simulateRequest('get', '/:id/status', req, res);

      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          status: 'CONNECTED',
        })
      );
    });
  });

  describe('Error handling', () => {
    it('should handle database errors gracefully listing numbers', async () => {
      const req = mockAuthRequest();
      const res = mockResponse();

      prismaMock.user.findUnique.mockRejectedValue(new Error('DB Error'));

      await simulateRequest('get', '/', req, res);

      expect(res.status).toHaveBeenCalledWith(500);
    });

    it('should handle errors when sending message fails', async () => {
      const req = mockAuthRequest({
        params: { id: 'number-1' },
        body: { to: '5511999999991', message: 'Hello!' },
      });
      const res = mockResponse();

      prismaMock.whatsAppNumber.findUnique.mockRejectedValue(new Error('DB Error'));

      await simulateRequest('post', '/:id/send', req, res);

      expect(res.status).toHaveBeenCalledWith(500);
    });
  });
});
