import { vi } from 'vitest';
import { Request, Response } from 'express';

// ─── Prisma Mock ────────────────────────────────────────────

type DeepMockProxy<T> = {
  [K in keyof T]: T[K] extends (...args: infer A) => infer R
    ? ReturnType<typeof vi.fn> & ((...args: A) => R)
    : T[K] extends object
      ? DeepMockProxy<T[K]>
      : T[K];
} & T;

interface PrismaDelegateMock {
  findUnique: ReturnType<typeof vi.fn>;
  findFirst: ReturnType<typeof vi.fn>;
  findMany: ReturnType<typeof vi.fn>;
  create: ReturnType<typeof vi.fn>;
  update: ReturnType<typeof vi.fn>;
  delete: ReturnType<typeof vi.fn>;
  count: ReturnType<typeof vi.fn>;
  upsert: ReturnType<typeof vi.fn>;
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
  $on: ReturnType<typeof vi.fn>;
  $connect: ReturnType<typeof vi.fn>;
  $disconnect: ReturnType<typeof vi.fn>;
  $use: ReturnType<typeof vi.fn>;
  $transaction: ReturnType<typeof vi.fn>;
}

function createDelegateMock(): PrismaDelegateMock {
  return {
    findUnique: vi.fn(),
    findFirst: vi.fn(),
    findMany: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
    count: vi.fn(),
    upsert: vi.fn(),
  };
}

export function createPrismaMock(): PrismaMock {
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
    $on: vi.fn(),
    $connect: vi.fn(),
    $disconnect: vi.fn(),
    $use: vi.fn(),
    $transaction: vi.fn(),
  };
}

// ─── Mock Prisma module ─────────────────────────────────────

const prismaMock = createPrismaMock();

vi.mock('../config/database', () => ({
  default: prismaMock,
  prisma: prismaMock,
}));

vi.mock('ioredis', () => {
  const RedisMock = vi.fn(() => ({
    on: vi.fn(),
    set: vi.fn(),
    get: vi.fn(),
    del: vi.fn(),
    quit: vi.fn(),
  }));
  return { default: RedisMock };
});

// ─── Express Mock Helpers ───────────────────────────────────

export function mockResponse() {
  const res: Partial<Response> = {};
  res.status = vi.fn().mockReturnValue(res);
  res.json = vi.fn().mockReturnValue(res);
  res.send = vi.fn().mockReturnValue(res);
  res.sendStatus = vi.fn().mockReturnValue(res);
  res.set = vi.fn().mockReturnValue(res);
  res.end = vi.fn().mockReturnValue(res);
  return res as Response;
}

export function mockAuthRequest(overrides: Partial<any> = {}) {
  return {
    user: { userId: 'test-user-id', email: 'test@email.com', role: 'OWNER' },
    params: {},
    query: {},
    body: {},
    headers: { authorization: 'Bearer test-token' },
    app: { get: vi.fn().mockReturnValue(null) },
    ...overrides,
  } as any;
}

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
    stripeCustomerId: string | null;
    stripeSubscriptionId: string | null;
    createdAt: Date;
    updatedAt: Date;
  } | null;
}

export function createTestUser(overrides: Partial<TestUser> = {}): TestUser {
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
      stripeCustomerId: null,
      stripeSubscriptionId: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
    ...overrides,
  };
}

export function mockPrismaClear() {
  Object.values(prismaMock).forEach((delegate: any) => {
    if (typeof delegate === 'object' && delegate !== null) {
      Object.values(delegate).forEach((fn: any) => {
        if (typeof fn?.mockClear === 'function') fn.mockClear();
      });
    }
  });
}

export { prismaMock };
