"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const vitest_1 = require("vitest");
const helpers_1 = require("./helpers");
const users_1 = __importDefault(require("../routes/users"));
function simulateRequest(method, path, req, res) {
    const route = users_1.default.stack.find((layer) => {
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
(0, vitest_1.describe)('Users Routes', () => {
    (0, vitest_1.beforeEach)(() => {
        (0, helpers_1.mockPrismaClear)();
    });
    const mockOrgUser = {
        id: 'other-user-id',
        name: 'Other User',
        email: 'other@email.com',
        role: 'ATTENDANT',
        avatar: null,
        createdAt: new Date(),
    };
    (0, vitest_1.describe)('GET /', () => {
        (0, vitest_1.it)('should list all users in the organization', async () => {
            const req = (0, helpers_1.mockAuthRequest)();
            const res = (0, helpers_1.mockResponse)();
            helpers_1.prismaMock.user.findUnique.mockResolvedValue((0, helpers_1.createTestUser)());
            helpers_1.prismaMock.user.findMany.mockResolvedValue([mockOrgUser]);
            await simulateRequest('get', '/', req, res);
            (0, vitest_1.expect)(res.json).toHaveBeenCalledWith(vitest_1.expect.arrayContaining([
                vitest_1.expect.objectContaining({ id: 'other-user-id', name: 'Other User' }),
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
    (0, vitest_1.describe)('POST /', () => {
        (0, vitest_1.it)('should invite a new user to the organization', async () => {
            const req = (0, helpers_1.mockAuthRequest)({
                body: { name: 'New Member', email: 'new@email.com', password: 'password123', role: 'ATTENDANT' },
            });
            const res = (0, helpers_1.mockResponse)();
            helpers_1.prismaMock.user.findUnique.mockResolvedValue((0, helpers_1.createTestUser)());
            helpers_1.prismaMock.user.create.mockResolvedValue({
                id: 'new-user-id',
                name: 'New Member',
                email: 'new@email.com',
                role: 'ATTENDANT',
            });
            await simulateRequest('post', '/', req, res);
            (0, vitest_1.expect)(res.status).toHaveBeenCalledWith(201);
            (0, vitest_1.expect)(res.json).toHaveBeenCalledWith(vitest_1.expect.objectContaining({ name: 'New Member', email: 'new@email.com', role: 'ATTENDANT' }));
        });
        (0, vitest_1.it)('should reject invitation with missing fields', async () => {
            const req = (0, helpers_1.mockAuthRequest)({ body: { name: 'Only Name' } });
            const res = (0, helpers_1.mockResponse)();
            helpers_1.prismaMock.user.findUnique.mockResolvedValue((0, helpers_1.createTestUser)());
            await simulateRequest('post', '/', req, res);
            (0, vitest_1.expect)(res.status).toHaveBeenCalledWith(400);
            (0, vitest_1.expect)(res.json).toHaveBeenCalledWith(vitest_1.expect.objectContaining({ error: vitest_1.expect.any(String) }));
        });
        (0, vitest_1.it)('should reject invitation when user has no organization', async () => {
            const req = (0, helpers_1.mockAuthRequest)({
                body: { name: 'New', email: 'new@email.com', password: '123456' },
            });
            const res = (0, helpers_1.mockResponse)();
            helpers_1.prismaMock.user.findUnique.mockResolvedValue((0, helpers_1.createTestUser)({ organizationId: null, organization: null }));
            await simulateRequest('post', '/', req, res);
            (0, vitest_1.expect)(res.status).toHaveBeenCalledWith(400);
        });
    });
    (0, vitest_1.describe)('PUT /:id', () => {
        (0, vitest_1.it)('should update a user role', async () => {
            const req = (0, helpers_1.mockAuthRequest)({
                params: { id: 'other-user-id' },
                body: { role: 'ADMIN' },
            });
            const res = (0, helpers_1.mockResponse)();
            helpers_1.prismaMock.user.update.mockResolvedValue({
                id: 'other-user-id',
                name: 'Other User',
                email: 'other@email.com',
                role: 'ADMIN',
            });
            await simulateRequest('put', '/:id', req, res);
            (0, vitest_1.expect)(res.json).toHaveBeenCalledWith(vitest_1.expect.objectContaining({ role: 'ADMIN' }));
        });
    });
    (0, vitest_1.describe)('DELETE /:id', () => {
        (0, vitest_1.it)('should remove a user from the organization', async () => {
            const req = (0, helpers_1.mockAuthRequest)({ params: { id: 'other-user-id' } });
            const res = (0, helpers_1.mockResponse)();
            helpers_1.prismaMock.user.delete.mockResolvedValue({ id: 'other-user-id' });
            await simulateRequest('delete', '/:id', req, res);
            (0, vitest_1.expect)(res.json).toHaveBeenCalledWith(vitest_1.expect.objectContaining({ message: 'Usuário removido' }));
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
//# sourceMappingURL=users.test.js.map