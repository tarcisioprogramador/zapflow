import { vi } from 'vitest';

// ─── Mock socket.io-client ────────────────────────────────
const mockSocket = {
  on: vi.fn().mockReturnThis(),
  off: vi.fn().mockReturnThis(),
  emit: vi.fn().mockReturnThis(),
  disconnect: vi.fn().mockReturnThis(),
  connect: vi.fn().mockReturnThis(),
  id: 'mock-socket-id',
};

vi.mock('socket.io-client', () => ({
  io: vi.fn(() => mockSocket),
  default: { io: vi.fn(() => mockSocket) },
}));

export { mockSocket };
