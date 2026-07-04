import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import LeadCaptureForm from '../../components/LeadCaptureForm';

// Mock fetch globally
const mockFetch = vi.fn();
(globalThis as any).fetch = mockFetch;

// Mock sessionStorage
const sessionStorageMock = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: vi.fn((key: string) => store[key] ?? null),
    setItem: vi.fn((key: string, value: string) => { store[key] = value; }),
    removeItem: vi.fn((key: string) => { delete store[key]; }),
    clear: vi.fn(() => { store = {}; }),
    get length() { return Object.keys(store).length; },
    key: vi.fn((index: number) => Object.keys(store)[index] ?? null),
  };
})();
Object.defineProperty(window, 'sessionStorage', { value: sessionStorageMock });

describe('LeadCaptureForm', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    sessionStorageMock.clear();
    Object.defineProperty(window, 'location', {
      value: { ...window.location, search: '' },
      writable: true,
    });
    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ success: true }),
    });
  });

  it('should render the form with default title and subtitle', () => {
    render(<LeadCaptureForm />);
    expect(screen.getByText('Comece Agora')).toBeInTheDocument();
    expect(screen.getByText(/Preencha seus dados e comece gratuitamente/)).toBeInTheDocument();
  });

  it('should render custom title and subtitle when provided', () => {
    render(
      <LeadCaptureForm title="Custom Title" subtitle="Custom subtitle text" />
    );
    expect(screen.getByText('Custom Title')).toBeInTheDocument();
    expect(screen.getByText('Custom subtitle text')).toBeInTheDocument();
  });

  it('should show all form fields', () => {
    render(<LeadCaptureForm />);
    expect(screen.getByPlaceholderText('Seu nome completo')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('(11) 99999-9999')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('seu@email.com')).toBeInTheDocument();
  });

  it('should show submit button', () => {
    render(<LeadCaptureForm />);
    expect(screen.getByText('Começar Agora')).toBeInTheDocument();
  });

  it('should show free trial text', () => {
    render(<LeadCaptureForm />);
    expect(screen.getByText(/Teste grátis por 7 dias/)).toBeInTheDocument();
    expect(screen.getByText(/Sem cartão de crédito/)).toBeInTheDocument();
  });

  it('should not submit when phone and email are both empty', async () => {
    const user = userEvent.setup();
    render(<LeadCaptureForm />);

    await user.click(screen.getByText('Começar Agora'));

    // Form should still be visible (no transition to success state)
    expect(screen.getByText('Comece Agora')).toBeInTheDocument();
    expect(mockFetch).not.toHaveBeenCalled();
  });

  it('should submit the form successfully with phone', async () => {
    const user = userEvent.setup();
    const onSuccess = vi.fn();
    
    render(<LeadCaptureForm onSuccess={onSuccess} />);

    await user.type(screen.getByPlaceholderText('Seu nome completo'), 'John Doe');
    await user.type(screen.getByPlaceholderText('(11) 99999-9999'), '11999999999');
    await user.click(screen.getByText('Começar Agora'));

    // Should call fetch with some URL containing 'tracking/lead' and POST data
    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining('tracking/lead'),
      expect.objectContaining({
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: expect.stringContaining('John Doe'),
      })
    );

    // Wait for the state update
    await vi.waitFor(() => {
      expect(screen.getByText('Obrigado!')).toBeInTheDocument();
    });

    expect(onSuccess).toHaveBeenCalled();
  });

  it('should show submitted state with success message', async () => {
    const user = userEvent.setup();
    render(<LeadCaptureForm />);

    await user.type(screen.getByPlaceholderText('Seu nome completo'), 'John');
    await user.type(screen.getByPlaceholderText('(11) 99999-9999'), '11999999999');
    await user.click(screen.getByText('Começar Agora'));

    await vi.waitFor(() => {
      expect(screen.getByText('Obrigado!')).toBeInTheDocument();
    });
    expect(screen.getByText(/Seus dados foram capturados/)).toBeInTheDocument();
    expect(screen.getByTestId('icon-Check')).toBeInTheDocument();
  });

  it('should not fail on API error', async () => {
    const user = userEvent.setup();
    mockFetch.mockResolvedValue({
      ok: false,
      json: () => Promise.resolve({ error: 'Erro ao capturar lead' }),
    });

    render(<LeadCaptureForm />);

    await user.type(screen.getByPlaceholderText('Seu nome completo'), 'John');
    await user.type(screen.getByPlaceholderText('(11) 99999-9999'), '11999999999');
    await user.click(screen.getByText('Começar Agora'));

    // Should not transition to success state on error
    await vi.waitFor(() => {
      expect(screen.queryByText('Obrigado!')).not.toBeInTheDocument();
    });
  });

  it('should capture UTM params from URL', () => {
    Object.defineProperty(window, 'location', {
      value: {
        ...window.location,
        search: '?utm_source=google&utm_medium=cpc&utm_campaign=test',
      },
      writable: true,
    });

    render(<LeadCaptureForm />);
    expect(sessionStorageMock.setItem).toHaveBeenCalledWith(
      'zapflow_utms',
      expect.stringContaining('google')
    );
  });

  it('should restore UTM params from sessionStorage', () => {
    sessionStorageMock.getItem.mockReturnValue(
      JSON.stringify({ utmSource: 'facebook', utmCampaign: 'ads' })
    );

    Object.defineProperty(window, 'location', {
      value: { ...window.location, search: '' },
      writable: true,
    });

    render(<LeadCaptureForm />);
    expect(sessionStorageMock.getItem).toHaveBeenCalledWith('zapflow_utms');
  });
});
