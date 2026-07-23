"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const vitest_1 = require("vitest");
const helpers_1 = require("./helpers");
const conversations_1 = __importDefault(require("../routes/conversations"));
function simulateRequest(method, path, req, res) {
    const route = conversations_1.default.stack.find((layer) => {
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
(0, vitest_1.describe)('Conversations Routes', () => {
    (0, vitest_1.beforeEach)(() => {
        (0, helpers_1.mockPrismaClear)();
    });
    const mockConversation = {
        id: 'conv-1',
        status: 'open',
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
    (0, vitest_1.describe)('POST /tags', () => {
        (0, vitest_1.it)('should create a new tag', async () => {
            const req = (0, helpers_1.mockAuthRequest)({ body: { name: 'Urgente', color: '#ef4444' } });
            const res = (0, helpers_1.mockResponse)();
            helpers_1.prismaMock.tag.create.mockResolvedValue({ ...mockTag, id: 'tag-2', name: 'Urgente', color: '#ef4444' });
            await simulateRequest('post', '/tags', req, res);
            (0, vitest_1.expect)(res.status).toHaveBeenCalledWith(201);
            (0, vitest_1.expect)(res.json).toHaveBeenCalledWith(vitest_1.expect.objectContaining({ name: 'Urgente', color: '#ef4444' }));
        });
    });
    (0, vitest_1.describe)('GET /tags', () => {
        (0, vitest_1.it)('should list all tags', async () => {
            const req = (0, helpers_1.mockAuthRequest)();
            const res = (0, helpers_1.mockResponse)();
            helpers_1.prismaMock.tag.findMany.mockResolvedValue([mockTag]);
            await simulateRequest('get', '/tags', req, res);
            (0, vitest_1.expect)(res.json).toHaveBeenCalledWith(vitest_1.expect.arrayContaining([
                vitest_1.expect.objectContaining({ id: 'tag-1', name: 'VIP' }),
            ]));
        });
        (0, vitest_1.it)('should return empty array when no tags exist', async () => {
            const req = (0, helpers_1.mockAuthRequest)();
            const res = (0, helpers_1.mockResponse)();
            helpers_1.prismaMock.tag.findMany.mockResolvedValue([]);
            await simulateRequest('get', '/tags', req, res);
            (0, vitest_1.expect)(res.json).toHaveBeenCalledWith([]);
        });
    });
    // ─── Conversations List ─────────────────────────────
    (0, vitest_1.describe)('GET /', () => {
        (0, vitest_1.it)('should list conversations for user organization', async () => {
            const req = (0, helpers_1.mockAuthRequest)();
            const res = (0, helpers_1.mockResponse)();
            helpers_1.prismaMock.user.findUnique.mockResolvedValue((0, helpers_1.createTestUser)());
            helpers_1.prismaMock.whatsAppNumber.findMany.mockResolvedValue([{ id: 'num-1' }]);
            helpers_1.prismaMock.conversation.findMany.mockResolvedValue([mockConversation]);
            await simulateRequest('get', '/', req, res);
            (0, vitest_1.expect)(res.json).toHaveBeenCalledWith(vitest_1.expect.arrayContaining([
                vitest_1.expect.objectContaining({ id: 'conv-1', status: 'open' }),
            ]));
        });
        (0, vitest_1.it)('should filter conversations by status', async () => {
            const req = (0, helpers_1.mockAuthRequest)({ query: { status: 'closed' } });
            const res = (0, helpers_1.mockResponse)();
            helpers_1.prismaMock.user.findUnique.mockResolvedValue((0, helpers_1.createTestUser)());
            helpers_1.prismaMock.whatsAppNumber.findMany.mockResolvedValue([{ id: 'num-1' }]);
            helpers_1.prismaMock.conversation.findMany.mockResolvedValue([]);
            await simulateRequest('get', '/', req, res);
            (0, vitest_1.expect)(helpers_1.prismaMock.conversation.findMany).toHaveBeenCalledWith(vitest_1.expect.objectContaining({
                where: vitest_1.expect.objectContaining({ status: 'closed' }),
            }));
        });
        (0, vitest_1.it)('should search conversations by contact name', async () => {
            const req = (0, helpers_1.mockAuthRequest)({ query: { search: 'John' } });
            const res = (0, helpers_1.mockResponse)();
            helpers_1.prismaMock.user.findUnique.mockResolvedValue((0, helpers_1.createTestUser)());
            helpers_1.prismaMock.whatsAppNumber.findMany.mockResolvedValue([{ id: 'num-1' }]);
            helpers_1.prismaMock.conversation.findMany.mockResolvedValue([mockConversation]);
            await simulateRequest('get', '/', req, res);
            (0, vitest_1.expect)(res.json).toHaveBeenCalledWith(vitest_1.expect.arrayContaining([
                vitest_1.expect.objectContaining({ id: 'conv-1' }),
            ]));
        });
    });
    // ─── Conversation Detail ────────────────────────────
    (0, vitest_1.describe)('GET /:id', () => {
        (0, vitest_1.it)('should return conversation detail with messages', async () => {
            const req = (0, helpers_1.mockAuthRequest)({ params: { id: 'conv-1' } });
            const res = (0, helpers_1.mockResponse)();
            helpers_1.prismaMock.conversation.findUnique.mockResolvedValue(mockConversation);
            await simulateRequest('get', '/:id', req, res);
            (0, vitest_1.expect)(res.json).toHaveBeenCalledWith(vitest_1.expect.objectContaining({
                id: 'conv-1',
                status: 'open',
                messages: vitest_1.expect.arrayContaining([
                    vitest_1.expect.objectContaining({ content: 'Olá!' }),
                ]),
            }));
        });
        (0, vitest_1.it)('should return 404 when conversation not found', async () => {
            const req = (0, helpers_1.mockAuthRequest)({ params: { id: 'nonexistent' } });
            const res = (0, helpers_1.mockResponse)();
            helpers_1.prismaMock.conversation.findUnique.mockResolvedValue(null);
            await simulateRequest('get', '/:id', req, res);
            (0, vitest_1.expect)(res.status).toHaveBeenCalledWith(404);
            (0, vitest_1.expect)(res.json).toHaveBeenCalledWith(vitest_1.expect.objectContaining({ error: 'Conversa não encontrada' }));
        });
    });
    // ─── Assign ─────────────────────────────────────────
    (0, vitest_1.describe)('POST /:id/assign', () => {
        (0, vitest_1.it)('should assign conversation to current user', async () => {
            const req = (0, helpers_1.mockAuthRequest)({ params: { id: 'conv-1' } });
            const res = (0, helpers_1.mockResponse)();
            helpers_1.prismaMock.conversation.update.mockResolvedValue({ ...mockConversation, userId: 'test-user-id' });
            await simulateRequest('post', '/:id/assign', req, res);
            (0, vitest_1.expect)(helpers_1.prismaMock.conversation.update).toHaveBeenCalledWith(vitest_1.expect.objectContaining({
                where: { id: 'conv-1' },
                data: { userId: 'test-user-id' },
            }));
            (0, vitest_1.expect)(res.json).toHaveBeenCalledWith(vitest_1.expect.objectContaining({ id: 'conv-1' }));
        });
    });
    // ─── Status Update ──────────────────────────────────
    (0, vitest_1.describe)('PUT /:id/status', () => {
        (0, vitest_1.it)('should update conversation status', async () => {
            const req = (0, helpers_1.mockAuthRequest)({
                params: { id: 'conv-1' },
                body: { status: 'closed' },
            });
            const res = (0, helpers_1.mockResponse)();
            helpers_1.prismaMock.conversation.update.mockResolvedValue({ ...mockConversation, status: 'closed' });
            await simulateRequest('put', '/:id/status', req, res);
            (0, vitest_1.expect)(res.json).toHaveBeenCalledWith(vitest_1.expect.objectContaining({ status: 'closed' }));
        });
    });
    // ─── Tags on Conversations ──────────────────────────
    (0, vitest_1.describe)('POST /:id/tags', () => {
        (0, vitest_1.it)('should add a tag to conversation', async () => {
            const req = (0, helpers_1.mockAuthRequest)({
                params: { id: 'conv-1' },
                body: { tagId: 'tag-1' },
            });
            const res = (0, helpers_1.mockResponse)();
            helpers_1.prismaMock.conversationTag.create.mockResolvedValue({
                conversationId: 'conv-1',
                tagId: 'tag-1',
            });
            await simulateRequest('post', '/:id/tags', req, res);
            (0, vitest_1.expect)(res.json).toHaveBeenCalledWith(vitest_1.expect.objectContaining({ message: 'Tag adicionada' }));
        });
    });
    (0, vitest_1.describe)('DELETE /:id/tags/:tagId', () => {
        (0, vitest_1.it)('should remove a tag from conversation', async () => {
            const req = (0, helpers_1.mockAuthRequest)({ params: { id: 'conv-1', tagId: 'tag-1' } });
            const res = (0, helpers_1.mockResponse)();
            helpers_1.prismaMock.conversationTag.delete.mockResolvedValue({
                conversationId: 'conv-1',
                tagId: 'tag-1',
            });
            await simulateRequest('delete', '/:id/tags/:tagId', req, res);
            (0, vitest_1.expect)(res.json).toHaveBeenCalledWith(vitest_1.expect.objectContaining({ message: 'Tag removida' }));
        });
    });
    (0, vitest_1.describe)('Error handling', () => {
        (0, vitest_1.it)('should handle database errors gracefully', async () => {
            const req = (0, helpers_1.mockAuthRequest)();
            const res = (0, helpers_1.mockResponse)();
            helpers_1.prismaMock.user.findUnique.mockRejectedValue(new Error('DB Error'));
            await simulateRequest('get', '/', req, res);
            (0, vitest_1.expect)(res.status).toHaveBeenCalledWith(500);
            (0, vitest_1.expect)(res.json).toHaveBeenCalledWith(vitest_1.expect.objectContaining({ error: vitest_1.expect.any(String) }));
        });
        (0, vitest_1.it)('should return 401 when user not in request for list', async () => {
            const req = (0, helpers_1.mockAuthRequest)({ user: undefined });
            const res = (0, helpers_1.mockResponse)();
            await simulateRequest('get', '/', req, res);
            (0, vitest_1.expect)(res.status).toHaveBeenCalledWith(401);
        });
    });
});
//# sourceMappingURL=conversations.test.js.map