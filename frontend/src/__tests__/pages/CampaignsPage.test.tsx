import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import CampaignsPage from '../../pages/CampaignsPage';
import { campaignsApi } from '../../api';

vi.mock('../../api', () => ({
  campaignsApi: {
    list: vi.fn(),
    get: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    updateStatus: vi.fn(),
    delete: vi.fn(),
  },
  conversationsApi: { list: vi.fn() },
  authApi: { trial: vi.fn(), login: vi.fn(), register: vi.fn(), me: vi.fn(), updateProfile: vi.fn() },
  whatsappApi: { list: vi.fn() },
  crmApi: { listContacts: vi.fn(), listBoards: vi.fn() },
  flowsApi: { list: vi.fn() },
  dashboardApi: { metrics: vi.fn() },
  webhooksApi: { list: vi.fn() },
  usersApi: { list: vi.fn() },
  knowledgeBaseApi: { list: vi.fn(), getStats: vi.fn() },
  paymentsApi: { getConfig: vi.fn() },
}));

vi.mock('react-hot-toast', () => ({
  default: { success: vi.fn(), error: vi.fn() },
  Toaster: () => null,
  toast: { success: vi.fn(), error: vi.fn() },
}));

function renderCampaigns() {
  return render(<CampaignsPage />);
}

describe('CampaignsPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should render page title and subtitle', async () => {
    (campaignsApi.list as any).mockResolvedValue({ data: [] });
    renderCampaigns();

    await vi.waitFor(() => {
      expect(screen.getByText('Disparos em Massa')).toBeInTheDocument();
      expect(screen.getByText(/campanhas e envios/i)).toBeInTheDocument();
    });
  });

  it('should show demo campaigns when API fails', async () => {
    (campaignsApi.list as any).mockRejectedValue(new Error('API error'));
    renderCampaigns();

    await vi.waitFor(() => {
      expect(screen.getByText('Promoção de Verão')).toBeInTheDocument();
      expect(screen.getByText('Lançamento Produto')).toBeInTheDocument();
      expect(screen.getByText('Follow-up Semanal')).toBeInTheDocument();
      expect(screen.getByText('Pesquisa de Satisfação')).toBeInTheDocument();
      expect(screen.getByText('Black Friday')).toBeInTheDocument();
    });
  });

  it('should display stats cards', async () => {
    (campaignsApi.list as any).mockRejectedValue(new Error('API error'));
    renderCampaigns();

    await vi.waitFor(() => {
      expect(screen.getByText('Total Campanhas')).toBeInTheDocument();
      expect(screen.getByText('Enviados')).toBeInTheDocument();
      expect(screen.getByText('Falhas')).toBeInTheDocument();
      expect(screen.getByText('Contatos Alcançados')).toBeInTheDocument();
    });
  });

  it('should show 5 demo campaigns in stats', async () => {
    (campaignsApi.list as any).mockRejectedValue(new Error('API error'));
    renderCampaigns();

    await vi.waitFor(() => {
      // Total Campanhas should show 5
      const totalCards = screen.getAllByText(/^\d+$/);
      expect(totalCards.some((el) => el.textContent === '5')).toBe(true);
    });
  });

  it('should show create campaign button', async () => {
    (campaignsApi.list as any).mockResolvedValue({ data: [] });
    renderCampaigns();

    await vi.waitFor(() => {
      expect(screen.getByText('Nova Campanha')).toBeInTheDocument();
    });
  });

  it('should show empty state when no campaigns exist', async () => {
    (campaignsApi.list as any).mockResolvedValue({ data: [] });
    renderCampaigns();

    await vi.waitFor(() => {
      expect(screen.getByText('Nenhuma campanha')).toBeInTheDocument();
      expect(screen.getByText(/crie sua primeira campanha/i)).toBeInTheDocument();
    });
  });

  it('should open create modal when clicking Nova Campanha', async () => {
    const user = userEvent.setup();
    (campaignsApi.list as any).mockResolvedValue({ data: [] });
    renderCampaigns();

    let novaBtn: HTMLElement;
    await vi.waitFor(() => {
      const novaBtns = screen.getAllByText('Nova Campanha');
      expect(novaBtns.length).toBeGreaterThanOrEqual(1);
      novaBtn = novaBtns[0];
    });

    await user.click(novaBtn!);

    await vi.waitFor(() => {
      expect(screen.getByLabelText('Nome')).toBeInTheDocument();
      expect(screen.getByLabelText('Mensagem')).toBeInTheDocument();
    });
  });

  it('should display campaign status badges', async () => {
    (campaignsApi.list as any).mockRejectedValue(new Error('API error'));
    renderCampaigns();

    await vi.waitFor(() => {
      expect(screen.getByText('Concluída')).toBeInTheDocument();
      expect(screen.getByText('Executando')).toBeInTheDocument();
    });
  });

  it('should display progress bars for sent campaigns', async () => {
    (campaignsApi.list as any).mockRejectedValue(new Error('API error'));
    renderCampaigns();

    await vi.waitFor(() => {
      // Progress bar items show number of sent messages
      const sentTexts = screen.getAllByText(/enviados/i);
      expect(sentTexts.length).toBeGreaterThan(0);
    });
  });

  it('should show campaign message preview text', async () => {
    (campaignsApi.list as any).mockRejectedValue(new Error('API error'));
    renderCampaigns();

    await vi.waitFor(() => {
      const previews = screen.getAllByText(/promoção de verão/i);
      expect(previews.length).toBeGreaterThanOrEqual(1);
      const launches = screen.getAllByText(/novo produto lançado/i);
      expect(launches.length).toBeGreaterThanOrEqual(1);
    });
  });
});
