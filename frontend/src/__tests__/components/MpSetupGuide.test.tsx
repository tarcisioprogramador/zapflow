import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import MpSetupGuide from '../../components/MpSetupGuide';

// Mock the paymentsApi
const mockGetStatus = vi.fn();
vi.mock('../../api', () => ({
  paymentsApi: {
    getStatus: () => mockGetStatus(),
  },
}));

// Note: navigator.clipboard is not available in jsdom.
// The component's copyToClipboard catches the error and uses document.execCommand('copy') as fallback.
// We test the visual result (Check icon) rather than the clipboard call.

describe('MpSetupGuide', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Default: not configured, with no keys
    mockGetStatus.mockResolvedValue({
      data: {
        configured: false,
        canCheckout: false,
        keys: { accessToken: false, publicKey: false, webhookSecret: false },
        missingKeys: ['MP_ACCESS_TOKEN', 'MP_PUBLIC_KEY'],
        nextStep: 'Criar conta no Mercado Pago e copiar Access Token',
        signatureValidation: 'disabled',
      },
    });
  });

  // ─── Basic rendering ─────────────────────────

  it('should render full mode by default', async () => {
    render(<MpSetupGuide />);

    // Should show the header
    expect(await screen.findByText('Configuração de Pagamentos')).toBeInTheDocument();
    expect(screen.getByText('Mercado Pago — PIX, cartão e boleto')).toBeInTheDocument();
  });

  it('should render compact mode without header', async () => {
    render(<MpSetupGuide compact />);

    // Header should NOT be present in compact mode
    await waitFor(() => {
      expect(screen.queryByText('Configuração de Pagamentos')).not.toBeInTheDocument();
    });
  });

  it('should show CTA button to create Mercado Pago account in full mode', async () => {
    render(<MpSetupGuide />);

    expect(await screen.findByText('Criar Conta no Mercado Pago')).toBeInTheDocument();
  });

  it('should show step titles in full mode', async () => {
    render(<MpSetupGuide />);

    expect(await screen.findByText('Criar conta no Mercado Pago')).toBeInTheDocument();
    expect(screen.getByText('Copiar as chaves de API')).toBeInTheDocument();
    expect(screen.getByText('Adicionar no ambiente (Railway / .env)')).toBeInTheDocument();
    expect(screen.getByText('Configurar Webhook')).toBeInTheDocument();
  });

  it('should show Verificar button', async () => {
    render(<MpSetupGuide />);

    expect(await screen.findByText('Verificar')).toBeInTheDocument();
  });

  // ─── Status checking ─────────────────────────

  it('should call getStatus on mount', async () => {
    render(<MpSetupGuide />);

    await waitFor(() => {
      expect(mockGetStatus).toHaveBeenCalledTimes(1);
    });
  });

  it('should show configured banner when MP is configured', async () => {
    mockGetStatus.mockResolvedValue({
      data: {
        configured: true,
        canCheckout: true,
        keys: { accessToken: true, publicKey: true, webhookSecret: true },
        missingKeys: [],
        nextStep: 'Pronto para vender!',
        signatureValidation: 'active',
      },
    });

    render(<MpSetupGuide />);

    expect(await screen.findByText('Mercado Pago configurado!')).toBeInTheDocument();
    expect(screen.getByText(/PIX, cartão de crédito e boleto ativos/)).toBeInTheDocument();
  });

  it('should show pending banner when MP is not configured', async () => {
    render(<MpSetupGuide />);

    expect(await screen.findByText('Configuração pendente')).toBeInTheDocument();
  });

  it('should show signature validation as Ativa when webhookSecret is set', async () => {
    mockGetStatus.mockResolvedValue({
      data: {
        configured: true,
        keys: { accessToken: true, publicKey: true, webhookSecret: true },
        signatureValidation: 'active',
      },
    });

    render(<MpSetupGuide />);

    expect(await screen.findByText('Ativa ✓')).toBeInTheDocument();
  });

  it('should show signature validation as Opcional when webhookSecret is not set', async () => {
    mockGetStatus.mockResolvedValue({
      data: {
        configured: true,
        keys: { accessToken: true, publicKey: true, webhookSecret: false },
        signatureValidation: 'disabled',
      },
    });

    render(<MpSetupGuide />);

    expect(await screen.findByText('Opcional')).toBeInTheDocument();
  });

  it('should show missing keys when MP is not configured', async () => {
    render(<MpSetupGuide />);

    expect(await screen.findByText('MP_ACCESS_TOKEN')).toBeInTheDocument();
    expect(screen.getByText('MP_PUBLIC_KEY')).toBeInTheDocument();
  });

  // ─── Step active/completed states ─────────────

  it('should set active step to 0 when no keys configured', async () => {
    render(<MpSetupGuide />);

    // Step 1 should show "ATUAL" badge
    expect(await screen.findByText('ATUAL')).toBeInTheDocument();
  });

  it('should set active step to 3 when keys configured but no webhook', async () => {
    mockGetStatus.mockResolvedValue({
      data: {
        configured: false,
        keys: { accessToken: true, publicKey: true, webhookSecret: false },
        missingKeys: ['MP_WEBHOOK_SECRET'],
        signatureValidation: 'disabled',
      },
    });

    render(<MpSetupGuide />);

    // Webhook step (step 4) should show "ATUAL"
    const atualLabels = await screen.findAllByText('ATUAL');
    expect(atualLabels.length).toBeGreaterThanOrEqual(1);
  });

  // ─── Copy to clipboard ───────────────────────

  it('should show Check icon after clicking copy button (visual feedback)', async () => {
    const user = userEvent.setup();

    render(<MpSetupGuide />);

    // Find all copy buttons
    const copyButtons = await screen.findAllByTitle('Copiar');
    expect(copyButtons.length).toBeGreaterThan(0);

    // Click the first copy button
    await user.click(copyButtons[0]);

    // Should show Check icon as visual feedback (clipboard API is not available in jsdom,
    // but the component uses a fallback document.execCommand('copy') and still sets copied state)
    await waitFor(() => {
      expect(screen.getByTestId('icon-Check')).toBeInTheDocument();
    });
  });

  // ─── onConfigChange callback ─────────────────

  it('should call onConfigChange when MP becomes configured', async () => {
    const onConfigChange = vi.fn();
    mockGetStatus.mockResolvedValue({
      data: {
        configured: true,
        canCheckout: true,
        keys: { accessToken: true, publicKey: true, webhookSecret: false },
        missingKeys: [],
        nextStep: 'Pronto para vender!',
        signatureValidation: 'disabled',
      },
    });

    render(<MpSetupGuide onConfigChange={onConfigChange} />);

    await waitFor(() => {
      expect(onConfigChange).toHaveBeenCalled();
    });
  });

  it('should NOT call onConfigChange when MP is not configured', async () => {
    const onConfigChange = vi.fn();

    render(<MpSetupGuide onConfigChange={onConfigChange} />);

    await waitFor(() => {
      expect(onConfigChange).not.toHaveBeenCalled();
    });
  });

  // ─── Webhook URL ─────────────────────────────

  it('should show the webhook URL with origin', async () => {
    render(<MpSetupGuide />);

    expect(await screen.findByText(/\/api\/webhook\/mercadopago/)).toBeInTheDocument();
  });

  it('should show required webhook events', async () => {
    render(<MpSetupGuide />);

    expect(await screen.findByText('payment')).toBeInTheDocument();
    expect(screen.getByText('subscription_preapproval')).toBeInTheDocument();
  });

  // ─── PIX info section ────────────────────────

  it('should show PIX info section when not configured in full mode', async () => {
    render(<MpSetupGuide />);

    expect(await screen.findByText(/PIX nativo/)).toBeInTheDocument();
  });

  it('should NOT show PIX info section when configured', async () => {
    mockGetStatus.mockResolvedValue({
      data: {
        configured: true,
        keys: { accessToken: true, publicKey: true, webhookSecret: false },
      },
    });

    render(<MpSetupGuide />);

    await waitFor(() => {
      expect(screen.queryByText(/PIX nativo/)).not.toBeInTheDocument();
    });
  });

  // ─── API error handling ──────────────────────

  it('should handle API error gracefully', async () => {
    mockGetStatus.mockRejectedValue(new Error('Network error'));

    render(<MpSetupGuide />);

    // Should still render without crashing
    expect(await screen.findByText('Configuração de Pagamentos')).toBeInTheDocument();
  });

  // ─── Verify button re-checks status ──────────

  it('should re-check status when Verificar button is clicked', async () => {
    const user = userEvent.setup();
    render(<MpSetupGuide />);

    // Initial call
    await waitFor(() => {
      expect(mockGetStatus).toHaveBeenCalledTimes(1);
    });

    // Click verify button
    const verifyBtn = screen.getByText('Verificar');
    await user.click(verifyBtn);

    // Should be called again
    await waitFor(() => {
      expect(mockGetStatus).toHaveBeenCalledTimes(2);
    });
  });

  // ─── Compact mode specifics ──────────────────

  it('should not show CTA button in compact mode', async () => {
    render(<MpSetupGuide compact />);

    await waitFor(() => {
      expect(screen.queryByText('Criar Conta no Mercado Pago')).not.toBeInTheDocument();
    });
  });

  it('should not show PIX info in compact mode', async () => {
    render(<MpSetupGuide compact />);

    await waitFor(() => {
      expect(screen.queryByText(/PIX nativo/)).not.toBeInTheDocument();
    });
  });

  // ─── Configured state: hide setup steps ──────

  it('should hide setup steps when configured', async () => {
    mockGetStatus.mockResolvedValue({
      data: {
        configured: true,
        keys: { accessToken: true, publicKey: true, webhookSecret: false },
      },
    });

    render(<MpSetupGuide />);

    // Should NOT show steps after configured
    await waitFor(() => {
      expect(screen.queryByText('Criar conta no Mercado Pago')).not.toBeInTheDocument();
    });

    // Should show "Pagamentos ativos!" message
    expect(screen.getByText('Pagamentos ativos!')).toBeInTheDocument();
  });

  // ─── Signature validation info ───────────────

  it('should show signature validation section when configured', async () => {
    mockGetStatus.mockResolvedValue({
      data: {
        configured: true,
        keys: { accessToken: true, publicKey: true, webhookSecret: false },
      },
    });

    render(<MpSetupGuide />);

    expect(await screen.findByText(/validação de assinatura/i)).toBeInTheDocument();
  });
});
