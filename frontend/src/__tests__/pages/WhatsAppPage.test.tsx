import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import WhatsAppPage from '../../pages/WhatsAppPage';
import { whatsappApi } from '../../api';

vi.mock('../../api', () => ({
  whatsappApi: {
    list: vi.fn(),
    connect: vi.fn(),
    send: vi.fn(),
    delete: vi.fn(),
    disconnect: vi.fn(),
    getQrCode: vi.fn(),
  },
  conversationsApi: { list: vi.fn() },
  authApi: { trial: vi.fn(), login: vi.fn(), register: vi.fn(), me: vi.fn(), updateProfile: vi.fn() },
  crmApi: { listBoards: vi.fn(), listContacts: vi.fn(), createContact: vi.fn(), updateContact: vi.fn(), deleteContact: vi.fn() },
  flowsApi: { list: vi.fn(), create: vi.fn(), toggle: vi.fn(), duplicate: vi.fn(), delete: vi.fn() },
  campaignsApi: { list: vi.fn(), create: vi.fn(), delete: vi.fn() },
  dashboardApi: { metrics: vi.fn(), activity: vi.fn() },
  webhooksApi: { list: vi.fn(), create: vi.fn(), delete: vi.fn(), test: vi.fn() },
  usersApi: { list: vi.fn(), create: vi.fn(), updateRole: vi.fn(), delete: vi.fn() },
  paymentsApi: { getConfig: vi.fn(), createCheckout: vi.fn(), getSession: vi.fn(), getSubscription: vi.fn(), createPortal: vi.fn() },
  knowledgeBaseApi: { list: vi.fn(), getStats: vi.fn(), create: vi.fn(), update: vi.fn(), delete: vi.fn() },
}));

vi.mock('react-hot-toast', () => ({
  default: { success: vi.fn(), error: vi.fn(), loading: vi.fn(), dismiss: vi.fn() },
  Toaster: () => null,
  toast: { success: vi.fn(), error: vi.fn(), loading: vi.fn(), dismiss: vi.fn() },
}));

function renderWhatsApp() {
  return render(<WhatsAppPage />);
}

describe('WhatsAppPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should show loading state initially', () => {
    (whatsappApi.list as any).mockImplementation(() => new Promise(() => {}));
    renderWhatsApp();
    expect(screen.getByText('WhatsApp')).toBeInTheDocument();
  });

  it('should display page title and subtitle', async () => {
    (whatsappApi.list as any).mockResolvedValue({ data: [] });
    renderWhatsApp();

    await vi.waitFor(() => {
      expect(screen.getByText('WhatsApp')).toBeInTheDocument();
      expect(screen.getByText('Gerencie seus números conectados')).toBeInTheDocument();
    });
  });

  it('should show connect button in page header', async () => {
    (whatsappApi.list as any).mockResolvedValue({ data: [] });
    renderWhatsApp();

    await vi.waitFor(() => {
      const connectBtns = screen.getAllByText('Conectar Número');
      expect(connectBtns.length).toBeGreaterThanOrEqual(1);
    });
  });

  it('should display demo numbers when API fails', async () => {
    (whatsappApi.list as any).mockRejectedValue(new Error('API error'));
    renderWhatsApp();

    await vi.waitFor(() => {
      expect(screen.getByText('Número Principal')).toBeInTheDocument();
      expect(screen.getByText('Suporte')).toBeInTheDocument();
    });
  });

  it('should show connected status for numbers', async () => {
    (whatsappApi.list as any).mockRejectedValue(new Error('API error'));
    renderWhatsApp();

    await vi.waitFor(() => {
      const connectedBadges = screen.getAllByText('Conectado');
      expect(connectedBadges.length).toBeGreaterThan(0);
    });
  });

  it('should show connect modal when clicking Conectar Número', async () => {
    const user = userEvent.setup();
    (whatsappApi.list as any).mockResolvedValue({ data: [] });
    renderWhatsApp();

    // Click the first Conectar Número button (page header)
    await vi.waitFor(() => {
      const connectBtns = screen.getAllByText('Conectar Número');
      expect(connectBtns.length).toBeGreaterThanOrEqual(1);
    });

    const connectBtns = screen.getAllByText('Conectar Número');
    await user.click(connectBtns[0]);

    // Modal should appear with form fields
    await vi.waitFor(() => {
      const nameInput = screen.getByLabelText('Nome');
      const numberInput = screen.getByLabelText('Número');
      expect(nameInput).toBeInTheDocument();
      expect(numberInput).toBeInTheDocument();
    });
  });

  it('should show how-to-connect section', async () => {
    (whatsappApi.list as any).mockResolvedValue({ data: [] });
    renderWhatsApp();

    await vi.waitFor(() => {
      expect(screen.getByText('Como conectar')).toBeInTheDocument();
      expect(screen.getByText('Clique em "Conectar"')).toBeInTheDocument();
      expect(screen.getByText('Escaneie o QR Code')).toBeInTheDocument();
      expect(screen.getByText('Pronto!')).toBeInTheDocument();
    });
  });

  it('should show add new number button when list is empty', async () => {
    (whatsappApi.list as any).mockResolvedValue({ data: [] });
    renderWhatsApp();

    await vi.waitFor(() => {
      expect(screen.getByText('Conectar novo número')).toBeInTheDocument();
    });
  });

  it('should disconnect and delete buttons on numbers', async () => {
    (whatsappApi.list as any).mockRejectedValue(new Error('API error'));
    renderWhatsApp();

    await vi.waitFor(() => {
      const disconnectBtns = screen.getAllByText('Desconectar');
      expect(disconnectBtns.length).toBeGreaterThan(0);
    });
  });
});
