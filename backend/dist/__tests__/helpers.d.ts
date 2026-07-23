import { vi } from 'vitest';
import { Response } from 'express';
interface PrismaDelegateMock {
    findUnique: ReturnType<typeof vi.fn>;
    findFirst: ReturnType<typeof vi.fn>;
    findMany: ReturnType<typeof vi.fn>;
    create: ReturnType<typeof vi.fn>;
    update: ReturnType<typeof vi.fn>;
    updateMany: ReturnType<typeof vi.fn>;
    delete: ReturnType<typeof vi.fn>;
    deleteMany: ReturnType<typeof vi.fn>;
    count: ReturnType<typeof vi.fn>;
    upsert: ReturnType<typeof vi.fn>;
    groupBy: ReturnType<typeof vi.fn>;
    aggregate: ReturnType<typeof vi.fn>;
}
interface PrismaMock {
    user: PrismaDelegateMock;
    organization: PrismaDelegateMock;
    whatsAppNumber: PrismaDelegateMock;
    conversation: PrismaDelegateMock;
    message: PrismaDelegateMock;
    contact: PrismaDelegateMock;
    campaign: PrismaDelegateMock;
    campaignContact: PrismaDelegateMock;
    flow: PrismaDelegateMock;
    flowExecution: PrismaDelegateMock;
    crmBoard: PrismaDelegateMock;
    crmStage: PrismaDelegateMock;
    crmCard: PrismaDelegateMock;
    knowledgeBaseItem: PrismaDelegateMock;
    webhook: PrismaDelegateMock;
    remarketingSequence: PrismaDelegateMock;
    remarketingExecution: PrismaDelegateMock;
    tag: PrismaDelegateMock;
    conversationTag: PrismaDelegateMock;
    refreshToken: PrismaDelegateMock;
    payment: PrismaDelegateMock;
    $on: ReturnType<typeof vi.fn>;
    $connect: ReturnType<typeof vi.fn>;
    $disconnect: ReturnType<typeof vi.fn>;
    $use: ReturnType<typeof vi.fn>;
    $transaction: ReturnType<typeof vi.fn>;
}
export declare function createPrismaMock(): PrismaMock;
declare const prismaMock: PrismaMock;
export declare function mockResponse(): Response;
export declare function mockAuthRequest(overrides?: Partial<any>): any;
export interface TestUser {
    id: string;
    name: string;
    email: string;
    password: string;
    role: string;
    plan: string;
    organizationId: string | null;
    avatar: string | null;
    phone: string | null;
    createdAt: Date;
    updatedAt: Date;
    organization: {
        id: string;
        name: string;
        plan: string;
        logo: string | null;
        mpCustomerId: string | null;
        mpSubscriptionId: string | null;
        createdAt: Date;
        updatedAt: Date;
    } | null;
}
export declare function createTestUser(overrides?: Partial<TestUser>): TestUser;
export declare function mockPrismaClear(): void;
export { prismaMock };
//# sourceMappingURL=helpers.d.ts.map