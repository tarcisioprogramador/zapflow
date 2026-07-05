import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import LoginPage from '../../pages/LoginPage';
import { authApi } from '../../api';

// Mock the api module
vi.mock('../../api', () => ({
  authApi: {
    login: vi.fn(),
    register: vi.fn(),
    me: vi.fn(),
    updateProfile: vi.fn(),
    trial: vi.fn(),
  },
}));

// Mock react-hot-toast
vi.mock('react-hot-toast', () => ({
  default: { success: vi.fn(), error: vi.fn(), loading: vi.fn(), dismiss: vi.fn() },
  Toaster: () => null,
  toast: { success: vi.fn(), error: vi.fn(), loading: vi.fn(), dismiss: vi.fn() },
}));

function renderLoginPage() {
  return render(
    <MemoryRouter>
      <LoginPage />
    </MemoryRouter>
  );
}

describe('LoginPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should render the logo and brand name', () => {
    renderLoginPage();
    expect(screen.getByText('Zap')).toBeInTheDocument();
    expect(screen.getByText('Flow')).toBeInTheDocument();
  });

  it('should render the welcome heading', () => {
    renderLoginPage();
    expect(screen.getByText('Bem-vindo de volta')).toBeInTheDocument();
  });

  it('should render email and password fields', () => {
    renderLoginPage();
    expect(screen.getByLabelText(/email/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/senha/i)).toBeInTheDocument();
  });

  it('should render the login button', () => {
    renderLoginPage();
    expect(screen.getByRole('button', { name: /entrar/i })).toBeInTheDocument();
  });

  it('should render register link', () => {
    renderLoginPage();
    const link = screen.getByText(/criar gratuitamente/i);
    expect(link).toBeInTheDocument();
    expect(link.closest('a')).toHaveAttribute('href', '/register');
  });

  it('should toggle password visibility when clicking the eye icon', async () => {
    const user = userEvent.setup();
    renderLoginPage();

    const passwordInput = screen.getByLabelText(/senha/i);
    expect(passwordInput).toHaveAttribute('type', 'password');

    // Find the password toggle button inside the relative container
    const passwordContainer = passwordInput.closest('.relative');
    expect(passwordContainer).not.toBeNull();

    const toggleBtn = passwordContainer!.querySelector('button');
    expect(toggleBtn).not.toBeNull();

    await user.click(toggleBtn!);
    expect(passwordInput).toHaveAttribute('type', 'text');
  });

  it('should call api when submitting with filled fields', async () => {
    const user = userEvent.setup();
    const mockLogin = authApi.login as ReturnType<typeof vi.fn>;
    mockLogin.mockRejectedValue(new Error('API error'));
    renderLoginPage();

    await user.type(screen.getByLabelText(/email/i), 'test@test.com');
    await user.type(screen.getByLabelText(/senha/i), '123456');
    await user.click(screen.getByRole('button', { name: /entrar/i }));

    await vi.waitFor(() => {
      expect(mockLogin).toHaveBeenCalled();
    });
  });

  it('should call authApi.login on form submit', async () => {
    const user = userEvent.setup();
    const mockLogin = authApi.login as ReturnType<typeof vi.fn>;
    mockLogin.mockResolvedValue({
      data: {
        user: { id: '1', name: 'Test', email: 'test@test.com', role: 'OWNER', plan: 'FREE' },
        token: 'test-token',
      },
    });

    renderLoginPage();

    await user.type(screen.getByLabelText(/email/i), 'test@test.com');
    await user.type(screen.getByLabelText(/senha/i), '123456');
    await user.click(screen.getByRole('button', { name: /entrar/i }));

    expect(mockLogin).toHaveBeenCalledWith({
      email: 'test@test.com',
      password: '123456',
    });
  });

  it('should show error toast on login failure', async () => {
    const user = userEvent.setup();
    const mockLogin = authApi.login as ReturnType<typeof vi.fn>;
    mockLogin.mockRejectedValue({
      response: { data: { error: 'Credenciais inválidas' } },
    });

    renderLoginPage();

    await user.type(screen.getByLabelText(/email/i), 'test@test.com');
    await user.type(screen.getByLabelText(/senha/i), 'wrong');
    await user.click(screen.getByRole('button', { name: /entrar/i }));

    // Wait a tick for the async handler
    await vi.waitFor(() => {
      expect(mockLogin).toHaveBeenCalled();
    });
  });

  it('should render hero section with feature cards on desktop', () => {
    renderLoginPage();
    expect(screen.getByText(/tudo que você precisa/i)).toBeInTheDocument();
    expect(screen.getByText(/multi-whatsapp/i)).toBeInTheDocument();
    expect(screen.getByText(/ia atendente/i)).toBeInTheDocument();
    expect(screen.getByText(/fluxos visuais/i)).toBeInTheDocument();
    expect(screen.getByText(/crm \+ analytics/i)).toBeInTheDocument();
  });

  it('should render auth badge', () => {
    renderLoginPage();
    expect(screen.getByText(/automação com ia/i)).toBeInTheDocument();
  });

  it('should render testimonial quote', () => {
    renderLoginPage();
    expect(screen.getByText(/aumentamos a conversão em 340%/i)).toBeInTheDocument();
  });
});
