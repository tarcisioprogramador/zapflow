import { describe, it, expect, beforeEach } from 'vitest';
import { prismaMock, mockResponse, mockAuthRequest, createTestUser, mockPrismaClear } from './helpers';
import flowsRouter from '../routes/flows';

function simulateRequest(method: string, path: string, req: any, res: any) {
  const route = flowsRouter.stack.find((layer: any) => {
    if (!layer.route) return false;
    return layer.route.path === path && layer.route.methods[method];
  });

  if (!route) {
    throw new Error(`Route ${method.toUpperCase()} ${path} not found`);
  }

  const handler = route.route!.stack[route.route!.stack.length - 1].handle;
  return handler(req, res, () => {});
}

describe('Flows Routes', () => {
  beforeEach(() => {
    mockPrismaClear();
  });

  const mockFlow = {
    id: 'flow-1',
    name: 'Boas-vindas',
    description: 'Fluxo de boas-vindas automático',
    triggerType: 'keyword',
    triggerValue: 'oi,olá',
    isActive: true,
    nodes: JSON.stringify([{ id: 'start-1', type: 'startNode', position: { x: 250, y: 50 }, data: { label: 'Início' } }]),
    edges: JSON.stringify([]),
    userId: 'test-user-id',
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  // ─── List ───────────────────────────────────────────

  describe('GET /', () => {
    it('should list all flows for authenticated user', async () => {
      const req = mockAuthRequest();
      const res = mockResponse();

      prismaMock.flow.findMany.mockResolvedValue([mockFlow]);

      await simulateRequest('get', '/', req, res);

      expect(res.json).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.objectContaining({ id: 'flow-1', name: 'Boas-vindas' }),
        ])
      );
      expect(prismaMock.flow.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { userId: 'test-user-id' },
        })
      );
    });

    it('should return empty array when no flows exist', async () => {
      const req = mockAuthRequest();
      const res = mockResponse();

      prismaMock.flow.findMany.mockResolvedValue([]);

      await simulateRequest('get', '/', req, res);

      expect(res.json).toHaveBeenCalledWith([]);
    });
  });

  // ─── Get by ID ──────────────────────────────────────

  describe('GET /:id', () => {
    it('should return a specific flow by id', async () => {
      const req = mockAuthRequest({ params: { id: 'flow-1' } });
      const res = mockResponse();

      prismaMock.flow.findUnique.mockResolvedValue(mockFlow);

      await simulateRequest('get', '/:id', req, res);

      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ id: 'flow-1', name: 'Boas-vindas' })
      );
    });

    it('should return 404 when flow not found', async () => {
      const req = mockAuthRequest({ params: { id: 'nonexistent' } });
      const res = mockResponse();

      prismaMock.flow.findUnique.mockResolvedValue(null);

      await simulateRequest('get', '/:id', req, res);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ error: 'Fluxo não encontrado' })
      );
    });
  });

  // ─── Create ─────────────────────────────────────────

  describe('POST /', () => {
    it('should create a new flow with default start node', async () => {
      const req = mockAuthRequest({
        body: { name: 'Novo Fluxo', description: 'Fluxo de teste', triggerType: 'keyword', triggerValue: 'teste' },
      });
      const res = mockResponse();

      prismaMock.flow.create.mockResolvedValue(mockFlow);

      await simulateRequest('post', '/', req, res);

      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ id: 'flow-1', name: 'Boas-vindas' })
      );
      expect(prismaMock.flow.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            userId: 'test-user-id',
            nodes: expect.any(String),
            edges: '[]',
          }),
        })
      );
    });

    it('should create flow with default name when not provided', async () => {
      const req = mockAuthRequest({ body: {} });
      const res = mockResponse();

      prismaMock.flow.create.mockResolvedValue({ ...mockFlow, name: 'Novo Fluxo' });

      await simulateRequest('post', '/', req, res);

      expect(prismaMock.flow.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ name: 'Novo Fluxo' }),
        })
      );
    });
  });

  // ─── Update ─────────────────────────────────────────

  describe('PUT /:id', () => {
    it('should update a flow', async () => {
      const req = mockAuthRequest({
        params: { id: 'flow-1' },
        body: { name: 'Updated Flow', isActive: true },
      });
      const res = mockResponse();

      prismaMock.flow.findUnique.mockResolvedValue(mockFlow);
      prismaMock.flow.update.mockResolvedValue({ ...mockFlow, name: 'Updated Flow' });

      await simulateRequest('put', '/:id', req, res);

      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ name: 'Updated Flow' })
      );
    });

    it('should return 404 when flow to update not found', async () => {
      const req = mockAuthRequest({ params: { id: 'nonexistent' }, body: { name: 'Updated' } });
      const res = mockResponse();

      prismaMock.flow.findUnique.mockResolvedValue(null);

      await simulateRequest('put', '/:id', req, res);

      expect(res.status).toHaveBeenCalledWith(404);
    });

    it('should serialize nodes if provided as object', async () => {
      const req = mockAuthRequest({
        params: { id: 'flow-1' },
        body: {
          nodes: [{ id: 'n1', type: 'message', position: { x: 0, y: 0 }, data: { message: 'Hello' } }],
        },
      });
      const res = mockResponse();

      prismaMock.flow.findUnique.mockResolvedValue(mockFlow);
      prismaMock.flow.update.mockResolvedValue(mockFlow);

      await simulateRequest('put', '/:id', req, res);

      expect(prismaMock.flow.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            nodes: expect.any(String),
          }),
        })
      );
    });
  });

  // ─── Toggle ─────────────────────────────────────────

  describe('PUT /:id/toggle', () => {
    it('should toggle flow active state', async () => {
      const req = mockAuthRequest({ params: { id: 'flow-1' } });
      const res = mockResponse();

      prismaMock.flow.findUnique.mockResolvedValue({ ...mockFlow, isActive: false });
      prismaMock.flow.update.mockResolvedValue({ ...mockFlow, isActive: true });

      await simulateRequest('put', '/:id/toggle', req, res);

      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ isActive: true })
      );
    });

    it('should toggle from active to inactive', async () => {
      const req = mockAuthRequest({ params: { id: 'flow-1' } });
      const res = mockResponse();

      prismaMock.flow.findUnique.mockResolvedValue(mockFlow);
      prismaMock.flow.update.mockResolvedValue({ ...mockFlow, isActive: false });

      await simulateRequest('put', '/:id/toggle', req, res);

      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ isActive: false })
      );
    });
  });

  // ─── Delete ─────────────────────────────────────────

  describe('DELETE /:id', () => {
    it('should delete a flow', async () => {
      const req = mockAuthRequest({ params: { id: 'flow-1' } });
      const res = mockResponse();

      prismaMock.flow.findUnique.mockResolvedValue(mockFlow);
      prismaMock.flow.delete.mockResolvedValue(mockFlow);

      await simulateRequest('delete', '/:id', req, res);

      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ message: 'Fluxo removido' })
      );
    });
  });

  // ─── Templates ──────────────────────────────────────

  describe('GET /templates', () => {
    it('should return list of flow templates', async () => {
      const req = mockAuthRequest();
      const res = mockResponse();

      await simulateRequest('get', '/templates', req, res);

      expect(res.json).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.objectContaining({
            name: 'Boas-vindas Automático',
            triggerType: 'keyword',
            nodes: expect.any(Array),
            edges: expect.any(Array),
          }),
          expect.objectContaining({ name: 'Qualificação de Leads' }),
          expect.objectContaining({ name: 'Suporte Técnico' }),
          expect.objectContaining({ name: 'Agendamento de Reunião' }),
          expect.objectContaining({ name: 'Recuperação de Carrinho' }),
        ])
      );
    });
  });

  // ─── From Template ──────────────────────────────────

  describe('POST /from-template', () => {
    it('should create a flow from a valid template', async () => {
      const req = mockAuthRequest({
        body: { templateName: 'Boas-vindas Automático', description: 'Meu fluxo de boas-vindas' },
      });
      const res = mockResponse();

      prismaMock.flow.create.mockResolvedValue({
        ...mockFlow,
        name: 'Boas-vindas Automático',
        description: 'Meu fluxo de boas-vindas',
      });

      await simulateRequest('post', '/from-template', req, res);

      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ name: 'Boas-vindas Automático' })
      );
    });

    it('should return 404 for invalid template name', async () => {
      const req = mockAuthRequest({ body: { templateName: 'Invalid Template' } });
      const res = mockResponse();

      await simulateRequest('post', '/from-template', req, res);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ error: 'Template não encontrado' })
      );
    });
  });

  // ─── Duplicate ──────────────────────────────────────

  describe('POST /:id/duplicate', () => {
    it('should duplicate a flow with suffix (Cópia)', async () => {
      const req = mockAuthRequest({ params: { id: 'flow-1' } });
      const res = mockResponse();

      prismaMock.flow.findUnique.mockResolvedValue(mockFlow);
      prismaMock.flow.create.mockResolvedValue({ ...mockFlow, id: 'flow-2', name: 'Boas-vindas (Cópia)' });

      await simulateRequest('post', '/:id/duplicate', req, res);

      expect(res.status).toHaveBeenCalledWith(201);
      expect(prismaMock.flow.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ name: 'Boas-vindas (Cópia)' }),
        })
      );
    });

    it('should return 404 when flow to duplicate not found', async () => {
      const req = mockAuthRequest({ params: { id: 'nonexistent' } });
      const res = mockResponse();

      prismaMock.flow.findUnique.mockResolvedValue(null);

      await simulateRequest('post', '/:id/duplicate', req, res);

      expect(res.status).toHaveBeenCalledWith(404);
    });
  });

  describe('Error handling', () => {
    it('should handle database errors gracefully on list', async () => {
      const req = mockAuthRequest();
      const res = mockResponse();

      prismaMock.flow.findMany.mockRejectedValue(new Error('DB Error'));

      await simulateRequest('get', '/', req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ error: expect.any(String) })
      );
    });

    it('should handle errors when creating from template fails', async () => {
      const req = mockAuthRequest({
        body: { templateName: 'Boas-vindas Automático' },
      });
      const res = mockResponse();

      prismaMock.flow.create.mockRejectedValue(new Error('DB Error'));

      await simulateRequest('post', '/from-template', req, res);

      expect(res.status).toHaveBeenCalledWith(500);
    });
  });
});
