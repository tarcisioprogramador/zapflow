import { vi, beforeEach, afterEach } from 'vitest';
import React from 'react';

// ─── Lucide React Icons Mock ───────────────────────────────
// Comprehensive list of all icons used across the project

const ALL_ICONS = [
  'Activity', 'AlertCircle', 'AlertTriangle', 'ArrowDownRight', 'ArrowLeft',
  'ArrowRight', 'ArrowUpRight', 'BarChart3', 'Bell', 'BookOpen', 'Bot',
  'BotMessageSquare', 'Brain', 'Building', 'Check', 'CheckCheck', 'CheckCircle',
  'CheckCircle2', 'ChevronDown', 'ChevronLeft', 'ChevronRight', 'ChevronUp',
  'Clock', 'Columns', 'Columns3', 'Copy', 'CreditCard', 'Crown', 'DollarSign', 'Download',
  'Edit3', 'ExternalLink', 'Eye', 'EyeOff', 'FileText', 'Filter', 'GitBranch',
  'Globe', 'GripVertical', 'HelpCircle', 'Image', 'Key', 'LayoutDashboard',
  'Loader2', 'LogOut', 'Mail', 'Menu', 'MessageSquare', 'MessagesSquare',
  'Mic', 'Moon', 'MoreVertical', 'Paperclip', 'Pause', 'Phone', 'Play',
  'Plus', 'QrCode', 'RefreshCw', 'Repeat', 'Save', 'Search', 'Send',
  'Settings', 'Shield', 'ShoppingCart', 'Smartphone', 'Star', 'Sun', 'Tag',
  'Target', 'ThumbsUp', 'ToggleLeft', 'ToggleRight', 'Trash2', 'TrendingUp',
  'Upload', 'User', 'Users', 'Video', 'Webhook', 'Wifi', 'WifiOff', 'X',
  'XCircle', 'Zap', 'Sparkles', 'Radio', 'Activity', 'ArrowRight',
];

const mockIcon = (name: string) => {
  const MockIcon = (props: any) => {
    return React.createElement('svg', {
      'data-testid': `icon-${name}`,
      className: props.className,
      ...props,
    });
  };
  MockIcon.displayName = `Mock${name}`;
  return MockIcon;
};

const lucideMock = Object.fromEntries(
  ALL_ICONS.map((name) => [name, mockIcon(name)])
);

vi.mock('lucide-react', () => lucideMock);

// ─── Mock zustand stores ────────────────────────────────────

const defaultAuthState = {
  user: { id: 'test-id', name: 'Test User', email: 'test@email.com', role: 'OWNER', plan: 'FREE' },
  token: 'test-token',
  isAuthenticated: true,
  setAuth: vi.fn(),
  logout: vi.fn(),
  updateUser: vi.fn(),
};

const defaultAppState = {
  sidebarOpen: true,
  toggleSidebar: vi.fn(),
  setSidebarOpen: vi.fn(),
  selectedNumber: null,
  setSelectedNumber: vi.fn(),
  theme: 'dark',
  toggleTheme: vi.fn(),
};

let mockAuthState = { ...defaultAuthState, getState: () => mockAuthState };
let mockAppState = { ...defaultAppState, getState: () => mockAppState };

export function setMockAuthState(overrides: Partial<typeof defaultAuthState>) {
  mockAuthState = { ...mockAuthState, ...overrides };
}

export function setMockAppState(overrides: Partial<typeof defaultAppState>) {
  mockAppState = { ...mockAppState, ...overrides };
}

export function resetMockStates() {
  const newAuth = { ...defaultAuthState, setAuth: vi.fn(), logout: vi.fn(), updateUser: vi.fn() };
  const newApp = { ...defaultAppState, toggleSidebar: vi.fn(), setSidebarOpen: vi.fn(), setSelectedNumber: vi.fn(), toggleTheme: vi.fn() };
  mockAuthState = { ...newAuth, getState: () => mockAuthState };
  mockAppState = { ...newApp, getState: () => mockAppState };
}

function makeStore(selector?: (state: any) => any, state?: any) {
  if (selector) return selector(state);
  return state;
}

vi.mock('../store', () => ({
  useAuthStore: (selector?: (state: typeof mockAuthState) => any) => {
    return makeStore(selector, mockAuthState);
  },
  useAppStore: (selector?: (state: typeof mockAppState) => any) => {
    return makeStore(selector, mockAppState);
  },
}));

// ─── Mock react-router-dom ──────────────────────────────────

const mockNavigate = vi.fn();
let mockLocationPathname = '/';

export function setMockPathname(pathname: string) {
  mockLocationPathname = pathname;
}

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
    useLocation: () => ({
      pathname: mockLocationPathname,
      search: '',
      hash: '',
      state: null,
      key: 'default',
    }),
    NavLink: ({ children, to, className, ...props }: any) => {
      const isActive = mockLocationPathname === to || mockLocationPathname.startsWith(to + '/') || (to === '/' && mockLocationPathname === '/');
      return React.createElement(
        'a',
        {
          href: to,
          'data-testid': `nav-link-${to}`,
          className: typeof className === 'function' ? className({ isActive }) : className,
          ...props,
        },
        children
      );
    },
    Outlet: () => React.createElement('div', { 'data-testid': 'outlet' }, 'Outlet Content'),
  };
});

// ─── Mock react-hot-toast ───────────────────────────────────

const toastFns = { success: vi.fn(), error: vi.fn(), loading: vi.fn(), dismiss: vi.fn() };
vi.mock('react-hot-toast', () => ({
  default: toastFns,
  Toaster: () => React.createElement('div', { 'data-testid': 'toaster' }),
  toast: toastFns,
}));

// Reset states between tests
beforeEach(() => {
  resetMockStates();
  mockNavigate.mockClear();
  mockLocationPathname = '/';
});
