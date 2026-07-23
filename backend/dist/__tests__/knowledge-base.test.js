"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const vitest_1 = require("vitest");
const helpers_1 = require("./helpers");
const knowledge_base_1 = __importDefault(require("../routes/knowledge-base"));
function simulateRequest(method, path, req, res) {
    const route = knowledge_base_1.default.stack.find((layer) => {
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
(0, vitest_1.describe)('Knowledge Base Routes', () => {
    (0, vitest_1.beforeEach)(() => {
        (0, helpers_1.mockPrismaClear)();
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
    (0, vitest_1.describe)('GET /', () => {
        (0, vitest_1.it)('should list all knowledge base items', async () => {
            const req = (0, helpers_1.mockAuthRequest)();
            const res = (0, helpers_1.mockResponse)();
            helpers_1.prismaMock.user.findUnique.mockResolvedValue((0, helpers_1.createTestUser)());
            helpers_1.prismaMock.knowledgeBaseItem.findMany.mockResolvedValue([mockItem]);
            await simulateRequest('get', '/', req, res);
            (0, vitest_1.expect)(res.json).toHaveBeenCalledWith(vitest_1.expect.arrayContaining([
                vitest_1.expect.objectContaining({ id: 'kb-1', title: 'Como configurar WhatsApp' }),
            ]));
        });
        (0, vitest_1.it)('should filter items by category', async () => {
            const req = (0, helpers_1.mockAuthRequest)({ query: { category: 'Tutorial' } });
            const res = (0, helpers_1.mockResponse)();
            helpers_1.prismaMock.user.findUnique.mockResolvedValue((0, helpers_1.createTestUser)());
            helpers_1.prismaMock.knowledgeBaseItem.findMany.mockResolvedValue([mockItem]);
            await simulateRequest('get', '/', req, res);
            (0, vitest_1.expect)(helpers_1.prismaMock.knowledgeBaseItem.findMany).toHaveBeenCalledWith(vitest_1.expect.objectContaining({
                where: vitest_1.expect.objectContaining({ category: 'Tutorial' }),
            }));
        });
        (0, vitest_1.it)('should search items by title', async () => {
            const req = (0, helpers_1.mockAuthRequest)({ query: { search: 'whatsapp' } });
            const res = (0, helpers_1.mockResponse)();
            helpers_1.prismaMock.user.findUnique.mockResolvedValue((0, helpers_1.createTestUser)());
            helpers_1.prismaMock.knowledgeBaseItem.findMany.mockResolvedValue([mockItem]);
            await simulateRequest('get', '/', req, res);
            (0, vitest_1.expect)(res.json).toHaveBeenCalledWith(vitest_1.expect.arrayContaining([
                vitest_1.expect.objectContaining({ title: 'Como configurar WhatsApp' }),
            ]));
        });
        (0, vitest_1.it)('should return empty array when user has no organization', async () => {
            const req = (0, helpers_1.mockAuthRequest)();
            const res = (0, helpers_1.mockResponse)();
            helpers_1.prismaMock.user.findUnique.mockResolvedValue((0, helpers_1.createTestUser)({ organizationId: null, organization: null }));
            await simulateRequest('get', '/', req, res);
            (0, vitest_1.expect)(res.json).toHaveBeenCalledWith([]);
        });
    });
    (0, vitest_1.describe)('GET /stats', () => {
        (0, vitest_1.it)('should return knowledge base stats', async () => {
            const req = (0, helpers_1.mockAuthRequest)();
            const res = (0, helpers_1.mockResponse)();
            helpers_1.prismaMock.user.findUnique.mockResolvedValue((0, helpers_1.createTestUser)());
            helpers_1.prismaMock.knowledgeBaseItem.findMany.mockResolvedValue([
                mockItem,
                { ...mockItem, id: 'kb-2', title: 'FAQ', category: 'Geral', content: 'Perguntas frequentes.' },
            ]);
            await simulateRequest('get', '/stats', req, res);
            (0, vitest_1.expect)(res.json).toHaveBeenCalledWith(vitest_1.expect.objectContaining({ total: 2, categories: 2, characters: vitest_1.expect.any(Number) }));
        });
    });
    (0, vitest_1.describe)('GET /categories', () => {
        (0, vitest_1.it)('should list unique categories', async () => {
            const req = (0, helpers_1.mockAuthRequest)();
            const res = (0, helpers_1.mockResponse)();
            helpers_1.prismaMock.user.findUnique.mockResolvedValue((0, helpers_1.createTestUser)());
            helpers_1.prismaMock.knowledgeBaseItem.findMany.mockResolvedValue([
                { ...mockItem, category: 'Tutorial' },
                { ...mockItem, id: 'kb-2', category: 'Geral' },
            ]);
            await simulateRequest('get', '/categories', req, res);
            (0, vitest_1.expect)(res.json).toHaveBeenCalledWith(vitest_1.expect.arrayContaining(['Tutorial', 'Geral']));
        });
    });
    (0, vitest_1.describe)('POST /', () => {
        (0, vitest_1.it)('should create a new knowledge base item', async () => {
            const req = (0, helpers_1.mockAuthRequest)({
                body: { title: 'Novo Artigo', content: 'Conteúdo do artigo.', category: 'Manual' },
            });
            const res = (0, helpers_1.mockResponse)();
            helpers_1.prismaMock.user.findUnique.mockResolvedValue((0, helpers_1.createTestUser)());
            helpers_1.prismaMock.knowledgeBaseItem.create.mockResolvedValue({
                ...mockItem,
                id: 'kb-3',
                title: 'Novo Artigo',
                category: 'Manual',
            });
            await simulateRequest('post', '/', req, res);
            (0, vitest_1.expect)(res.status).toHaveBeenCalledWith(201);
            (0, vitest_1.expect)(res.json).toHaveBeenCalledWith(vitest_1.expect.objectContaining({ title: 'Novo Artigo', category: 'Manual' }));
        });
        (0, vitest_1.it)('should reject creation without title', async () => {
            const req = (0, helpers_1.mockAuthRequest)({ body: { content: 'Some content' } });
            const res = (0, helpers_1.mockResponse)();
            helpers_1.prismaMock.user.findUnique.mockResolvedValue((0, helpers_1.createTestUser)());
            await simulateRequest('post', '/', req, res);
            (0, vitest_1.expect)(res.status).toHaveBeenCalledWith(400);
            (0, vitest_1.expect)(res.json).toHaveBeenCalledWith(vitest_1.expect.objectContaining({ error: vitest_1.expect.stringContaining('obrigatórios') }));
        });
        (0, vitest_1.it)('should reject creation when user has no organization', async () => {
            const req = (0, helpers_1.mockAuthRequest)({
                body: { title: 'Test', content: 'Content' },
            });
            const res = (0, helpers_1.mockResponse)();
            helpers_1.prismaMock.user.findUnique.mockResolvedValue((0, helpers_1.createTestUser)({ organizationId: null, organization: null }));
            await simulateRequest('post', '/', req, res);
            (0, vitest_1.expect)(res.status).toHaveBeenCalledWith(400);
            (0, vitest_1.expect)(res.json).toHaveBeenCalledWith(vitest_1.expect.objectContaining({ error: vitest_1.expect.any(String) }));
        });
    });
    (0, vitest_1.describe)('POST /ai-context', () => {
        (0, vitest_1.it)('should generate AI context from knowledge base', async () => {
            const req = (0, helpers_1.mockAuthRequest)();
            const res = (0, helpers_1.mockResponse)();
            helpers_1.prismaMock.user.findUnique.mockResolvedValue((0, helpers_1.createTestUser)());
            helpers_1.prismaMock.knowledgeBaseItem.findMany.mockResolvedValue([mockItem]);
            await simulateRequest('post', '/ai-context', req, res);
            (0, vitest_1.expect)(res.json).toHaveBeenCalledWith(vitest_1.expect.objectContaining({
                context: vitest_1.expect.stringContaining('BASE DE CONHECIMENTO'),
                itemCount: 1,
                totalCharacters: vitest_1.expect.any(Number),
            }));
        });
    });
    (0, vitest_1.describe)('PUT /:id', () => {
        (0, vitest_1.it)('should update a knowledge base item', async () => {
            const req = (0, helpers_1.mockAuthRequest)({
                params: { id: 'kb-1' },
                body: { title: 'Updated Title', content: 'Updated content.', category: 'Updated' },
            });
            const res = (0, helpers_1.mockResponse)();
            helpers_1.prismaMock.user.findUnique.mockResolvedValue((0, helpers_1.createTestUser)());
            helpers_1.prismaMock.knowledgeBaseItem.update.mockResolvedValue({
                ...mockItem,
                title: 'Updated Title',
                category: 'Updated',
                organizationId: 'test-org-id',
            });
            await simulateRequest('put', '/:id', req, res);
            (0, vitest_1.expect)(res.json).toHaveBeenCalledWith(vitest_1.expect.objectContaining({ title: 'Updated Title', category: 'Updated' }));
        });
        (0, vitest_1.it)('should reject update when user has no organization', async () => {
            const req = (0, helpers_1.mockAuthRequest)({ params: { id: 'kb-1' }, body: { title: 'Updated' } });
            const res = (0, helpers_1.mockResponse)();
            helpers_1.prismaMock.user.findUnique.mockResolvedValue((0, helpers_1.createTestUser)({ organizationId: null, organization: null }));
            await simulateRequest('put', '/:id', req, res);
            (0, vitest_1.expect)(res.status).toHaveBeenCalledWith(400);
        });
    });
    (0, vitest_1.describe)('DELETE /:id', () => {
        (0, vitest_1.it)('should delete a knowledge base item', async () => {
            const req = (0, helpers_1.mockAuthRequest)({ params: { id: 'kb-1' } });
            const res = (0, helpers_1.mockResponse)();
            helpers_1.prismaMock.user.findUnique.mockResolvedValue((0, helpers_1.createTestUser)());
            helpers_1.prismaMock.knowledgeBaseItem.findUnique.mockResolvedValue(mockItem);
            helpers_1.prismaMock.knowledgeBaseItem.delete.mockResolvedValue(mockItem);
            await simulateRequest('delete', '/:id', req, res);
            (0, vitest_1.expect)(res.json).toHaveBeenCalledWith(vitest_1.expect.objectContaining({ message: 'Item removido' }));
        });
        (0, vitest_1.it)('should return 404 when item not found', async () => {
            const req = (0, helpers_1.mockAuthRequest)({ params: { id: 'nonexistent' } });
            const res = (0, helpers_1.mockResponse)();
            helpers_1.prismaMock.user.findUnique.mockResolvedValue((0, helpers_1.createTestUser)());
            helpers_1.prismaMock.knowledgeBaseItem.findUnique.mockResolvedValue(null);
            await simulateRequest('delete', '/:id', req, res);
            (0, vitest_1.expect)(res.status).toHaveBeenCalledWith(404);
        });
    });
    (0, vitest_1.describe)('Error handling', () => {
        (0, vitest_1.it)('should handle database errors gracefully', async () => {
            const req = (0, helpers_1.mockAuthRequest)();
            const res = (0, helpers_1.mockResponse)();
            helpers_1.prismaMock.user.findUnique.mockRejectedValue(new Error('DB Error'));
            await simulateRequest('get', '/', req, res);
            (0, vitest_1.expect)(res.status).toHaveBeenCalledWith(500);
        });
    });
});
//# sourceMappingURL=knowledge-base.test.js.map