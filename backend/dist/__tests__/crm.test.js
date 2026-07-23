"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const vitest_1 = require("vitest");
const helpers_1 = require("./helpers");
const crm_1 = __importDefault(require("../routes/crm"));
function simulateRequest(method, path, req, res) {
    const route = crm_1.default.stack.find((layer) => {
        if (!layer.route)
            return false;
        return layer.route.path === path && layer.route.methods[method];
    });
    if (!route) {
        throw new Error(`Route ${method.toUpperCase()} ${path} not found`);
    }
    const handler = route.route.stack[route.route.stack.length - 1].handle;
    return handler(req, res, () => { });
}
(0, vitest_1.describe)('CRM Routes', () => {
    (0, vitest_1.beforeEach)(() => {
        (0, helpers_1.mockPrismaClear)();
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
    (0, vitest_1.describe)('GET /boards', () => {
        (0, vitest_1.it)('should list all boards for user organization', async () => {
            const req = (0, helpers_1.mockAuthRequest)();
            const res = (0, helpers_1.mockResponse)();
            helpers_1.prismaMock.user.findUnique.mockResolvedValue((0, helpers_1.createTestUser)());
            helpers_1.prismaMock.crmBoard.findMany.mockResolvedValue([mockBoard]);
            await simulateRequest('get', '/boards', req, res);
            (0, vitest_1.expect)(res.json).toHaveBeenCalledWith(vitest_1.expect.arrayContaining([
                vitest_1.expect.objectContaining({ id: 'board-1', name: 'Sales Pipeline' }),
            ]));
        });
        (0, vitest_1.it)('should return empty array when user has no organization', async () => {
            const req = (0, helpers_1.mockAuthRequest)();
            const res = (0, helpers_1.mockResponse)();
            helpers_1.prismaMock.user.findUnique.mockResolvedValue((0, helpers_1.createTestUser)({ organizationId: null, organization: null }));
            await simulateRequest('get', '/boards', req, res);
            (0, vitest_1.expect)(res.json).toHaveBeenCalledWith([]);
        });
    });
    (0, vitest_1.describe)('POST /boards', () => {
        (0, vitest_1.it)('should create a new board with default stages', async () => {
            const req = (0, helpers_1.mockAuthRequest)({ body: { name: 'New Board' } });
            const res = (0, helpers_1.mockResponse)();
            helpers_1.prismaMock.user.findUnique.mockResolvedValue((0, helpers_1.createTestUser)());
            helpers_1.prismaMock.crmBoard.create.mockResolvedValue(mockBoard);
            await simulateRequest('post', '/boards', req, res);
            (0, vitest_1.expect)(res.status).toHaveBeenCalledWith(201);
            (0, vitest_1.expect)(res.json).toHaveBeenCalledWith(vitest_1.expect.objectContaining({ id: 'board-1', name: 'Sales Pipeline' }));
            (0, vitest_1.expect)(helpers_1.prismaMock.crmBoard.create).toHaveBeenCalledWith(vitest_1.expect.objectContaining({
                data: vitest_1.expect.objectContaining({
                    organizationId: 'test-org-id',
                    stages: vitest_1.expect.objectContaining({
                        create: vitest_1.expect.arrayContaining([
                            vitest_1.expect.objectContaining({ name: 'Lead' }),
                        ]),
                    }),
                }),
            }));
        });
        (0, vitest_1.it)('should reject creation when user has no organization', async () => {
            const req = (0, helpers_1.mockAuthRequest)({ body: { name: 'New Board' } });
            const res = (0, helpers_1.mockResponse)();
            helpers_1.prismaMock.user.findUnique.mockResolvedValue((0, helpers_1.createTestUser)({ organizationId: null, organization: null }));
            await simulateRequest('post', '/boards', req, res);
            (0, vitest_1.expect)(res.status).toHaveBeenCalledWith(400);
        });
    });
    (0, vitest_1.describe)('PUT /boards/:id', () => {
        (0, vitest_1.it)('should update a board name', async () => {
            const req = (0, helpers_1.mockAuthRequest)({
                params: { id: 'board-1' },
                body: { name: 'Updated Board' },
            });
            const res = (0, helpers_1.mockResponse)();
            helpers_1.prismaMock.crmBoard.findUnique.mockResolvedValue(mockBoard);
            helpers_1.prismaMock.user.findUnique.mockResolvedValue((0, helpers_1.createTestUser)());
            helpers_1.prismaMock.crmBoard.update.mockResolvedValue({ ...mockBoard, name: 'Updated Board' });
            await simulateRequest('put', '/boards/:id', req, res);
            (0, vitest_1.expect)(res.json).toHaveBeenCalledWith(vitest_1.expect.objectContaining({ name: 'Updated Board' }));
        });
        (0, vitest_1.it)('should return 404 when board not found', async () => {
            const req = (0, helpers_1.mockAuthRequest)({ params: { id: 'nonexistent' }, body: { name: 'Updated' } });
            const res = (0, helpers_1.mockResponse)();
            helpers_1.prismaMock.crmBoard.findUnique.mockResolvedValue(null);
            await simulateRequest('put', '/boards/:id', req, res);
            (0, vitest_1.expect)(res.status).toHaveBeenCalledWith(404);
        });
    });
    (0, vitest_1.describe)('DELETE /boards/:id', () => {
        (0, vitest_1.it)('should delete a board', async () => {
            const req = (0, helpers_1.mockAuthRequest)({ params: { id: 'board-1' } });
            const res = (0, helpers_1.mockResponse)();
            helpers_1.prismaMock.crmBoard.findUnique.mockResolvedValue(mockBoard);
            helpers_1.prismaMock.user.findUnique.mockResolvedValue((0, helpers_1.createTestUser)());
            helpers_1.prismaMock.crmBoard.delete.mockResolvedValue(mockBoard);
            await simulateRequest('delete', '/boards/:id', req, res);
            (0, vitest_1.expect)(res.json).toHaveBeenCalledWith(vitest_1.expect.objectContaining({ message: 'Board removido' }));
        });
    });
    // ─── Stages ─────────────────────────────────────────
    (0, vitest_1.describe)('POST /stages', () => {
        (0, vitest_1.it)('should create a new stage', async () => {
            const req = (0, helpers_1.mockAuthRequest)({
                body: { boardId: 'board-1', name: 'Qualificado', color: '#22c55e' },
            });
            const res = (0, helpers_1.mockResponse)();
            helpers_1.prismaMock.crmStage.findMany.mockResolvedValue([{ ...mockStage, position: 2 }]);
            helpers_1.prismaMock.crmStage.create.mockResolvedValue({ ...mockStage, id: 'stage-3', name: 'Qualificado', position: 3 });
            await simulateRequest('post', '/stages', req, res);
            (0, vitest_1.expect)(res.status).toHaveBeenCalledWith(201);
            (0, vitest_1.expect)(res.json).toHaveBeenCalledWith(vitest_1.expect.objectContaining({ name: 'Qualificado', position: 3 }));
        });
    });
    (0, vitest_1.describe)('PUT /stages/:id', () => {
        (0, vitest_1.it)('should update a stage', async () => {
            const req = (0, helpers_1.mockAuthRequest)({
                params: { id: 'stage-1' },
                body: { name: 'Updated Stage', color: '#3b82f6' },
            });
            const res = (0, helpers_1.mockResponse)();
            helpers_1.prismaMock.crmStage.findUnique.mockResolvedValue({
                ...mockStage,
                board: { organizationId: 'test-org-id' },
            });
            helpers_1.prismaMock.user.findUnique.mockResolvedValue((0, helpers_1.createTestUser)());
            helpers_1.prismaMock.crmStage.update.mockResolvedValue({ ...mockStage, name: 'Updated Stage', color: '#3b82f6' });
            await simulateRequest('put', '/stages/:id', req, res);
            (0, vitest_1.expect)(res.json).toHaveBeenCalledWith(vitest_1.expect.objectContaining({ name: 'Updated Stage', color: '#3b82f6' }));
        });
        (0, vitest_1.it)('should return 404 when stage not found', async () => {
            const req = (0, helpers_1.mockAuthRequest)({ params: { id: 'nonexistent' }, body: { name: 'Updated' } });
            const res = (0, helpers_1.mockResponse)();
            helpers_1.prismaMock.crmStage.findUnique.mockResolvedValue(null);
            await simulateRequest('put', '/stages/:id', req, res);
            (0, vitest_1.expect)(res.status).toHaveBeenCalledWith(404);
        });
    });
    (0, vitest_1.describe)('DELETE /stages/:id', () => {
        (0, vitest_1.it)('should delete a stage', async () => {
            const req = (0, helpers_1.mockAuthRequest)({ params: { id: 'stage-1' } });
            const res = (0, helpers_1.mockResponse)();
            helpers_1.prismaMock.crmStage.findUnique.mockResolvedValue({
                ...mockStage,
                board: { organizationId: 'test-org-id' },
            });
            helpers_1.prismaMock.user.findUnique.mockResolvedValue((0, helpers_1.createTestUser)());
            helpers_1.prismaMock.crmStage.delete.mockResolvedValue(mockStage);
            await simulateRequest('delete', '/stages/:id', req, res);
            (0, vitest_1.expect)(res.json).toHaveBeenCalledWith(vitest_1.expect.objectContaining({ message: 'Etapa removida' }));
        });
    });
    // ─── Cards ──────────────────────────────────────────
    (0, vitest_1.describe)('GET /cards', () => {
        (0, vitest_1.it)('should list cards for a board', async () => {
            const req = (0, helpers_1.mockAuthRequest)({ query: { boardId: 'board-1' } });
            const res = (0, helpers_1.mockResponse)();
            helpers_1.prismaMock.crmCard.findMany.mockResolvedValue([mockCard]);
            await simulateRequest('get', '/cards', req, res);
            (0, vitest_1.expect)(res.json).toHaveBeenCalledWith(vitest_1.expect.arrayContaining([
                vitest_1.expect.objectContaining({ id: 'card-1', title: 'Negócio Exemplo' }),
            ]));
        });
        (0, vitest_1.it)('should return empty array when no cards exist', async () => {
            const req = (0, helpers_1.mockAuthRequest)({ query: { boardId: 'board-1' } });
            const res = (0, helpers_1.mockResponse)();
            helpers_1.prismaMock.crmCard.findMany.mockResolvedValue([]);
            await simulateRequest('get', '/cards', req, res);
            (0, vitest_1.expect)(res.json).toHaveBeenCalledWith([]);
        });
    });
    (0, vitest_1.describe)('POST /cards', () => {
        (0, vitest_1.it)('should create a new card', async () => {
            const req = (0, helpers_1.mockAuthRequest)({
                body: {
                    title: 'Novo Negócio',
                    description: 'Lead qualificado',
                    value: 10000,
                    boardId: 'board-1',
                    stageId: 'stage-1',
                    contactId: 'contact-1',
                },
            });
            const res = (0, helpers_1.mockResponse)();
            helpers_1.prismaMock.crmCard.findMany.mockResolvedValue([]);
            helpers_1.prismaMock.crmCard.create.mockResolvedValue(mockCard);
            await simulateRequest('post', '/cards', req, res);
            (0, vitest_1.expect)(res.status).toHaveBeenCalledWith(201);
            (0, vitest_1.expect)(res.json).toHaveBeenCalledWith(vitest_1.expect.objectContaining({ id: 'card-1', title: 'Negócio Exemplo' }));
        });
    });
    (0, vitest_1.describe)('PUT /cards/:id', () => {
        (0, vitest_1.it)('should update a card', async () => {
            const req = (0, helpers_1.mockAuthRequest)({
                params: { id: 'card-1' },
                body: { title: 'Updated Deal', value: 15000 },
            });
            const res = (0, helpers_1.mockResponse)();
            helpers_1.prismaMock.crmCard.findUnique.mockResolvedValue({
                ...mockCard,
                board: { organizationId: 'test-org-id' },
            });
            helpers_1.prismaMock.user.findUnique.mockResolvedValue((0, helpers_1.createTestUser)());
            helpers_1.prismaMock.crmCard.update.mockResolvedValue({ ...mockCard, title: 'Updated Deal', value: 15000 });
            await simulateRequest('put', '/cards/:id', req, res);
            (0, vitest_1.expect)(res.json).toHaveBeenCalledWith(vitest_1.expect.objectContaining({ title: 'Updated Deal', value: 15000 }));
        });
    });
    (0, vitest_1.describe)('PUT /cards/:id/move', () => {
        (0, vitest_1.it)('should move a card to another stage', async () => {
            const req = (0, helpers_1.mockAuthRequest)({
                params: { id: 'card-1' },
                body: { stageId: 'stage-2', position: 0 },
            });
            const res = (0, helpers_1.mockResponse)();
            helpers_1.prismaMock.crmCard.findUnique.mockResolvedValue({
                ...mockCard,
                board: { organizationId: 'test-org-id' },
            });
            helpers_1.prismaMock.user.findUnique.mockResolvedValue((0, helpers_1.createTestUser)());
            helpers_1.prismaMock.crmCard.update.mockResolvedValue({ ...mockCard, stageId: 'stage-2', position: 0 });
            await simulateRequest('put', '/cards/:id/move', req, res);
            (0, vitest_1.expect)(res.json).toHaveBeenCalledWith(vitest_1.expect.objectContaining({ stageId: 'stage-2', position: 0 }));
        });
    });
    (0, vitest_1.describe)('DELETE /cards/:id', () => {
        (0, vitest_1.it)('should delete a card', async () => {
            const req = (0, helpers_1.mockAuthRequest)({ params: { id: 'card-1' } });
            const res = (0, helpers_1.mockResponse)();
            helpers_1.prismaMock.crmCard.findUnique.mockResolvedValue({
                ...mockCard,
                board: { organizationId: 'test-org-id' },
            });
            helpers_1.prismaMock.user.findUnique.mockResolvedValue((0, helpers_1.createTestUser)());
            helpers_1.prismaMock.crmCard.delete.mockResolvedValue(mockCard);
            await simulateRequest('delete', '/cards/:id', req, res);
            (0, vitest_1.expect)(res.json).toHaveBeenCalledWith(vitest_1.expect.objectContaining({ message: 'Card removido' }));
        });
    });
    // ─── Contacts (CRM) ─────────────────────────────────
    (0, vitest_1.describe)('GET /contacts', () => {
        (0, vitest_1.it)('should list CRM contacts', async () => {
            const req = (0, helpers_1.mockAuthRequest)();
            const res = (0, helpers_1.mockResponse)();
            helpers_1.prismaMock.contact.findMany.mockResolvedValue([mockContact]);
            await simulateRequest('get', '/contacts', req, res);
            (0, vitest_1.expect)(res.json).toHaveBeenCalledWith(vitest_1.expect.arrayContaining([
                vitest_1.expect.objectContaining({ id: 'contact-1', name: 'John Doe' }),
            ]));
        });
        (0, vitest_1.it)('should search contacts by name', async () => {
            const req = (0, helpers_1.mockAuthRequest)({ query: { search: 'John' } });
            const res = (0, helpers_1.mockResponse)();
            helpers_1.prismaMock.contact.findMany.mockResolvedValue([mockContact]);
            await simulateRequest('get', '/contacts', req, res);
            (0, vitest_1.expect)(helpers_1.prismaMock.contact.findMany).toHaveBeenCalledWith(vitest_1.expect.objectContaining({
                where: vitest_1.expect.objectContaining({
                    OR: vitest_1.expect.arrayContaining([
                        vitest_1.expect.objectContaining({ name: { contains: 'John', mode: 'insensitive' } }),
                    ]),
                }),
            }));
            (0, vitest_1.expect)(res.json).toHaveBeenCalledWith(vitest_1.expect.arrayContaining([vitest_1.expect.objectContaining({ name: 'John Doe' })]));
        });
    });
    (0, vitest_1.describe)('POST /contacts', () => {
        (0, vitest_1.it)('should create a new contact', async () => {
            const req = (0, helpers_1.mockAuthRequest)({
                body: {
                    name: 'Jane Doe',
                    phone: '5511999999992',
                    email: 'jane@email.com',
                    company: 'Corp Inc',
                    tags: ['lead'],
                    notes: 'New lead',
                },
            });
            const res = (0, helpers_1.mockResponse)();
            helpers_1.prismaMock.contact.create.mockResolvedValue({ ...mockContact, name: 'Jane Doe' });
            await simulateRequest('post', '/contacts', req, res);
            (0, vitest_1.expect)(res.status).toHaveBeenCalledWith(201);
            (0, vitest_1.expect)(helpers_1.prismaMock.contact.create).toHaveBeenCalledWith(vitest_1.expect.objectContaining({
                data: vitest_1.expect.objectContaining({
                    name: 'Jane Doe',
                    phone: '5511999999992',
                    userId: 'test-user-id',
                }),
            }));
        });
    });
    (0, vitest_1.describe)('PUT /contacts/:id', () => {
        (0, vitest_1.it)('should update a contact', async () => {
            const req = (0, helpers_1.mockAuthRequest)({
                params: { id: 'contact-1' },
                body: { name: 'Updated Name', company: 'New Corp' },
            });
            const res = (0, helpers_1.mockResponse)();
            helpers_1.prismaMock.contact.findUnique.mockResolvedValue(mockContact);
            helpers_1.prismaMock.contact.update.mockResolvedValue({ ...mockContact, name: 'Updated Name', company: 'New Corp' });
            await simulateRequest('put', '/contacts/:id', req, res);
            (0, vitest_1.expect)(res.json).toHaveBeenCalledWith(vitest_1.expect.objectContaining({ name: 'Updated Name', company: 'New Corp' }));
        });
        (0, vitest_1.it)('should return 404 when contact not found', async () => {
            const req = (0, helpers_1.mockAuthRequest)({ params: { id: 'nonexistent' }, body: { name: 'Updated' } });
            const res = (0, helpers_1.mockResponse)();
            helpers_1.prismaMock.contact.findUnique.mockResolvedValue(null);
            await simulateRequest('put', '/contacts/:id', req, res);
            (0, vitest_1.expect)(res.status).toHaveBeenCalledWith(404);
        });
    });
    (0, vitest_1.describe)('DELETE /contacts/:id', () => {
        (0, vitest_1.it)('should delete a contact', async () => {
            const req = (0, helpers_1.mockAuthRequest)({ params: { id: 'contact-1' } });
            const res = (0, helpers_1.mockResponse)();
            helpers_1.prismaMock.contact.findUnique.mockResolvedValue(mockContact);
            helpers_1.prismaMock.contact.delete.mockResolvedValue(mockContact);
            await simulateRequest('delete', '/contacts/:id', req, res);
            (0, vitest_1.expect)(res.json).toHaveBeenCalledWith(vitest_1.expect.objectContaining({ message: 'Contato removido' }));
        });
    });
    (0, vitest_1.describe)('Error handling', () => {
        (0, vitest_1.it)('should handle database errors gracefully on boards list', async () => {
            const req = (0, helpers_1.mockAuthRequest)();
            const res = (0, helpers_1.mockResponse)();
            helpers_1.prismaMock.user.findUnique.mockRejectedValue(new Error('DB Error'));
            await simulateRequest('get', '/boards', req, res);
            (0, vitest_1.expect)(res.status).toHaveBeenCalledWith(500);
            (0, vitest_1.expect)(res.json).toHaveBeenCalledWith(vitest_1.expect.objectContaining({ error: vitest_1.expect.any(String) }));
        });
        (0, vitest_1.it)('should handle errors on card creation', async () => {
            const req = (0, helpers_1.mockAuthRequest)({
                body: { title: 'Card', boardId: 'board-1', stageId: 'stage-1' },
            });
            const res = (0, helpers_1.mockResponse)();
            helpers_1.prismaMock.crmCard.findMany.mockRejectedValue(new Error('DB Error'));
            await simulateRequest('post', '/cards', req, res);
            (0, vitest_1.expect)(res.status).toHaveBeenCalledWith(500);
        });
    });
});
//# sourceMappingURL=crm.test.js.map