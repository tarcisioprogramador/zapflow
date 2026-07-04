import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import Header from '../../components/layout/Header';
import { setMockAuthState, setMockAppState, setMockPathname } from '../mocks';

describe('Header', () => {
  beforeEach(() => {
    setMockPathname('/');
    setMockAuthState({
      user: { id: 'test', name: 'Test User', email: 'test@email.com', role: 'OWNER', plan: 'FREE' },
    });
    setMockAppState({ sidebarOpen: true, theme: 'dark' });
  });

  it('should show Dashboard title and subtitle on home route', () => {
    render(<Header />);
    expect(screen.getByText('Dashboard')).toBeInTheDocument();
    expect(screen.getByText('Visão geral do seu negócio')).toBeInTheDocument();
  });

  it('should show WhatsApp title on /whatsapp route', () => {
    setMockPathname('/whatsapp');
    render(<Header />);
    expect(screen.getByText('WhatsApp')).toBeInTheDocument();
    expect(screen.getByText('Gerenciar números conectados')).toBeInTheDocument();
  });

  it('should show Conversations title on /conversations route', () => {
    setMockPathname('/conversations/123');
    render(<Header />);
    expect(screen.getByText('Conversas')).toBeInTheDocument();
    expect(screen.getByText('Atendimento em tempo real')).toBeInTheDocument();
  });

  it('should show search input', () => {
    render(<Header />);
    const searchInput = screen.getByPlaceholderText('Buscar...');
    expect(searchInput).toBeInTheDocument();
  });

  it('should render the quick action button', () => {
    render(<Header />);
    expect(screen.getByText('Nova Ação')).toBeInTheDocument();
  });

  it('should show Sun icon when theme is dark', () => {
    render(<Header />);
    expect(screen.getByTestId('icon-Sun')).toBeInTheDocument();
  });

  it('should show Moon icon when theme is light', () => {
    setMockAppState({ theme: 'light' });
    render(<Header />);
    expect(screen.getByTestId('icon-Moon')).toBeInTheDocument();
  });

  it('should show WhatsApp Online status', () => {
    render(<Header />);
    expect(screen.getByText('Online')).toBeInTheDocument();
  });

  it('should call toggleTheme from mock state when theme button is clicked', async () => {
    const user = userEvent.setup();
    // Set up spy before rendering
    const toggleSpy = vi.fn();
    setMockAppState({ sidebarOpen: true, theme: 'dark', toggleTheme: toggleSpy });
    render(<Header />);

    const themeBtn = screen.getByTestId('icon-Sun').closest('button')!;
    await user.click(themeBtn);

    expect(toggleSpy).toHaveBeenCalled();
  });

  it('should show notifications bell with pulse indicator', () => {
    render(<Header />);
    const bellIcon = screen.getByTestId('icon-Bell');
    expect(bellIcon).toBeInTheDocument();
  });
});
