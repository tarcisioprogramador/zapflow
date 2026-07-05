import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { User } from '../types';

interface AuthState {
  user: User | null;
  /** Access token (JWT) — stored for Bearer header on requests */
  token: string | null;
  /** Refresh token — used to get a new access token when it expires */
  refreshToken: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  setAuth: (user: User, token?: string, refreshToken?: string) => void;
  setUser: (user: User) => void;
  setLoading: (loading: boolean) => void;
  logout: () => void;
  updateUser: (user: Partial<User>) => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      token: null,
      refreshToken: null,
      isAuthenticated: false,
      isLoading: true,
      setAuth: (user, token, refreshToken) =>
        set({ user, token: token || null, refreshToken: refreshToken || null, isAuthenticated: true, isLoading: false }),
      setUser: (user) => set({ user, isAuthenticated: true, isLoading: false }),
      setLoading: (loading) => set({ isLoading: loading }),
      logout: () => set({ user: null, token: null, refreshToken: null, isAuthenticated: false, isLoading: false }),
      updateUser: (partial) =>
        set((state) => ({
          user: state.user ? { ...state.user, ...partial } : null,
        })),
    }),
    {
      name: 'zapflow-auth',
      partialize: (state) => ({
        user: state.user,
        token: state.token,
        refreshToken: state.refreshToken,
        isAuthenticated: state.isAuthenticated,
      }),
    }
  )
);

interface AppStore {
  sidebarOpen: boolean;
  toggleSidebar: () => void;
  setSidebarOpen: (open: boolean) => void;
  selectedNumber: string | null;
  setSelectedNumber: (id: string | null) => void;
  theme: 'dark' | 'light';
  toggleTheme: () => void;
}

export const useAppStore = create<AppStore>()(
  persist(
    (set) => ({
      sidebarOpen: typeof window !== 'undefined' ? window.innerWidth >= 1024 : true,
      toggleSidebar: () => set((s) => ({ sidebarOpen: !s.sidebarOpen })),
      setSidebarOpen: (open) => set({ sidebarOpen: open }),
      selectedNumber: null,
      setSelectedNumber: (id) => set({ selectedNumber: id }),
      theme: 'dark',
      toggleTheme: () =>
        set((s) => ({
          theme: s.theme === 'dark' ? 'light' : 'dark',
        })),
    }),
    { name: 'zapflow-app' }
  )
);
