import { describe, it, expect, beforeEach } from 'vitest';
import { prismaMock, mockResponse, mockAuthRequest, createTestUser, mockPrismaClear } from './helpers';
import remarketingRouter from '../routes/remarketing';

function simulateRequest(method: string, path: string, req: any, res: any) {
  const route = remarketingRouter.stack.find((layer: any) => {
    if (!layer.route) return false;
    return layer.route.path === path && layer.route.methods[method];
  });

  if (!route) {
    throw new Error(`Route ${method.toUpperCase()} ${path} not found`);
  }

  const handler = route.route!.stack[route.route!.stack.length - 1].handle;
  return handler(req, res, () => {});
}

describe('Remarketing Routes', () => {
  beforeEach(() => {
    mockPrismaClear();
  });

  const mockSequence = {
    id: 'seq-1',
    name: 'Follow-up 7 dias',
    description: 'Sequência de follow-up para leads frios',
    steps: [
      { delay: 86400, message: 'Olá! Ainda interessado?' },
      { delay: 172800, message: 'Oferta especial para você!' },
    ],
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date(),
    _count: { executions: 15 },
  };

  describe('GET /', () => {
    it('should list all remarketing sequences', async () => {
      const req = mockAuthRequest();
      const res = mockResponse();

      prismaMock.remarketingSequence.findMany.mockResolvedValue([mockSequence]);

      await simulateRequest('get', '/', req, res);

      expect(res.json).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.objectContaining({
            id: 'seq-1',
            name: 'Follow-up 7 dias',
            _count: { executions: 15 },
          }),
        ])
      );
    });

    it('should return empty array when no sequences exist', async () => {
      const req = mockAuthRequest();
      const res = mockResponse();

      prismaMock.remarketingSequence.findMany.mockResolvedValue([]);

      await simulateRequest('get', '/', req, res);

      expect(res.json).toHaveBeenCalledWith([]);
    });
  });

  describe('POST /', () => {
    it('should create a new remarketing sequence', async () => {
      const req = mockAuthRequest({
        body: {
          name: 'Nova Sequência',
          description: 'Descrição da sequência',
          steps: [
            { delay: 3600, message: 'Primeira mensagem' },
            { delay: 86400, message: 'Segunda mensagem' },
          ],
        },
      });
      const res = mockResponse();

      prismaMock.remarketingSequence.create.mockResolvedValue(mockSequence);

      await simulateRequest('post', '/', req, res);

      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ id: 'seq-1', name: 'Follow-up 7 dias' })
      );
    });
  });

  describe('PUT /:id', () => {
    it('should update a remarketing sequence', async () => {
      const req = mockAuthRequest({
        params: { id: 'seq-1' },
        body: { name: 'Updated Sequence', isActive: false },
      });
      const res = mockResponse();

      prismaMock.remarketingSequence.update.mockResolvedValue({
        ...mockSequence,
        name: 'Updated Sequence',
        isActive: false,
      });

      await simulateRequest('put', '/:id', req, res);

      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ name: 'Updated Sequence', isActive: false })
      );
    });
  });

  describe('DELETE /:id', () => {
    it('should delete a remarketing sequence', async () => {
      const req = mockAuthRequest({ params: { id: 'seq-1' } });
      const res = mockResponse();

      prismaMock.remarketingSequence.delete.mockResolvedValue(mockSequence);

      await simulateRequest('delete', '/:id', req, res);

      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ message: 'Sequência removida' })
      );
    });
  });

  describe('Error handling', () => {
    it('should handle database errors gracefully', async () => {
      const req = mockAuthRequest();
      const res = mockResponse();

      prismaMock.remarketingSequence.findMany.mockRejectedValue(new Error('DB Error'));

      await simulateRequest('get', '/', req, res);

      expect(res.status).toHaveBeenCalledWith(500);
    });
  });
});
