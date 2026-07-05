import { describe, it, expect, beforeEach } from 'vitest';
import { prismaMock, mockResponse, mockAuthRequest, createTestUser, mockPrismaClear } from './helpers';
import crmRouter from '../routes/crm';

function simulateRequest(method: string, path: string, req: any, res: any) {
  const route = crmRouter.stack.find((layer: any) => {
    if (!layer.route) return false;
    return layer.route.path === path && layer.route.methods[method];
  });

  if (!route) {
    throw new Error(`Route ${method.toUpperCase()} ${path} not found`);
  }

  const handler = route.route!.stack[route.route!.stack.length - 1].handle;
  return handler(req, res, () => {});
}

describe('CRM Routes', () => {
  beforeEach(() => {
    mockPrismaClear();
  });

  const mockBoard = {
    id: 'board-1',
    name: 'Sales Pipeline',
    organizationId: 'test-org-id',
    createdAt: new Date(),
    updatedAt: new Date(),
    stages: [
      { id: 'stage-1', name: 'Lead', color: '#6366f1', position: 0, boardId: 'board-1', createdAt: new Date(), updatedAt: new Date() },
      { id: 'stage-2', name: 'Fechado', color: '#10b981', position: 4, boardId: 'board-1', createdAt: new Date(), updatedAt: new Date() },
    ],
    _count: { cards: 10 },
  };

  const mockStage = {
    id: 'stage-1',
    name: 'Lead',
    color: '#6366f1',
    position: 0,
    boardId: 'board-1',
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockCard = {
    id: 'card-1',
    title: 'Negócio Exemplo',
    description: 'Descrição do negócio',
    value: 5000,
    position: 0,
    boardId: 'board-1',
    stageId: 'stage-1',
    contactId: 'contact-1',
    createdAt: new Date(),
    updatedAt: new Date(),
    contact: { id: 'contact-1', name: 'John', phone: '5511999999991' },
    stage: mockStage,
  };

  const mockContact = {
    id: 'contact-1',
    name: 'John Doe',
    phone: '5511999999991',
    email: 'john@email.com',
    company: 'ACME Inc',
    tags: '["hot","lead"]',
    notes: 'Interessado no plano Pro',
    userId: 'test-user-id',
    utmSource: null,
    utmMedium: null,
    utmCampaign: null,
    adId: null,
    adTitle: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  // ─── Boards ─────────────────────────────────────────

  describe('GET /boards', () => {
    it('should list all boards for user organization', async () => {
      const req = mockAuthRequest();
      const res = mockResponse();

      prismaMock.user.findUnique.mockResolvedValue(createTestUser());
      prismaMock.crmBoard.findMany.mockResolvedValue([mockBoard]);

      await simulateRequest('get', '/boards', req, res);

      expect(res.json).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.objectContaining({ id: 'board-1', name: 'Sales Pipeline' }),
        ])
      );
    });

    it('should return empty array when user has no organization', async () => {
      const req = mockAuthRequest();
      const res = mockResponse();

      prismaMock.user.findUnique.mockResolvedValue(
        createTestUser({ organizationId: null, organization: null })
      );

      await simulateRequest('get', '/boards', req, res);

      expect(res.json).toHaveBeenCalledWith([]);
    });
  });

  describe('POST /boards', () => {
    it('should create a new board with default stages', async () => {
      const req = mockAuthRequest({ body: { name: 'New Board' } });
      const res = mockResponse();

      prismaMock.user.findUnique.mockResolvedValue(createTestUser());
      prismaMock.crmBoard.create.mockResolvedValue(mockBoard);

      await simulateRequest('post', '/boards', req, res);

      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ id: 'board-1', name: 'Sales Pipeline' })
      );
      expect(prismaMock.crmBoard.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            organizationId: 'test-org-id',
            stages: expect.objectContaining({
              create: expect.arrayContaining([
                expect.objectContaining({ name: 'Lead' }),
              ]),
            }),
          }),
        })
      );
    });

    it('should reject creation when user has no organization', async () => {
      const req = mockAuthRequest({ body: { name: 'New Board' } });
      const res = mockResponse();

      prismaMock.user.findUnique.mockResolvedValue(
        createTestUser({ organizationId: null, organization: null })
      );

      await simulateRequest('post', '/boards', req, res);

      expect(res.status).toHaveBeenCalledWith(400);
    });
  });

  describe('PUT /boards/:id', () => {
    it('should update a board name', async () => {
      const req = mockAuthRequest({
        params: { id: 'board-1' },
        body: { name: 'Updated Board' },
      });
      const res = mockResponse();

      prismaMock.crmBoard.findUnique.mockResolvedValue(mockBoard);
      prismaMock.user.findUnique.mockResolvedValue(createTestUser());
      prismaMock.crmBoard.update.mockResolvedValue({ ...mockBoard, name: 'Updated Board' });

      await simulateRequest('put', '/boards/:id', req, res);

      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ name: 'Updated Board' })
      );
    });

    it('should return 404 when board not found', async () => {
      const req = mockAuthRequest({ params: { id: 'nonexistent' }, body: { name: 'Updated' } });
      const res = mockResponse();

      prismaMock.crmBoard.findUnique.mockResolvedValue(null);

      await simulateRequest('put', '/boards/:id', req, res);

      expect(res.status).toHaveBeenCalledWith(404);
    });
  });

  describe('DELETE /boards/:id', () => {
    it('should delete a board', async () => {
      const req = mockAuthRequest({ params: { id: 'board-1' } });
      const res = mockResponse();

      prismaMock.crmBoard.findUnique.mockResolvedValue(mockBoard);
      prismaMock.user.findUnique.mockResolvedValue(createTestUser());
      prismaMock.crmBoard.delete.mockResolvedValue(mockBoard);

      await simulateRequest('delete', '/boards/:id', req, res);

      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ message: 'Board removido' })
      );
    });
  });

  // ─── Stages ─────────────────────────────────────────

  describe('POST /stages', () => {
    it('should create a new stage', async () => {
      const req = mockAuthRequest({
        body: { boardId: 'board-1', name: 'Qualificado', color: '#22c55e' },
      });
      const res = mockResponse();

      prismaMock.crmStage.findMany.mockResolvedValue([{ ...mockStage, position: 2 }]);
      prismaMock.crmStage.create.mockResolvedValue({ ...mockStage, id: 'stage-3', name: 'Qualificado', position: 3 });

      await simulateRequest('post', '/stages', req, res);

      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ name: 'Qualificado', position: 3 })
      );
    });
  });

  describe('PUT /stages/:id', () => {
    it('should update a stage', async () => {
      const req = mockAuthRequest({
        params: { id: 'stage-1' },
        body: { name: 'Updated Stage', color: '#3b82f6' },
      });
      const res = mockResponse();

      prismaMock.crmStage.findUnique.mockResolvedValue({
        ...mockStage,
        board: { organizationId: 'test-org-id' },
      });
      prismaMock.user.findUnique.mockResolvedValue(createTestUser());
      prismaMock.crmStage.update.mockResolvedValue({ ...mockStage, name: 'Updated Stage', color: '#3b82f6' });

      await simulateRequest('put', '/stages/:id', req, res);

      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ name: 'Updated Stage', color: '#3b82f6' })
      );
    });

    it('should return 404 when stage not found', async () => {
      const req = mockAuthRequest({ params: { id: 'nonexistent' }, body: { name: 'Updated' } });
      const res = mockResponse();

      prismaMock.crmStage.findUnique.mockResolvedValue(null);

      await simulateRequest('put', '/stages/:id', req, res);

      expect(res.status).toHaveBeenCalledWith(404);
    });
  });

  describe('DELETE /stages/:id', () => {
    it('should delete a stage', async () => {
      const req = mockAuthRequest({ params: { id: 'stage-1' } });
      const res = mockResponse();

      prismaMock.crmStage.findUnique.mockResolvedValue({
        ...mockStage,
        board: { organizationId: 'test-org-id' },
      });
      prismaMock.user.findUnique.mockResolvedValue(createTestUser());
      prismaMock.crmStage.delete.mockResolvedValue(mockStage);

      await simulateRequest('delete', '/stages/:id', req, res);

      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ message: 'Etapa removida' })
      );
    });
  });

  // ─── Cards ──────────────────────────────────────────

  describe('GET /cards', () => {
    it('should list cards for a board', async () => {
      const req = mockAuthRequest({ query: { boardId: 'board-1' } });
      const res = mockResponse();

      prismaMock.crmCard.findMany.mockResolvedValue([mockCard]);

      await simulateRequest('get', '/cards', req, res);

      expect(res.json).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.objectContaining({ id: 'card-1', title: 'Negócio Exemplo' }),
        ])
      );
    });

    it('should return empty array when no cards exist', async () => {
      const req = mockAuthRequest({ query: { boardId: 'board-1' } });
      const res = mockResponse();

      prismaMock.crmCard.findMany.mockResolvedValue([]);

      await simulateRequest('get', '/cards', req, res);

      expect(res.json).toHaveBeenCalledWith([]);
    });
  });

  describe('POST /cards', () => {
    it('should create a new card', async () => {
      const req = mockAuthRequest({
        body: {
          title: 'Novo Negócio',
          description: 'Lead qualificado',
          value: 10000,
          boardId: 'board-1',
          stageId: 'stage-1',
          contactId: 'contact-1',
        },
      });
      const res = mockResponse();

      prismaMock.crmCard.findMany.mockResolvedValue([]);
      prismaMock.crmCard.create.mockResolvedValue(mockCard);

      await simulateRequest('post', '/cards', req, res);

      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ id: 'card-1', title: 'Negócio Exemplo' })
      );
    });
  });

  describe('PUT /cards/:id', () => {
    it('should update a card', async () => {
      const req = mockAuthRequest({
        params: { id: 'card-1' },
        body: { title: 'Updated Deal', value: 15000 },
      });
      const res = mockResponse();

      prismaMock.crmCard.findUnique.mockResolvedValue({
        ...mockCard,
        board: { organizationId: 'test-org-id' },
      });
      prismaMock.user.findUnique.mockResolvedValue(createTestUser());
      prismaMock.crmCard.update.mockResolvedValue({ ...mockCard, title: 'Updated Deal', value: 15000 });

      await simulateRequest('put', '/cards/:id', req, res);

      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ title: 'Updated Deal', value: 15000 })
      );
    });
  });

  describe('PUT /cards/:id/move', () => {
    it('should move a card to another stage', async () => {
      const req = mockAuthRequest({
        params: { id: 'card-1' },
        body: { stageId: 'stage-2', position: 0 },
      });
      const res = mockResponse();

      prismaMock.crmCard.findUnique.mockResolvedValue({
        ...mockCard,
        board: { organizationId: 'test-org-id' },
      });
      prismaMock.user.findUnique.mockResolvedValue(createTestUser());
      prismaMock.crmCard.update.mockResolvedValue({ ...mockCard, stageId: 'stage-2', position: 0 });

      await simulateRequest('put', '/cards/:id/move', req, res);

      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ stageId: 'stage-2', position: 0 })
      );
    });
  });

  describe('DELETE /cards/:id', () => {
    it('should delete a card', async () => {
      const req = mockAuthRequest({ params: { id: 'card-1' } });
      const res = mockResponse();

      prismaMock.crmCard.findUnique.mockResolvedValue({
        ...mockCard,
        board: { organizationId: 'test-org-id' },
      });
      prismaMock.user.findUnique.mockResolvedValue(createTestUser());
      prismaMock.crmCard.delete.mockResolvedValue(mockCard);

      await simulateRequest('delete', '/cards/:id', req, res);

      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ message: 'Card removido' })
      );
    });
  });

  // ─── Contacts (CRM) ─────────────────────────────────

  describe('GET /contacts', () => {
    it('should list CRM contacts', async () => {
      const req = mockAuthRequest();
      const res = mockResponse();

      prismaMock.contact.findMany.mockResolvedValue([mockContact]);

      await simulateRequest('get', '/contacts', req, res);

      expect(res.json).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.objectContaining({ id: 'contact-1', name: 'John Doe' }),
        ])
      );
    });

    it('should search contacts by name', async () => {
      const req = mockAuthRequest({ query: { search: 'John' } });
      const res = mockResponse();

      prismaMock.contact.findMany.mockResolvedValue([mockContact]);

      await simulateRequest('get', '/contacts', req, res);

      expect(prismaMock.contact.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            OR: expect.arrayContaining([
              expect.objectContaining({ name: { contains: 'John', mode: 'insensitive' } }),
            ]),
          }),
        })
      );
      expect(res.json).toHaveBeenCalledWith(
        expect.arrayContaining([expect.objectContaining({ name: 'John Doe' })])
      );
    });
  });

  describe('POST /contacts', () => {
    it('should create a new contact', async () => {
      const req = mockAuthRequest({
        body: {
          name: 'Jane Doe',
          phone: '5511999999992',
          email: 'jane@email.com',
          company: 'Corp Inc',
          tags: ['lead'],
          notes: 'New lead',
        },
      });
      const res = mockResponse();

      prismaMock.contact.create.mockResolvedValue({ ...mockContact, name: 'Jane Doe' });

      await simulateRequest('post', '/contacts', req, res);

      expect(res.status).toHaveBeenCalledWith(201);
      expect(prismaMock.contact.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            name: 'Jane Doe',
            phone: '5511999999992',
            userId: 'test-user-id',
          }),
        })
      );
    });
  });

  describe('PUT /contacts/:id', () => {
    it('should update a contact', async () => {
      const req = mockAuthRequest({
        params: { id: 'contact-1' },
        body: { name: 'Updated Name', company: 'New Corp' },
      });
      const res = mockResponse();

      prismaMock.contact.findUnique.mockResolvedValue(mockContact);
      prismaMock.contact.update.mockResolvedValue({ ...mockContact, name: 'Updated Name', company: 'New Corp' });

      await simulateRequest('put', '/contacts/:id', req, res);

      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ name: 'Updated Name', company: 'New Corp' })
      );
    });

    it('should return 404 when contact not found', async () => {
      const req = mockAuthRequest({ params: { id: 'nonexistent' }, body: { name: 'Updated' } });
      const res = mockResponse();

      prismaMock.contact.findUnique.mockResolvedValue(null);

      await simulateRequest('put', '/contacts/:id', req, res);

      expect(res.status).toHaveBeenCalledWith(404);
    });
  });

  describe('DELETE /contacts/:id', () => {
    it('should delete a contact', async () => {
      const req = mockAuthRequest({ params: { id: 'contact-1' } });
      const res = mockResponse();

      prismaMock.contact.findUnique.mockResolvedValue(mockContact);
      prismaMock.contact.delete.mockResolvedValue(mockContact);

      await simulateRequest('delete', '/contacts/:id', req, res);

      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ message: 'Contato removido' })
      );
    });
  });

  describe('Error handling', () => {
    it('should handle database errors gracefully on boards list', async () => {
      const req = mockAuthRequest();
      const res = mockResponse();

      prismaMock.user.findUnique.mockRejectedValue(new Error('DB Error'));

      await simulateRequest('get', '/boards', req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ error: expect.any(String) })
      );
    });

    it('should handle errors on card creation', async () => {
      const req = mockAuthRequest({
        body: { title: 'Card', boardId: 'board-1', stageId: 'stage-1' },
      });
      const res = mockResponse();

      prismaMock.crmCard.findMany.mockRejectedValue(new Error('DB Error'));

      await simulateRequest('post', '/cards', req, res);

      expect(res.status).toHaveBeenCalledWith(500);
    });
  });
});
