import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import DashboardPage from '../../pages/DashboardPage';
import { dashboardApi, authApi } from '../../api';

// Mock the API
vi.mock('../../api', () => ({
  dashboardApi: { metrics: vi.fn() },
  authApi: { trial: vi.fn(), login: vi.fn(), register: vi.fn(), me: vi.fn(), updateProfile: vi.fn() },
}));

// Mock recharts
vi.mock('recharts', () => ({
  ResponsiveContainer: ({ children }: any) => <div data-testid="responsive-container">{children}</div>,
  AreaChart: ({ children }: any) => <div data-testid="area-chart">{children}</div>,
  Area: () => null,
  BarChart: ({ children }: any) => <div data-testid="bar-chart">{children}</div>,
  Bar: () => null,
  XAxis: () => null,
  YAxis: () => null,
  CartesianGrid: () => null,
  Tooltip: () => null,
  defs: () => null,
  linearGradient: () => null,
  stop: () => null,
}));

function renderDashboard() {
  return render(
    <MemoryRouter>
      <DashboardPage />
    </MemoryRouter>
  );
}

describe('DashboardPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should show loading state initially', () => {
    // Make API calls never resolve during this test
    (dashboardApi.metrics as any).mockImplementation(() => new Promise(() => {}));
    (authApi.trial as any).mockImplementation(() => new Promise(() => {}));

    renderDashboard();
    expect(screen.getByText('Carregando dashboard...')).toBeInTheDocument();
  });

  it('should display metric cards when data loads', async () => {
    (dashboardApi.metrics as any).mockResolvedValue({
      data: {
        totalMessages: 2847,
        activeConversations: 42,
        totalContacts: 1253,
        activeFlows: 8,
        totalCampaigns: 15,
        conversionRate: 23.5,
        messagesPerDay: [{ date: 'Seg', count: 320 }],
        pipelineData: [{ stage: 'Lead', count: 145, value: 72500 }],
      },
    });
    (authApi.trial as any).mockResolvedValue({
      data: { isActive: true, isExpired: false, daysRemaining: 5, startedAt: null, expiresAt: null, plan: 'FREE' },
    });

    renderDashboard();

    await vi.waitFor(() => {
      const mensagensElements = screen.getAllByText('Mensagens');
      expect(mensagensElements.length).toBeGreaterThanOrEqual(1);
    });

    expect(screen.getByText('Conversas Ativas')).toBeInTheDocument();
    const contatosElements = screen.getAllByText('Contatos');
    expect(contatosElements.length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText('23.5%')).toBeInTheDocument();
  });

  it('should show demo data when API fails', async () => {
    (dashboardApi.metrics as any).mockRejectedValue(new Error('API error'));
    (authApi.trial as any).mockRejectedValue(new Error('API error'));

    renderDashboard();

    await vi.waitFor(() => {
      const mensagensElements = screen.getAllByText('Mensagens');
      expect(mensagensElements.length).toBeGreaterThanOrEqual(1);
    });
  });

  it('should show trial expired overlay when trial is expired', async () => {
    (dashboardApi.metrics as any).mockResolvedValue({
      data: {
        totalMessages: 0, activeConversations: 0, totalContacts: 0,
        activeFlows: 0, totalCampaigns: 0, conversionRate: 0,
        messagesPerDay: [], pipelineData: [],
      },
    });
    (authApi.trial as any).mockResolvedValue({
      data: { isActive: false, isExpired: true, daysRemaining: 0, startedAt: null, expiresAt: null, plan: 'FREE' },
    });

    renderDashboard();

    await vi.waitFor(() => {
      expect(screen.getByText('Teste Gratuito Expirado')).toBeInTheDocument();
    });
    expect(screen.getByText(/Ver Planos e Preços/)).toBeInTheDocument();
  });

  it('should display chart sections', async () => {
    (dashboardApi.metrics as any).mockResolvedValue({
      data: {
        totalMessages: 100, activeConversations: 10, totalContacts: 50,
        activeFlows: 3, totalCampaigns: 5, conversionRate: 15,
        messagesPerDay: [{ date: 'Seg', count: 320 }],
        pipelineData: [{ stage: 'Lead', count: 10, value: 1000 }],
      },
    });
    (authApi.trial as any).mockResolvedValue({
      data: { isActive: true, isExpired: false, daysRemaining: 7, startedAt: null, expiresAt: null, plan: 'FREE' },
    });

    renderDashboard();

    await vi.waitFor(() => {
      const mensagensElements = screen.getAllByText('Mensagens');
      expect(mensagensElements.length).toBeGreaterThanOrEqual(1);
      expect(screen.getByText('Pipeline de Vendas')).toBeInTheDocument();
    });

    expect(screen.getByText('Resumo')).toBeInTheDocument();
    expect(screen.getByText('Performance IA')).toBeInTheDocument();
    expect(screen.getByText('Atividade Recente')).toBeInTheDocument();
  });

  it('should show empty chart state when no data available', async () => {
    (dashboardApi.metrics as any).mockResolvedValue({
      data: {
        totalMessages: 0, activeConversations: 0, totalContacts: 0,
        activeFlows: 0, totalCampaigns: 0, conversionRate: 0,
        messagesPerDay: [],
        pipelineData: [],
      },
    });
    (authApi.trial as any).mockResolvedValue({
      data: { isActive: true, isExpired: false, daysRemaining: 7, startedAt: null, expiresAt: null, plan: 'FREE' },
    });

    renderDashboard();

    await vi.waitFor(() => {
      expect(screen.getByText('Nenhum dado de mensagens disponível')).toBeInTheDocument();
      expect(screen.getByText('Nenhum dado de pipeline disponível')).toBeInTheDocument();
    });
  });

  it('should display quick stats in the summary section', async () => {
    (dashboardApi.metrics as any).mockResolvedValue({
      data: {
        totalMessages: 500, activeConversations: 20, totalContacts: 100,
        activeFlows: 4, totalCampaigns: 3, conversionRate: 10,
        messagesPerDay: [], pipelineData: [],
      },
    });
    (authApi.trial as any).mockResolvedValue({
      data: { isActive: false, isExpired: false, daysRemaining: 0, startedAt: null, expiresAt: null, plan: 'PRO' },
    });

    renderDashboard();

    await vi.waitFor(() => {
      expect(screen.getByText('4')).toBeInTheDocument(); // active flows
      expect(screen.getByText('3')).toBeInTheDocument(); // campaigns
    });
  });
});
