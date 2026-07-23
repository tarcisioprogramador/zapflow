"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.prismaMock = void 0;
exports.createPrismaMock = createPrismaMock;
exports.mockResponse = mockResponse;
exports.mockAuthRequest = mockAuthRequest;
exports.createTestUser = createTestUser;
exports.mockPrismaClear = mockPrismaClear;
const vitest_1 = require("vitest");
function createDelegateMock() {
    return {
        findUnique: vitest_1.vi.fn(),
        findFirst: vitest_1.vi.fn(),
        findMany: vitest_1.vi.fn(),
        create: vitest_1.vi.fn(),
        update: vitest_1.vi.fn(),
        updateMany: vitest_1.vi.fn(),
        delete: vitest_1.vi.fn(),
        deleteMany: vitest_1.vi.fn(),
        count: vitest_1.vi.fn(),
        upsert: vitest_1.vi.fn(),
        groupBy: vitest_1.vi.fn(),
        aggregate: vitest_1.vi.fn(),
    };
}
function createPrismaMock() {
    return {
        user: createDelegateMock(),
        organization: createDelegateMock(),
        whatsAppNumber: createDelegateMock(),
        conversation: createDelegateMock(),
        message: createDelegateMock(),
        contact: createDelegateMock(),
        campaign: createDelegateMock(),
        campaignContact: createDelegateMock(),
        flow: createDelegateMock(),
        flowExecution: createDelegateMock(),
        crmBoard: createDelegateMock(),
        crmStage: createDelegateMock(),
        crmCard: createDelegateMock(),
        knowledgeBaseItem: createDelegateMock(),
        webhook: createDelegateMock(),
        remarketingSequence: createDelegateMock(),
        remarketingExecution: createDelegateMock(),
        tag: createDelegateMock(),
        conversationTag: createDelegateMock(),
        refreshToken: createDelegateMock(),
        payment: createDelegateMock(),
        $on: vitest_1.vi.fn(),
        $connect: vitest_1.vi.fn(),
        $disconnect: vitest_1.vi.fn(),
        $use: vitest_1.vi.fn(),
        $transaction: vitest_1.vi.fn(),
    };
}
// ─── Mock Prisma module ─────────────────────────────────────
const prismaMock = createPrismaMock();
exports.prismaMock = prismaMock;
vitest_1.vi.mock('../config/database', () => ({
    default: prismaMock,
    prisma: prismaMock,
}));
vitest_1.vi.mock('ioredis', () => {
    const RedisMock = vitest_1.vi.fn(() => ({
        on: vitest_1.vi.fn(),
        set: vitest_1.vi.fn(),
        get: vitest_1.vi.fn(),
        del: vitest_1.vi.fn(),
        quit: vitest_1.vi.fn(),
    }));
    return { default: RedisMock };
});
// ─── Express Mock Helpers ───────────────────────────────────
function mockResponse() {
    const res = {};
    res.status = vitest_1.vi.fn().mockReturnValue(res);
    res.json = vitest_1.vi.fn().mockReturnValue(res);
    res.send = vitest_1.vi.fn().mockReturnValue(res);
    res.sendStatus = vitest_1.vi.fn().mockReturnValue(res);
    res.set = vitest_1.vi.fn().mockReturnValue(res);
    res.end = vitest_1.vi.fn().mockReturnValue(res);
    res.cookie = vitest_1.vi.fn().mockReturnValue(res);
    res.clearCookie = vitest_1.vi.fn().mockReturnValue(res);
    return res;
}
function mockAuthRequest(overrides = {}) {
    return {
        user: { userId: 'test-user-id', email: 'test@email.com', role: 'OWNER' },
        params: {},
        query: {},
        body: {},
        headers: { authorization: 'Bearer test-token' },
        get: vitest_1.vi.fn().mockReturnValue('localhost:3001'),
        protocol: 'https',
        app: { get: vitest_1.vi.fn().mockReturnValue(null) },
        ip: '127.0.0.1',
        socket: { remoteAddress: '127.0.0.1' },
        ...overrides,
    };
}
function createTestUser(overrides = {}) {
    return {
        id: 'test-user-id',
        name: 'Test User',
        email: 'test@email.com',
        password: '$2a$12$hashedpassword',
        role: 'OWNER',
        plan: 'FREE',
        organizationId: 'test-org-id',
        avatar: null,
        phone: null,
        createdAt: new Date(),
        updatedAt: new Date(),
        organization: {
            id: 'test-org-id',
            name: 'Test Org',
            plan: 'FREE',
            logo: null,
            mpCustomerId: null,
            mpSubscriptionId: null,
            createdAt: new Date(),
            updatedAt: new Date(),
        },
        ...overrides,
    };
}
function mockPrismaClear() {
    Object.values(prismaMock).forEach((delegate) => {
        if (typeof delegate === 'object' && delegate !== null) {
            Object.values(delegate).forEach((fn) => {
                if (typeof fn?.mockClear === 'function')
                    fn.mockClear();
            });
        }
    });
}
//# sourceMappingURL=helpers.js.map