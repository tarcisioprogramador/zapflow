import { describe, it, expect, beforeEach } from 'vitest';

// These tests test the ACTUAL store implementations.
// We need to unmock the store module first since setup.ts mocks it.
describe('Auth Store', () => {
  beforeEach(async () => {
    vi.unmock('../store');
  });

  it('should have default state with no user', async () => {
    const { useAuthStore } = await import('../store');
    const state = useAuthStore.getState();
    expect(state.user).toBeNull();
    expect(state.token).toBeNull();
    expect(state.isAuthenticated).toBe(false);
  });

  it('should set auth state on setAuth', async () => {
    const { useAuthStore } = await import('../store');
    const user = { id: '1', name: 'Test', email: 'test@test.com', role: 'OWNER' as const, plan: 'FREE' };

    useAuthStore.getState().setAuth(user, 'test-token');

    const state = useAuthStore.getState();
    expect(state.user).toEqual(user);
    expect(state.token).toBe('test-token');
    expect(state.isAuthenticated).toBe(true);
  });

  it('should clear auth state on logout', async () => {
    const { useAuthStore } = await import('../store');
    const user = { id: '1', name: 'Test', email: 'test@test.com', role: 'OWNER' as const, plan: 'FREE' };

    useAuthStore.getState().setAuth(user, 'test-token');
    useAuthStore.getState().logout();

    const state = useAuthStore.getState();
    expect(state.user).toBeNull();
    expect(state.token).toBeNull();
    expect(state.isAuthenticated).toBe(false);
  });

  it('should partially update user on updateUser', async () => {
    const { useAuthStore } = await import('../store');
    const user = { id: '1', name: 'Original', email: 'test@test.com', role: 'OWNER' as const, plan: 'FREE' };

    useAuthStore.getState().setAuth(user, 'token');
    useAuthStore.getState().updateUser({ name: 'Updated', plan: 'PRO' });

    const state = useAuthStore.getState();
    expect(state.user?.name).toBe('Updated');
    expect(state.user?.plan).toBe('PRO');
    expect(state.user?.email).toBe('test@test.com');
  });

  it('should not crash updateUser when user is null', async () => {
    const { useAuthStore } = await import('../store');
    expect(() => {
      useAuthStore.getState().updateUser({ name: 'New' });
    }).not.toThrow();
  });
});

describe('App Store', () => {
  beforeEach(async () => {
    vi.unmock('../store');
  });

  it('should have sidebar open by default on desktop', async () => {
    Object.defineProperty(window, 'innerWidth', { value: 1280, writable: true });

    const { useAppStore } = await import('../store');
    const state = useAppStore.getState();
    expect(state.sidebarOpen).toBe(true);
    expect(state.theme).toBe('dark');
    expect(state.selectedNumber).toBeNull();
  });

  it('should toggle sidebar', async () => {
    const { useAppStore } = await import('../store');

    useAppStore.getState().toggleSidebar();
    expect(useAppStore.getState().sidebarOpen).toBe(false);

    useAppStore.getState().toggleSidebar();
    expect(useAppStore.getState().sidebarOpen).toBe(true);
  });

  it('should set sidebar open explicitly', async () => {
    const { useAppStore } = await import('../store');

    useAppStore.getState().setSidebarOpen(false);
    expect(useAppStore.getState().sidebarOpen).toBe(false);

    useAppStore.getState().setSidebarOpen(true);
    expect(useAppStore.getState().sidebarOpen).toBe(true);
  });

  it('should set selected number', async () => {
    const { useAppStore } = await import('../store');

    useAppStore.getState().setSelectedNumber('num-123');
    expect(useAppStore.getState().selectedNumber).toBe('num-123');

    useAppStore.getState().setSelectedNumber(null);
    expect(useAppStore.getState().selectedNumber).toBeNull();
  });

  it('should toggle theme between dark and light', async () => {
    const { useAppStore } = await import('../store');

    expect(useAppStore.getState().theme).toBe('dark');

    useAppStore.getState().toggleTheme();
    expect(useAppStore.getState().theme).toBe('light');

    useAppStore.getState().toggleTheme();
    expect(useAppStore.getState().theme).toBe('dark');
  });
});
