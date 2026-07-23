"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const vitest_1 = require("vitest");
const helpers_1 = require("./helpers");
const remarketing_1 = __importDefault(require("../routes/remarketing"));
function simulateRequest(method, path, req, res) {
    const route = remarketing_1.default.stack.find((layer) => {
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
(0, vitest_1.describe)('Remarketing Routes', () => {
    (0, vitest_1.beforeEach)(() => {
        (0, helpers_1.mockPrismaClear)();
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
    (0, vitest_1.describe)('GET /', () => {
        (0, vitest_1.it)('should list all remarketing sequences', async () => {
            const req = (0, helpers_1.mockAuthRequest)();
            const res = (0, helpers_1.mockResponse)();
            helpers_1.prismaMock.remarketingSequence.findMany.mockResolvedValue([mockSequence]);
            await simulateRequest('get', '/', req, res);
            (0, vitest_1.expect)(res.json).toHaveBeenCalledWith(vitest_1.expect.arrayContaining([
                vitest_1.expect.objectContaining({
                    id: 'seq-1',
                    name: 'Follow-up 7 dias',
                    _count: { executions: 15 },
                }),
            ]));
        });
        (0, vitest_1.it)('should return empty array when no sequences exist', async () => {
            const req = (0, helpers_1.mockAuthRequest)();
            const res = (0, helpers_1.mockResponse)();
            helpers_1.prismaMock.remarketingSequence.findMany.mockResolvedValue([]);
            await simulateRequest('get', '/', req, res);
            (0, vitest_1.expect)(res.json).toHaveBeenCalledWith([]);
        });
    });
    (0, vitest_1.describe)('POST /', () => {
        (0, vitest_1.it)('should create a new remarketing sequence', async () => {
            const req = (0, helpers_1.mockAuthRequest)({
                body: {
                    name: 'Nova Sequência',
                    description: 'Descrição da sequência',
                    steps: [
                        { delay: 3600, message: 'Primeira mensagem' },
                        { delay: 86400, message: 'Segunda mensagem' },
                    ],
                },
            });
            const res = (0, helpers_1.mockResponse)();
            helpers_1.prismaMock.remarketingSequence.create.mockResolvedValue(mockSequence);
            await simulateRequest('post', '/', req, res);
            (0, vitest_1.expect)(res.status).toHaveBeenCalledWith(201);
            (0, vitest_1.expect)(res.json).toHaveBeenCalledWith(vitest_1.expect.objectContaining({ id: 'seq-1', name: 'Follow-up 7 dias' }));
        });
    });
    (0, vitest_1.describe)('PUT /:id', () => {
        (0, vitest_1.it)('should update a remarketing sequence', async () => {
            const req = (0, helpers_1.mockAuthRequest)({
                params: { id: 'seq-1' },
                body: { name: 'Updated Sequence', isActive: false },
            });
            const res = (0, helpers_1.mockResponse)();
            helpers_1.prismaMock.remarketingSequence.update.mockResolvedValue({
                ...mockSequence,
                name: 'Updated Sequence',
                isActive: false,
            });
            await simulateRequest('put', '/:id', req, res);
            (0, vitest_1.expect)(res.json).toHaveBeenCalledWith(vitest_1.expect.objectContaining({ name: 'Updated Sequence', isActive: false }));
        });
    });
    (0, vitest_1.describe)('DELETE /:id', () => {
        (0, vitest_1.it)('should delete a remarketing sequence', async () => {
            const req = (0, helpers_1.mockAuthRequest)({ params: { id: 'seq-1' } });
            const res = (0, helpers_1.mockResponse)();
            helpers_1.prismaMock.remarketingSequence.delete.mockResolvedValue(mockSequence);
            await simulateRequest('delete', '/:id', req, res);
            (0, vitest_1.expect)(res.json).toHaveBeenCalledWith(vitest_1.expect.objectContaining({ message: 'Sequência removida' }));
        });
    });
    (0, vitest_1.describe)('Error handling', () => {
        (0, vitest_1.it)('should handle database errors gracefully', async () => {
            const req = (0, helpers_1.mockAuthRequest)();
            const res = (0, helpers_1.mockResponse)();
            helpers_1.prismaMock.remarketingSequence.findMany.mockRejectedValue(new Error('DB Error'));
            await simulateRequest('get', '/', req, res);
            (0, vitest_1.expect)(res.status).toHaveBeenCalledWith(500);
        });
    });
});
//# sourceMappingURL=remarketing.test.js.map