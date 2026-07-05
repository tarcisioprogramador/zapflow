import { describe, it, expect, beforeEach } from 'vitest';
import { prismaMock, mockResponse, mockAuthRequest, createTestUser, mockPrismaClear } from './helpers';
import conversationsRouter from '../routes/conversations';

function simulateRequest(method: string, path: string, req: any, res: any) {
  const route = conversationsRouter.stack.find((layer: any) => {
    if (!layer.route) return false;
    return layer.route.path === path && layer.route.methods[method];
  });

  if (!route) {
    throw new Error(`Route ${method.toUpperCase()} ${path} not found`);
  }

  const handler = route.route!.stack[route.route!.stack.length - 1].handle;
  return handler(req, res, () => {});
}

describe('Conversations Routes', () => {
  beforeEach(() => {
    mockPrismaClear();
  });

  const mockConversation = {
    id: 'conv-1',
    status: 'open' as const,
    whatsappNumberId: 'num-1',
    contactId: 'contact-1',
    userId: 'test-user-id',
    createdAt: new Date(),
    updatedAt: new Date(),
    messages: [{ id: 'msg-1', content: 'Olá!', type: 'TEXT', status: 'SENT', from: '5511999999999', to: '5511999999991', mediaUrl: null, isFromBot: false, conversationId: 'conv-1', createdAt: new Date() }],
    contact: { id: 'contact-1', name: 'John Doe', phone: '5511999999991', email: null, company: null, tags: '[]', notes: null, utmSource: null, utmMedium: null, utmCampaign: null, adId: null, adTitle: null, userId: 'test-user-id', createdAt: new Date(), updatedAt: new Date() },
    whatsappNumber: { id: 'num-1', number: '5511999999999', name: 'Test Number' },
    tags: [{ conversationId: 'conv-1', tagId: 'tag-1', tag: { id: 'tag-1', name: 'VIP', color: '#f59e0b', createdAt: new Date(), updatedAt: new Date() } }],
    user: { name: 'Support Agent' },
  };

  const mockTag = {
    id: 'tag-1',
    name: 'VIP',
    color: '#f59e0b',
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  // ─── Tags (static routes, before /:id) ──────────────

  describe('POST /tags', () => {
    it('should create a new tag', async () => {
      const req = mockAuthRequest({ body: { name: 'Urgente', color: '#ef4444' } });
      const res = mockResponse();

      prismaMock.tag.create.mockResolvedValue({ ...mockTag, id: 'tag-2', name: 'Urgente', color: '#ef4444' });

      await simulateRequest('post', '/tags', req, res);

      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ name: 'Urgente', color: '#ef4444' })
      );
    });
  });

  describe('GET /tags', () => {
    it('should list all tags', async () => {
      const req = mockAuthRequest();
      const res = mockResponse();

      prismaMock.tag.findMany.mockResolvedValue([mockTag]);

      await simulateRequest('get', '/tags', req, res);

      expect(res.json).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.objectContaining({ id: 'tag-1', name: 'VIP' }),
        ])
      );
    });

    it('should return empty array when no tags exist', async () => {
      const req = mockAuthRequest();
      const res = mockResponse();

      prismaMock.tag.findMany.mockResolvedValue([]);

      await simulateRequest('get', '/tags', req, res);

      expect(res.json).toHaveBeenCalledWith([]);
    });
  });

  // ─── Conversations List ─────────────────────────────

  describe('GET /', () => {
    it('should list conversations for user organization', async () => {
      const req = mockAuthRequest();
      const res = mockResponse();

      prismaMock.user.findUnique.mockResolvedValue(createTestUser());
      prismaMock.whatsAppNumber.findMany.mockResolvedValue([{ id: 'num-1' }]);
      prismaMock.conversation.findMany.mockResolvedValue([mockConversation]);

      await simulateRequest('get', '/', req, res);

      expect(res.json).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.objectContaining({ id: 'conv-1', status: 'open' }),
        ])
      );
    });

    it('should filter conversations by status', async () => {
      const req = mockAuthRequest({ query: { status: 'closed' } });
      const res = mockResponse();

      prismaMock.user.findUnique.mockResolvedValue(createTestUser());
      prismaMock.whatsAppNumber.findMany.mockResolvedValue([{ id: 'num-1' }]);
      prismaMock.conversation.findMany.mockResolvedValue([]);

      await simulateRequest('get', '/', req, res);

      expect(prismaMock.conversation.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ status: 'closed' }),
        })
      );
    });

    it('should search conversations by contact name', async () => {
      const req = mockAuthRequest({ query: { search: 'John' } });
      const res = mockResponse();

      prismaMock.user.findUnique.mockResolvedValue(createTestUser());
      prismaMock.whatsAppNumber.findMany.mockResolvedValue([{ id: 'num-1' }]);
      prismaMock.conversation.findMany.mockResolvedValue([mockConversation]);

      await simulateRequest('get', '/', req, res);

      expect(res.json).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.objectContaining({ id: 'conv-1' }),
        ])
      );
    });
  });

  // ─── Conversation Detail ────────────────────────────

  describe('GET /:id', () => {
    it('should return conversation detail with messages', async () => {
      const req = mockAuthRequest({ params: { id: 'conv-1' } });
      const res = mockResponse();

      prismaMock.conversation.findUnique.mockResolvedValue(mockConversation);

      await simulateRequest('get', '/:id', req, res);

      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          id: 'conv-1',
          status: 'open',
          messages: expect.arrayContaining([
            expect.objectContaining({ content: 'Olá!' }),
          ]),
        })
      );
    });

    it('should return 404 when conversation not found', async () => {
      const req = mockAuthRequest({ params: { id: 'nonexistent' } });
      const res = mockResponse();

      prismaMock.conversation.findUnique.mockResolvedValue(null);

      await simulateRequest('get', '/:id', req, res);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ error: 'Conversa não encontrada' })
      );
    });
  });

  // ─── Assign ─────────────────────────────────────────

  describe('POST /:id/assign', () => {
    it('should assign conversation to current user', async () => {
      const req = mockAuthRequest({ params: { id: 'conv-1' } });
      const res = mockResponse();

      prismaMock.conversation.update.mockResolvedValue({ ...mockConversation, userId: 'test-user-id' });

      await simulateRequest('post', '/:id/assign', req, res);

      expect(prismaMock.conversation.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'conv-1' },
          data: { userId: 'test-user-id' },
        })
      );
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ id: 'conv-1' })
      );
    });
  });

  // ─── Status Update ──────────────────────────────────

  describe('PUT /:id/status', () => {
    it('should update conversation status', async () => {
      const req = mockAuthRequest({
        params: { id: 'conv-1' },
        body: { status: 'closed' },
      });
      const res = mockResponse();

      prismaMock.conversation.update.mockResolvedValue({ ...mockConversation, status: 'closed' });

      await simulateRequest('put', '/:id/status', req, res);

      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ status: 'closed' })
      );
    });
  });

  // ─── Tags on Conversations ──────────────────────────

  describe('POST /:id/tags', () => {
    it('should add a tag to conversation', async () => {
      const req = mockAuthRequest({
        params: { id: 'conv-1' },
        body: { tagId: 'tag-1' },
      });
      const res = mockResponse();

      prismaMock.conversationTag.create.mockResolvedValue({
        conversationId: 'conv-1',
        tagId: 'tag-1',
      });

      await simulateRequest('post', '/:id/tags', req, res);

      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ message: 'Tag adicionada' })
      );
    });
  });

  describe('DELETE /:id/tags/:tagId', () => {
    it('should remove a tag from conversation', async () => {
      const req = mockAuthRequest({ params: { id: 'conv-1', tagId: 'tag-1' } });
      const res = mockResponse();

      prismaMock.conversationTag.delete.mockResolvedValue({
        conversationId: 'conv-1',
        tagId: 'tag-1',
      });

      await simulateRequest('delete', '/:id/tags/:tagId', req, res);

      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ message: 'Tag removida' })
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
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ error: expect.any(String) })
      );
    });

    it('should return 401 when user not in request for list', async () => {
      const req = mockAuthRequest({ user: undefined });
      const res = mockResponse();

      await simulateRequest('get', '/', req, res);

      expect(res.status).toHaveBeenCalledWith(401);
    });
  });
});
