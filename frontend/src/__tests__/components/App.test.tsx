import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import App from '../../App';
import { setMockAuthState, setMockPathname } from '../mocks';

function renderWithRouter(initialRoute = '/') {
  setMockPathname(initialRoute);
  return render(
    <MemoryRouter initialEntries={[initialRoute]}>
      <App />
    </MemoryRouter>
  );
}

describe('App Routing', () => {
  beforeEach(() => {
    setMockAuthState({
      isAuthenticated: true,
      user: { id: '1', name: 'Test', email: 't@t.com', role: 'OWNER', plan: 'FREE' },
    });
  });

  it('should redirect to login when not authenticated', () => {
    setMockAuthState({ isAuthenticated: false });
    renderWithRouter('/');
    expect(screen.getByText('Bem-vindo de volta')).toBeInTheDocument();
  });

  it('should render Layout and Outlet for authenticated users', () => {
    renderWithRouter('/');
    // Sidebar has nav items and Header has page title
    // Use getAllByText and check there's at least one
    const dashboards = screen.getAllByText('Dashboard');
    expect(dashboards.length).toBeGreaterThan(0);
    expect(screen.getByTestId('outlet')).toBeInTheDocument();
  });

  it('should show Login page at /login', () => {
    renderWithRouter('/login');
    expect(screen.getByText('Bem-vindo de volta')).toBeInTheDocument();
    expect(screen.getByText('Entrar')).toBeInTheDocument();
  });

  it('should show Register page at /register', () => {
    renderWithRouter('/register');
    expect(screen.getByText('Comece gratuitamente')).toBeInTheDocument();
    expect(screen.getByText('Criar conta')).toBeInTheDocument();
  });

  it('should show Landing page at /landing', () => {
    renderWithRouter('/landing');
    const frontzappElements = screen.getAllByText('Frontzapp');
    expect(frontzappElements.length).toBeGreaterThan(0);
  });

  it('should redirect unknown routes to login when not authenticated', () => {
    setMockAuthState({ isAuthenticated: false });
    renderWithRouter('/nonexistent');
    expect(screen.getByText('Bem-vindo de volta')).toBeInTheDocument();
  });

  it('should render sidebar nav items in protected layout', () => {
    renderWithRouter('/');
    expect(screen.getByText('WhatsApp')).toBeInTheDocument();
    expect(screen.getByText('Conversas')).toBeInTheDocument();
    expect(screen.getByText('Automações')).toBeInTheDocument();
    expect(screen.getByText('CRM Kanban')).toBeInTheDocument();
    expect(screen.getByText('Contatos')).toBeInTheDocument();
    expect(screen.getByText('Configurações')).toBeInTheDocument();
  });
});
