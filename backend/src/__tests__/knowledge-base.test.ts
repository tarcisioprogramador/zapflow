import { describe, it, expect, beforeEach } from 'vitest';
import { prismaMock, mockResponse, mockAuthRequest, createTestUser, mockPrismaClear } from './helpers';
import kbRouter from '../routes/knowledge-base';

function simulateRequest(method: string, path: string, req: any, res: any) {
  const route = kbRouter.stack.find((layer: any) => {
    if (!layer.route) return false;
    return layer.route.path === path && layer.route.methods[method];
  });

  if (!route) {
    throw new Error(`Route ${method.toUpperCase()} ${path} not found`);
  }

  const handler = route.route!.stack[route.route!.stack.length - 1].handle;
  return handler(req, res, () => {});
}

describe('Knowledge Base Routes', () => {
  beforeEach(() => {
    mockPrismaClear();
  });

  const mockItem = {
    id: 'kb-1',
    title: 'Como configurar WhatsApp',
    content: 'Passo a passo para conectar seu número ao ZapFlow.',
    category: 'Tutorial',
    organizationId: 'test-org-id',
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  describe('GET /', () => {
    it('should list all knowledge base items', async () => {
      const req = mockAuthRequest();
      const res = mockResponse();

      prismaMock.user.findUnique.mockResolvedValue(createTestUser());
      prismaMock.knowledgeBaseItem.findMany.mockResolvedValue([mockItem]);

      await simulateRequest('get', '/', req, res);

      expect(res.json).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.objectContaining({ id: 'kb-1', title: 'Como configurar WhatsApp' }),
        ])
      );
    });

    it('should filter items by category', async () => {
      const req = mockAuthRequest({ query: { category: 'Tutorial' } });
      const res = mockResponse();

      prismaMock.user.findUnique.mockResolvedValue(createTestUser());
      prismaMock.knowledgeBaseItem.findMany.mockResolvedValue([mockItem]);

      await simulateRequest('get', '/', req, res);

      expect(prismaMock.knowledgeBaseItem.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ category: 'Tutorial' }),
        })
      );
    });

    it('should search items by title', async () => {
      const req = mockAuthRequest({ query: { search: 'whatsapp' } });
      const res = mockResponse();

      prismaMock.user.findUnique.mockResolvedValue(createTestUser());
      prismaMock.knowledgeBaseItem.findMany.mockResolvedValue([mockItem]);

      await simulateRequest('get', '/', req, res);

      expect(res.json).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.objectContaining({ title: 'Como configurar WhatsApp' }),
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

  describe('GET /stats', () => {
    it('should return knowledge base stats', async () => {
      const req = mockAuthRequest();
      const res = mockResponse();

      prismaMock.user.findUnique.mockResolvedValue(createTestUser());
      prismaMock.knowledgeBaseItem.findMany.mockResolvedValue([
        mockItem,
        { ...mockItem, id: 'kb-2', title: 'FAQ', category: 'Geral', content: 'Perguntas frequentes.' },
      ]);

      await simulateRequest('get', '/stats', req, res);

      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ total: 2, categories: 2, characters: expect.any(Number) })
      );
    });
  });

  describe('GET /categories', () => {
    it('should list unique categories', async () => {
      const req = mockAuthRequest();
      const res = mockResponse();

      prismaMock.user.findUnique.mockResolvedValue(createTestUser());
      prismaMock.knowledgeBaseItem.findMany.mockResolvedValue([
        { ...mockItem, category: 'Tutorial' },
        { ...mockItem, id: 'kb-2', category: 'Geral' },
      ]);

      await simulateRequest('get', '/categories', req, res);

      expect(res.json).toHaveBeenCalledWith(
        expect.arrayContaining(['Tutorial', 'Geral'])
      );
    });
  });

  describe('POST /', () => {
    it('should create a new knowledge base item', async () => {
      const req = mockAuthRequest({
        body: { title: 'Novo Artigo', content: 'Conteúdo do artigo.', category: 'Manual' },
      });
      const res = mockResponse();

      prismaMock.user.findUnique.mockResolvedValue(createTestUser());
      prismaMock.knowledgeBaseItem.create.mockResolvedValue({
        ...mockItem,
        id: 'kb-3',
        title: 'Novo Artigo',
        category: 'Manual',
      });

      await simulateRequest('post', '/', req, res);

      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ title: 'Novo Artigo', category: 'Manual' })
      );
    });

    it('should reject creation without title', async () => {
      const req = mockAuthRequest({ body: { content: 'Some content' } });
      const res = mockResponse();

      prismaMock.user.findUnique.mockResolvedValue(createTestUser());

      await simulateRequest('post', '/', req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ error: expect.stringContaining('obrigatórios') })
      );
    });

    it('should reject creation when user has no organization', async () => {
      const req = mockAuthRequest({
        body: { title: 'Test', content: 'Content' },
      });
      const res = mockResponse();

      prismaMock.user.findUnique.mockResolvedValue(
        createTestUser({ organizationId: null, organization: null })
      );

      await simulateRequest('post', '/', req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ error: expect.any(String) })
      );
    });
  });

  describe('POST /ai-context', () => {
    it('should generate AI context from knowledge base', async () => {
      const req = mockAuthRequest();
      const res = mockResponse();

      prismaMock.user.findUnique.mockResolvedValue(createTestUser());
      prismaMock.knowledgeBaseItem.findMany.mockResolvedValue([mockItem]);

      await simulateRequest('post', '/ai-context', req, res);

      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          context: expect.stringContaining('BASE DE CONHECIMENTO'),
          itemCount: 1,
          totalCharacters: expect.any(Number),
        })
      );
    });
  });

  describe('PUT /:id', () => {
    it('should update a knowledge base item', async () => {
      const req = mockAuthRequest({
        params: { id: 'kb-1' },
        body: { title: 'Updated Title', content: 'Updated content.', category: 'Updated' },
      });
      const res = mockResponse();

      prismaMock.user.findUnique.mockResolvedValue(createTestUser());
      prismaMock.knowledgeBaseItem.update.mockResolvedValue({
        ...mockItem,
        title: 'Updated Title',
        category: 'Updated',
        organizationId: 'test-org-id',
      });

      await simulateRequest('put', '/:id', req, res);

      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ title: 'Updated Title', category: 'Updated' })
      );
    });

    it('should reject update when user has no organization', async () => {
      const req = mockAuthRequest({ params: { id: 'kb-1' }, body: { title: 'Updated' } });
      const res = mockResponse();

      prismaMock.user.findUnique.mockResolvedValue(
        createTestUser({ organizationId: null, organization: null })
      );

      await simulateRequest('put', '/:id', req, res);

      expect(res.status).toHaveBeenCalledWith(400);
    });
  });

  describe('DELETE /:id', () => {
    it('should delete a knowledge base item', async () => {
      const req = mockAuthRequest({ params: { id: 'kb-1' } });
      const res = mockResponse();

      prismaMock.user.findUnique.mockResolvedValue(createTestUser());
      prismaMock.knowledgeBaseItem.findUnique.mockResolvedValue(mockItem);
      prismaMock.knowledgeBaseItem.delete.mockResolvedValue(mockItem);

      await simulateRequest('delete', '/:id', req, res);

      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ message: 'Item removido' })
      );
    });

    it('should return 404 when item not found', async () => {
      const req = mockAuthRequest({ params: { id: 'nonexistent' } });
      const res = mockResponse();

      prismaMock.user.findUnique.mockResolvedValue(createTestUser());
      prismaMock.knowledgeBaseItem.findUnique.mockResolvedValue(null);

      await simulateRequest('delete', '/:id', req, res);

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
