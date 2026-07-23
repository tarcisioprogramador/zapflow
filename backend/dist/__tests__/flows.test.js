"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const vitest_1 = require("vitest");
const helpers_1 = require("./helpers");
const flows_1 = __importDefault(require("../routes/flows"));
function simulateRequest(method, path, req, res) {
    const route = flows_1.default.stack.find((layer) => {
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
(0, vitest_1.describe)('Flows Routes', () => {
    (0, vitest_1.beforeEach)(() => {
        (0, helpers_1.mockPrismaClear)();
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
    (0, vitest_1.describe)('GET /', () => {
        (0, vitest_1.it)('should list all flows for authenticated user', async () => {
            const req = (0, helpers_1.mockAuthRequest)();
            const res = (0, helpers_1.mockResponse)();
            helpers_1.prismaMock.flow.findMany.mockResolvedValue([mockFlow]);
            await simulateRequest('get', '/', req, res);
            (0, vitest_1.expect)(res.json).toHaveBeenCalledWith(vitest_1.expect.arrayContaining([
                vitest_1.expect.objectContaining({ id: 'flow-1', name: 'Boas-vindas' }),
            ]));
            (0, vitest_1.expect)(helpers_1.prismaMock.flow.findMany).toHaveBeenCalledWith(vitest_1.expect.objectContaining({
                where: { userId: 'test-user-id' },
            }));
        });
        (0, vitest_1.it)('should return empty array when no flows exist', async () => {
            const req = (0, helpers_1.mockAuthRequest)();
            const res = (0, helpers_1.mockResponse)();
            helpers_1.prismaMock.flow.findMany.mockResolvedValue([]);
            await simulateRequest('get', '/', req, res);
            (0, vitest_1.expect)(res.json).toHaveBeenCalledWith([]);
        });
    });
    // ─── Get by ID ──────────────────────────────────────
    (0, vitest_1.describe)('GET /:id', () => {
        (0, vitest_1.it)('should return a specific flow by id', async () => {
            const req = (0, helpers_1.mockAuthRequest)({ params: { id: 'flow-1' } });
            const res = (0, helpers_1.mockResponse)();
            helpers_1.prismaMock.flow.findUnique.mockResolvedValue(mockFlow);
            await simulateRequest('get', '/:id', req, res);
            (0, vitest_1.expect)(res.json).toHaveBeenCalledWith(vitest_1.expect.objectContaining({ id: 'flow-1', name: 'Boas-vindas' }));
        });
        (0, vitest_1.it)('should return 404 when flow not found', async () => {
            const req = (0, helpers_1.mockAuthRequest)({ params: { id: 'nonexistent' } });
            const res = (0, helpers_1.mockResponse)();
            helpers_1.prismaMock.flow.findUnique.mockResolvedValue(null);
            await simulateRequest('get', '/:id', req, res);
            (0, vitest_1.expect)(res.status).toHaveBeenCalledWith(404);
            (0, vitest_1.expect)(res.json).toHaveBeenCalledWith(vitest_1.expect.objectContaining({ error: 'Fluxo não encontrado' }));
        });
    });
    // ─── Create ─────────────────────────────────────────
    (0, vitest_1.describe)('POST /', () => {
        (0, vitest_1.it)('should create a new flow with default start node', async () => {
            const req = (0, helpers_1.mockAuthRequest)({
                body: { name: 'Novo Fluxo', description: 'Fluxo de teste', triggerType: 'keyword', triggerValue: 'teste' },
            });
            const res = (0, helpers_1.mockResponse)();
            helpers_1.prismaMock.flow.create.mockResolvedValue(mockFlow);
            await simulateRequest('post', '/', req, res);
            (0, vitest_1.expect)(res.status).toHaveBeenCalledWith(201);
            (0, vitest_1.expect)(res.json).toHaveBeenCalledWith(vitest_1.expect.objectContaining({ id: 'flow-1', name: 'Boas-vindas' }));
            (0, vitest_1.expect)(helpers_1.prismaMock.flow.create).toHaveBeenCalledWith(vitest_1.expect.objectContaining({
                data: vitest_1.expect.objectContaining({
                    userId: 'test-user-id',
                    nodes: vitest_1.expect.any(String),
                    edges: '[]',
                }),
            }));
        });
        (0, vitest_1.it)('should create flow with default name when not provided', async () => {
            const req = (0, helpers_1.mockAuthRequest)({ body: {} });
            const res = (0, helpers_1.mockResponse)();
            helpers_1.prismaMock.flow.create.mockResolvedValue({ ...mockFlow, name: 'Novo Fluxo' });
            await simulateRequest('post', '/', req, res);
            (0, vitest_1.expect)(helpers_1.prismaMock.flow.create).toHaveBeenCalledWith(vitest_1.expect.objectContaining({
                data: vitest_1.expect.objectContaining({ name: 'Novo Fluxo' }),
            }));
        });
    });
    // ─── Update ─────────────────────────────────────────
    (0, vitest_1.describe)('PUT /:id', () => {
        (0, vitest_1.it)('should update a flow', async () => {
            const req = (0, helpers_1.mockAuthRequest)({
                params: { id: 'flow-1' },
                body: { name: 'Updated Flow', isActive: true },
            });
            const res = (0, helpers_1.mockResponse)();
            helpers_1.prismaMock.flow.findUnique.mockResolvedValue(mockFlow);
            helpers_1.prismaMock.flow.update.mockResolvedValue({ ...mockFlow, name: 'Updated Flow' });
            await simulateRequest('put', '/:id', req, res);
            (0, vitest_1.expect)(res.json).toHaveBeenCalledWith(vitest_1.expect.objectContaining({ name: 'Updated Flow' }));
        });
        (0, vitest_1.it)('should return 404 when flow to update not found', async () => {
            const req = (0, helpers_1.mockAuthRequest)({ params: { id: 'nonexistent' }, body: { name: 'Updated' } });
            const res = (0, helpers_1.mockResponse)();
            helpers_1.prismaMock.flow.findUnique.mockResolvedValue(null);
            await simulateRequest('put', '/:id', req, res);
            (0, vitest_1.expect)(res.status).toHaveBeenCalledWith(404);
        });
        (0, vitest_1.it)('should serialize nodes if provided as object', async () => {
            const req = (0, helpers_1.mockAuthRequest)({
                params: { id: 'flow-1' },
                body: {
                    nodes: [{ id: 'n1', type: 'message', position: { x: 0, y: 0 }, data: { message: 'Hello' } }],
                },
            });
            const res = (0, helpers_1.mockResponse)();
            helpers_1.prismaMock.flow.findUnique.mockResolvedValue(mockFlow);
            helpers_1.prismaMock.flow.update.mockResolvedValue(mockFlow);
            await simulateRequest('put', '/:id', req, res);
            (0, vitest_1.expect)(helpers_1.prismaMock.flow.update).toHaveBeenCalledWith(vitest_1.expect.objectContaining({
                data: vitest_1.expect.objectContaining({
                    nodes: vitest_1.expect.any(String),
                }),
            }));
        });
    });
    // ─── Toggle ─────────────────────────────────────────
    (0, vitest_1.describe)('PUT /:id/toggle', () => {
        (0, vitest_1.it)('should toggle flow active state', async () => {
            const req = (0, helpers_1.mockAuthRequest)({ params: { id: 'flow-1' } });
            const res = (0, helpers_1.mockResponse)();
            helpers_1.prismaMock.flow.findUnique.mockResolvedValue({ ...mockFlow, isActive: false });
            helpers_1.prismaMock.flow.update.mockResolvedValue({ ...mockFlow, isActive: true });
            await simulateRequest('put', '/:id/toggle', req, res);
            (0, vitest_1.expect)(res.json).toHaveBeenCalledWith(vitest_1.expect.objectContaining({ isActive: true }));
        });
        (0, vitest_1.it)('should toggle from active to inactive', async () => {
            const req = (0, helpers_1.mockAuthRequest)({ params: { id: 'flow-1' } });
            const res = (0, helpers_1.mockResponse)();
            helpers_1.prismaMock.flow.findUnique.mockResolvedValue(mockFlow);
            helpers_1.prismaMock.flow.update.mockResolvedValue({ ...mockFlow, isActive: false });
            await simulateRequest('put', '/:id/toggle', req, res);
            (0, vitest_1.expect)(res.json).toHaveBeenCalledWith(vitest_1.expect.objectContaining({ isActive: false }));
        });
    });
    // ─── Delete ─────────────────────────────────────────
    (0, vitest_1.describe)('DELETE /:id', () => {
        (0, vitest_1.it)('should delete a flow', async () => {
            const req = (0, helpers_1.mockAuthRequest)({ params: { id: 'flow-1' } });
            const res = (0, helpers_1.mockResponse)();
            helpers_1.prismaMock.flow.findUnique.mockResolvedValue(mockFlow);
            helpers_1.prismaMock.flow.delete.mockResolvedValue(mockFlow);
            await simulateRequest('delete', '/:id', req, res);
            (0, vitest_1.expect)(res.json).toHaveBeenCalledWith(vitest_1.expect.objectContaining({ message: 'Fluxo removido' }));
        });
    });
    // ─── Templates ──────────────────────────────────────
    (0, vitest_1.describe)('GET /templates', () => {
        (0, vitest_1.it)('should return list of flow templates', async () => {
            const req = (0, helpers_1.mockAuthRequest)();
            const res = (0, helpers_1.mockResponse)();
            await simulateRequest('get', '/templates', req, res);
            (0, vitest_1.expect)(res.json).toHaveBeenCalledWith(vitest_1.expect.arrayContaining([
                vitest_1.expect.objectContaining({
                    name: 'Boas-vindas Automático',
                    triggerType: 'keyword',
                    nodes: vitest_1.expect.any(Array),
                    edges: vitest_1.expect.any(Array),
                }),
                vitest_1.expect.objectContaining({ name: 'Qualificação de Leads' }),
                vitest_1.expect.objectContaining({ name: 'Suporte Técnico' }),
                vitest_1.expect.objectContaining({ name: 'Agendamento de Reunião' }),
                vitest_1.expect.objectContaining({ name: 'Recuperação de Carrinho' }),
            ]));
        });
    });
    // ─── From Template ──────────────────────────────────
    (0, vitest_1.describe)('POST /from-template', () => {
        (0, vitest_1.it)('should create a flow from a valid template', async () => {
            const req = (0, helpers_1.mockAuthRequest)({
                body: { templateName: 'Boas-vindas Automático', description: 'Meu fluxo de boas-vindas' },
            });
            const res = (0, helpers_1.mockResponse)();
            helpers_1.prismaMock.flow.create.mockResolvedValue({
                ...mockFlow,
                name: 'Boas-vindas Automático',
                description: 'Meu fluxo de boas-vindas',
            });
            await simulateRequest('post', '/from-template', req, res);
            (0, vitest_1.expect)(res.status).toHaveBeenCalledWith(201);
            (0, vitest_1.expect)(res.json).toHaveBeenCalledWith(vitest_1.expect.objectContaining({ name: 'Boas-vindas Automático' }));
        });
        (0, vitest_1.it)('should return 404 for invalid template name', async () => {
            const req = (0, helpers_1.mockAuthRequest)({ body: { templateName: 'Invalid Template' } });
            const res = (0, helpers_1.mockResponse)();
            await simulateRequest('post', '/from-template', req, res);
            (0, vitest_1.expect)(res.status).toHaveBeenCalledWith(404);
            (0, vitest_1.expect)(res.json).toHaveBeenCalledWith(vitest_1.expect.objectContaining({ error: 'Template não encontrado' }));
        });
    });
    // ─── Duplicate ──────────────────────────────────────
    (0, vitest_1.describe)('POST /:id/duplicate', () => {
        (0, vitest_1.it)('should duplicate a flow with suffix (Cópia)', async () => {
            const req = (0, helpers_1.mockAuthRequest)({ params: { id: 'flow-1' } });
            const res = (0, helpers_1.mockResponse)();
            helpers_1.prismaMock.flow.findUnique.mockResolvedValue(mockFlow);
            helpers_1.prismaMock.flow.create.mockResolvedValue({ ...mockFlow, id: 'flow-2', name: 'Boas-vindas (Cópia)' });
            await simulateRequest('post', '/:id/duplicate', req, res);
            (0, vitest_1.expect)(res.status).toHaveBeenCalledWith(201);
            (0, vitest_1.expect)(helpers_1.prismaMock.flow.create).toHaveBeenCalledWith(vitest_1.expect.objectContaining({
                data: vitest_1.expect.objectContaining({ name: 'Boas-vindas (Cópia)' }),
            }));
        });
        (0, vitest_1.it)('should return 404 when flow to duplicate not found', async () => {
            const req = (0, helpers_1.mockAuthRequest)({ params: { id: 'nonexistent' } });
            const res = (0, helpers_1.mockResponse)();
            helpers_1.prismaMock.flow.findUnique.mockResolvedValue(null);
            await simulateRequest('post', '/:id/duplicate', req, res);
            (0, vitest_1.expect)(res.status).toHaveBeenCalledWith(404);
        });
    });
    (0, vitest_1.describe)('Error handling', () => {
        (0, vitest_1.it)('should handle database errors gracefully on list', async () => {
            const req = (0, helpers_1.mockAuthRequest)();
            const res = (0, helpers_1.mockResponse)();
            helpers_1.prismaMock.flow.findMany.mockRejectedValue(new Error('DB Error'));
            await simulateRequest('get', '/', req, res);
            (0, vitest_1.expect)(res.status).toHaveBeenCalledWith(500);
            (0, vitest_1.expect)(res.json).toHaveBeenCalledWith(vitest_1.expect.objectContaining({ error: vitest_1.expect.any(String) }));
        });
        (0, vitest_1.it)('should handle errors when creating from template fails', async () => {
            const req = (0, helpers_1.mockAuthRequest)({
                body: { templateName: 'Boas-vindas Automático' },
            });
            const res = (0, helpers_1.mockResponse)();
            helpers_1.prismaMock.flow.create.mockRejectedValue(new Error('DB Error'));
            await simulateRequest('post', '/from-template', req, res);
            (0, vitest_1.expect)(res.status).toHaveBeenCalledWith(500);
        });
    });
});
//# sourceMappingURL=flows.test.js.map