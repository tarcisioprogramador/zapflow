import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import ContactsPage from '../../pages/ContactsPage';
import { crmApi } from '../../api';

vi.mock('../../api', () => ({
  crmApi: {
    listContacts: vi.fn(),
    createContact: vi.fn(),
    updateContact: vi.fn(),
    deleteContact: vi.fn(),
    listBoards: vi.fn(),
    createBoard: vi.fn(),
    updateBoard: vi.fn(),
    deleteBoard: vi.fn(),
    listCards: vi.fn(),
    createCard: vi.fn(),
    updateCard: vi.fn(),
    moveCard: vi.fn(),
    deleteCard: vi.fn(),
    createStage: vi.fn(),
    updateStage: vi.fn(),
    deleteStage: vi.fn(),
  },
  conversationsApi: { list: vi.fn() },
  authApi: { trial: vi.fn(), login: vi.fn(), register: vi.fn(), me: vi.fn(), updateProfile: vi.fn() },
  whatsappApi: { list: vi.fn() },
  flowsApi: { list: vi.fn() },
  campaignsApi: { list: vi.fn() },
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

function renderContacts() {
  return render(<ContactsPage />);
}

describe('ContactsPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should render page title', async () => {
    (crmApi.listContacts as any).mockResolvedValue({ data: [] });
    renderContacts();

    await vi.waitFor(() => {
      expect(screen.getByText('Contatos')).toBeInTheDocument();
    });
  });

  it('should show demo contacts when API fails', async () => {
    (crmApi.listContacts as any).mockRejectedValue(new Error('API error'));
    renderContacts();

    await vi.waitFor(() => {
      expect(screen.getByText('João Silva')).toBeInTheDocument();
      expect(screen.getByText('Maria Santos')).toBeInTheDocument();
    });
  });

  it('should render table headers', async () => {
    (crmApi.listContacts as any).mockRejectedValue(new Error('API error'));
    renderContacts();

    await vi.waitFor(() => {
      expect(screen.getByText('Nome')).toBeInTheDocument();
      expect(screen.getByText('Telefone')).toBeInTheDocument();
      expect(screen.getByText('Email')).toBeInTheDocument();
      expect(screen.getByText('Empresa')).toBeInTheDocument();
      expect(screen.getByText('Tags')).toBeInTheDocument();
      expect(screen.getByText('Ações')).toBeInTheDocument();
    });
  });

  it('should render search input', async () => {
    (crmApi.listContacts as any).mockResolvedValue({ data: [] });
    renderContacts();

    await vi.waitFor(() => {
      expect(screen.getByPlaceholderText(/buscar por nome/i)).toBeInTheDocument();
    });
  });

  it('should filter contacts based on search', async () => {
    const user = userEvent.setup();
    (crmApi.listContacts as any).mockRejectedValue(new Error('API error'));
    renderContacts();

    await vi.waitFor(() => {
      expect(screen.getByText('João Silva')).toBeInTheDocument();
    });

    const searchInput = screen.getByPlaceholderText(/buscar por nome/i);
    await user.type(searchInput, 'Maria');

    expect(screen.queryByText('João Silva')).not.toBeInTheDocument();
    expect(screen.getByText('Maria Santos')).toBeInTheDocument();
  });

  it('should show empty state when no contacts match search', async () => {
    const user = userEvent.setup();
    (crmApi.listContacts as any).mockRejectedValue(new Error('API error'));
    renderContacts();

    await vi.waitFor(() => {
      expect(screen.getByText('João Silva')).toBeInTheDocument();
    });

    const searchInput = screen.getByPlaceholderText(/buscar por nome/i);
    await user.type(searchInput, 'ZZZ_NOT_FOUND');

    expect(screen.queryByText('João Silva')).not.toBeInTheDocument();
    expect(screen.getByText('Nenhum contato encontrado')).toBeInTheDocument();
  });

  it('should show import and export buttons', async () => {
    (crmApi.listContacts as any).mockResolvedValue({ data: [] });
    renderContacts();

    await vi.waitFor(() => {
      expect(screen.getByText('Importar')).toBeInTheDocument();
      expect(screen.getByText('Exportar')).toBeInTheDocument();
    });
  });

  it('should open modal when clicking Novo Contato', async () => {
    const user = userEvent.setup();
    (crmApi.listContacts as any).mockResolvedValue({ data: [] });
    renderContacts();

    let novoBtn: HTMLElement;
    await vi.waitFor(() => {
      const novoBtns = screen.getAllByText('Novo Contato');
      expect(novoBtns.length).toBeGreaterThanOrEqual(1);
      novoBtn = novoBtns[0];
    });

    await user.click(novoBtn!);

    await vi.waitFor(() => {
      // Modal should show form fields
      expect(screen.getByLabelText('Nome *')).toBeInTheDocument();
      expect(screen.getByLabelText('Telefone *')).toBeInTheDocument();
    });
  });

  it('should display contact tags as badges', async () => {
    (crmApi.listContacts as any).mockRejectedValue(new Error('API error'));
    renderContacts();

    await vi.waitFor(() => {
      const tagBadges = screen.getAllByText('lead', { exact: false });
      expect(tagBadges.length).toBeGreaterThan(0);
    });
  });

  it('should show contact count in subtitle', async () => {
    (crmApi.listContacts as any).mockResolvedValue({ data: [] });
    renderContacts();

    await vi.waitFor(() => {
      expect(screen.getByText(/contatos cadastrados/i)).toBeInTheDocument();
    });
  });

  it('should render action buttons for contacts', async () => {
    (crmApi.listContacts as any).mockRejectedValue(new Error('API error'));
    renderContacts();

    await vi.waitFor(() => {
      // There should be edit and delete icon SVGs (mocked)
      const editIcons = screen.getAllByTestId('icon-Edit3');
      expect(editIcons.length).toBeGreaterThan(0);
      const deleteIcons = screen.getAllByTestId('icon-Trash2');
      expect(deleteIcons.length).toBeGreaterThan(0);
    });
  });
});
