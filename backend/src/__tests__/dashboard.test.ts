import { describe, it, expect, beforeEach, vi } from 'vitest';
import { prismaMock, mockResponse, mockAuthRequest, createTestUser, mockPrismaClear } from './helpers';
import dashboardRouter from '../routes/dashboard';

// Mock redis
vi.mock('../config/redis', () => ({
  redis: {
    get: vi.fn().mockResolvedValue(null),
    setex: vi.fn().mockResolvedValue('OK'),
    on: vi.fn(),
    quit: vi.fn(),
  },
}));

function simulateRequest(method: string, path: string, req: any, res: any) {
  const route = dashboardRouter.stack.find((layer: any) => {
    if (!layer.route) return false;
    return layer.route.path === path && layer.route.methods[method];
  });

  if (!route) {
    throw new Error(`Route ${method.toUpperCase()} ${path} not found`);
  }

  const handler = route.route!.stack[route.route!.stack.length - 1].handle;
  return handler(req, res, () => {});
}

describe('Dashboard Routes', () => {
  beforeEach(() => {
    mockPrismaClear();
  });

  describe('GET /metrics', () => {
    it('should return dashboard metrics for authenticated user', async () => {
      const req = mockAuthRequest();
      const res = mockResponse();

      prismaMock.user.findUnique.mockResolvedValue(createTestUser());
      prismaMock.whatsAppNumber.findMany.mockResolvedValue([{ id: 'num-1' }]);
      prismaMock.message.count.mockResolvedValue(150);
      prismaMock.conversation.count.mockResolvedValue(12);
      prismaMock.contact.count.mockResolvedValue(45);
      prismaMock.flow.count.mockResolvedValue(3);
      prismaMock.campaign.count.mockResolvedValue(5);
      prismaMock.crmCard.groupBy.mockResolvedValue([
        { stageId: 'stage-1', _count: 10, _sum: { value: 5000 } },
        { stageId: 'stage-2', _count: 5, _sum: { value: 2000 } },
      ]);
      prismaMock.crmStage.findMany.mockResolvedValue([
        { id: 'stage-1', name: 'Lead', color: '#6366f1', position: 0, boardId: 'board-1', createdAt: new Date(), updatedAt: new Date() },
        { id: 'stage-2', name: 'Fechado', color: '#10b981', position: 4, boardId: 'board-1', createdAt: new Date(), updatedAt: new Date() },
      ]);
      prismaMock.crmCard.count.mockResolvedValue(15);
      prismaMock.message.findMany.mockResolvedValue([
        { createdAt: new Date('2025-07-01T10:00:00Z') },
        { createdAt: new Date('2025-07-01T14:00:00Z') },
        { createdAt: new Date('2025-07-02T09:00:00Z') },
      ]);

      await simulateRequest('get', '/metrics', req, res);

      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          totalMessages: 150,
          activeConversations: 12,
          totalContacts: 45,
          activeFlows: 3,
          totalCampaigns: 5,
          conversionRate: expect.any(Number),
          messagesPerDay: expect.any(Array),
          pipelineData: expect.any(Array),
        })
      );
    });

    it('should handle user without organization', async () => {
      const req = mockAuthRequest();
      const res = mockResponse();

      prismaMock.user.findUnique.mockResolvedValue(
        createTestUser({ organizationId: null, organization: null })
      );
      prismaMock.whatsAppNumber.findMany.mockResolvedValue([]);
      prismaMock.contact.count.mockResolvedValue(0);
      prismaMock.flow.count.mockResolvedValue(0);
      prismaMock.campaign.count.mockResolvedValue(0);
      prismaMock.crmCard.groupBy.mockResolvedValue([]);
      prismaMock.crmCard.count.mockResolvedValue(0);

      await simulateRequest('get', '/metrics', req, res);

      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          totalMessages: 0,
          activeConversations: 0,
          totalContacts: 0,
        })
      );
    });

    it('should handle database errors gracefully', async () => {
      const req = mockAuthRequest();
      const res = mockResponse();

      prismaMock.user.findUnique.mockRejectedValue(new Error('DB Error'));

      await simulateRequest('get', '/metrics', req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ error: expect.any(String) })
      );
    });
  });

  describe('GET /activity', () => {
    it('should return recent activity messages', async () => {
      const req = mockAuthRequest();
      const res = mockResponse();

      prismaMock.user.findUnique.mockResolvedValue(createTestUser());
      prismaMock.whatsAppNumber.findMany.mockResolvedValue([{ id: 'num-1' }]);
      prismaMock.message.findMany.mockResolvedValue([
        {
          id: 'msg-1',
          content: 'Hello!',
          type: 'TEXT',
          status: 'SENT',
          from: '5511999999999',
          to: '5511999999991',
          mediaUrl: null,
          isFromBot: false,
          conversationId: 'conv-1',
          createdAt: new Date(),
          conversation: {
            id: 'conv-1',
            status: 'open',
            contact: { name: 'John Doe', phone: '5511999999991' },
            whatsappNumberId: 'num-1',
            contactId: 'contact-1',
            userId: null,
            createdAt: new Date(),
            updatedAt: new Date(),
          },
        },
      ]);

      await simulateRequest('get', '/activity', req, res);

      expect(res.json).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.objectContaining({
            id: 'msg-1',
            content: 'Hello!',
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
      prismaMock.whatsAppNumber.findMany.mockResolvedValue([]);
      prismaMock.message.findMany.mockResolvedValue([]);

      await simulateRequest('get', '/activity', req, res);

      expect(res.json).toHaveBeenCalledWith([]);
    });

    it('should handle errors gracefully', async () => {
      const req = mockAuthRequest();
      const res = mockResponse();

      prismaMock.user.findUnique.mockRejectedValue(new Error('DB Error'));

      await simulateRequest('get', '/activity', req, res);

      expect(res.status).toHaveBeenCalledWith(500);
    });
  });
});
