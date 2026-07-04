import { describe, it, expect, beforeEach } from 'vitest';
import { prismaMock, mockResponse, mockAuthRequest, createTestUser, mockPrismaClear } from './helpers';
import campaignsRouter from '../routes/campaigns';

function simulateRequest(method: string, path: string, req: any, res: any) {
  const route = campaignsRouter.stack.find((layer: any) => {
    if (!layer.route) return false;
    return layer.route.path === path && layer.route.methods[method];
  });

  if (!route) {
    throw new Error(`Route ${method.toUpperCase()} ${path} not found`);
  }

  const handler = route.route!.stack[route.route!.stack.length - 1].handle;
  return handler(req, res, () => {});
}

describe('Campaigns Routes', () => {
  beforeEach(() => {
    mockPrismaClear();
  });

  const mockCampaign = {
    id: 'campaign-1',
    name: 'Test Campaign',
    message: 'Hello {{name}}! This is a test message.',
    mediaUrl: null,
    status: 'DRAFT',
    scheduledAt: null,
    sentAt: null,
    totalSent: 0,
    totalFailed: 0,
    userId: 'test-user-id',
    createdAt: new Date(),
    updatedAt: new Date(),
    _count: { contacts: 3 },
    contacts: [
      { id: 'contact-1', phone: '5511999999991', name: 'Contact 1', status: 'pending', sentAt: null, campaignId: 'campaign-1' },
      { id: 'contact-2', phone: '5511999999992', name: 'Contact 2', status: 'pending', sentAt: null, campaignId: 'campaign-1' },
    ],
  };

  describe('GET /', () => {
    it('should list all campaigns for the authenticated user', async () => {
      const req = mockAuthRequest();
      const res = mockResponse();

      prismaMock.campaign.findMany.mockResolvedValue([mockCampaign]);

      await simulateRequest('get', '/', req, res);

      expect(res.json).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.objectContaining({ id: 'campaign-1', name: 'Test Campaign' }),
        ])
      );
      expect(prismaMock.campaign.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { userId: 'test-user-id' },
        })
      );
    });

    it('should return empty array when no campaigns exist', async () => {
      const req = mockAuthRequest();
      const res = mockResponse();

      prismaMock.campaign.findMany.mockResolvedValue([]);

      await simulateRequest('get', '/', req, res);

      expect(res.json).toHaveBeenCalledWith([]);
    });
  });

  describe('GET /:id', () => {
    it('should return a specific campaign by id', async () => {
      const req = mockAuthRequest({ params: { id: 'campaign-1' } });
      const res = mockResponse();

      prismaMock.campaign.findUnique.mockResolvedValue(mockCampaign);

      await simulateRequest('get', '/:id', req, res);

      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ id: 'campaign-1', name: 'Test Campaign' })
      );
    });

    it('should return 404 when campaign not found', async () => {
      const req = mockAuthRequest({ params: { id: 'nonexistent' } });
      const res = mockResponse();

      prismaMock.campaign.findUnique.mockResolvedValue(null);

      await simulateRequest('get', '/:id', req, res);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ error: 'Campanha não encontrada' })
      );
    });
  });

  describe('POST /', () => {
    it('should create a new campaign', async () => {
      const req = mockAuthRequest({
        body: {
          name: 'New Campaign',
          message: 'Welcome {{name}}!',
          contacts: [
            { phone: '5511999999991', name: 'Contact 1' },
            { phone: '5511999999992', name: 'Contact 2' },
          ],
        },
      });
      const res = mockResponse();

      prismaMock.campaign.create.mockResolvedValue({
        ...mockCampaign,
        id: 'new-campaign',
        name: 'New Campaign',
      });

      await simulateRequest('post', '/', req, res);

      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ name: 'New Campaign' })
      );
    });

    it('should reject creation without name', async () => {
      const req = mockAuthRequest({
        body: { message: 'Just a message' },
      });
      const res = mockResponse();

      await simulateRequest('post', '/', req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ error: 'Nome e mensagem são obrigatórios' })
      );
    });

    it('should reject creation without message', async () => {
      const req = mockAuthRequest({
        body: { name: 'Campaign Only' },
      });
      const res = mockResponse();

      await simulateRequest('post', '/', req, res);

      expect(res.status).toHaveBeenCalledWith(400);
    });
  });

  describe('PUT /:id', () => {
    it('should update a campaign', async () => {
      const req = mockAuthRequest({
        params: { id: 'campaign-1' },
        body: { name: 'Updated Campaign', message: 'Updated message' },
      });
      const res = mockResponse();

      prismaMock.campaign.update.mockResolvedValue({
        ...mockCampaign,
        name: 'Updated Campaign',
        message: 'Updated message',
      });

      await simulateRequest('put', '/:id', req, res);

      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          name: 'Updated Campaign',
          message: 'Updated message',
        })
      );
    });
  });

  describe('PUT /:id/status', () => {
    it('should update campaign status to RUNNING', async () => {
      const req = mockAuthRequest({
        params: { id: 'campaign-1' },
        body: { status: 'RUNNING' },
      });
      const res = mockResponse();

      prismaMock.campaign.update.mockResolvedValue({
        ...mockCampaign,
        status: 'RUNNING',
        sentAt: new Date(),
      });

      await simulateRequest('put', '/:id/status', req, res);

      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ status: 'RUNNING' })
      );
    });
  });

  describe('DELETE /:id', () => {
    it('should delete a campaign', async () => {
      const req = mockAuthRequest({ params: { id: 'campaign-1' } });
      const res = mockResponse();

      prismaMock.campaign.delete.mockResolvedValue(mockCampaign);

      await simulateRequest('delete', '/:id', req, res);

      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ message: 'Campanha removida' })
      );
    });
  });

  describe('Error handling', () => {
    it('should handle database errors gracefully', async () => {
      const req = mockAuthRequest();
      const res = mockResponse();

      prismaMock.campaign.findMany.mockRejectedValue(new Error('DB Error'));

      await simulateRequest('get', '/', req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ error: expect.any(String) })
      );
    });
  });
});
