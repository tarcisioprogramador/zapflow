import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import DashboardTour from '../../components/DashboardTour';

// ─── Mock tourSync ─────────────────────────────────
// Prevents real axios calls and ensures syncTourFromBackend resolves
// synchronously (on microtask queue), avoiding async state leaks.
vi.mock('../../utils/tourSync', () => ({
  syncTourFromBackend: vi.fn().mockResolvedValue(undefined),
  syncTourToBackend: vi.fn(),
}));

// ─── Mocks ────────────────────────────────────────

Element.prototype.scrollIntoView = vi.fn();

const mockRect = {
  top: 100, left: 100, right: 300, bottom: 160,
  width: 200, height: 60, x: 0, y: 0, toJSON: () => {},
};
Element.prototype.getBoundingClientRect = vi.fn(() => mockRect);

const STORAGE_KEY = 'zapflow-dashboard-tour-completed';

// ─── Fake Timers Setup ─────────────────────────────
// Fake timers give us precise control over setTimeout callbacks,
// so we can fire them inside act() blocks and eliminate all warnings.

beforeEach(() => {
  vi.useFakeTimers();
});

afterEach(() => {
  // Run only pending timers whose callbacks check `cancelled` and won't
  // call setState when the component is already unmounted.
  vi.runOnlyPendingTimers();
  vi.useRealTimers();
});

// ─── Helpers ───────────────────────────────────────

function setupTourTargets() {
  const container = document.createElement('div');
  container.innerHTML = `
    <div data-tour="stats">Stats Section</div>
    <div data-tour="chart-messages">Messages Chart</div>
    <div data-tour="chart-pipeline">Pipeline Chart</div>
    <div data-tour="summary">Summary Section</div>
    <div data-tour="ai-performance">AI Performance</div>
    <div data-tour="activity">Activity Feed</div>
    <div data-tour="sidebar">Sidebar Navigation</div>
  `;
  document.body.appendChild(container);
  return container;
}

function renderTour() {
  return render(
    <MemoryRouter>
      <DashboardTour />
    </MemoryRouter>
  );
}

/** Wait for a text element to appear in the DOM (polls via vi.waitFor — works with fake timers) */
async function waitForText(text: string | RegExp) {
  await vi.waitFor(
    () => expect(screen.getByText(text)).toBeInTheDocument(),
    { timeout: 5000, interval: 100 }
  );
}

/** Wait for a text element to DISAPPEAR from the DOM */
async function waitForTextToDisappear(text: string | RegExp) {
  await vi.waitFor(
    () => expect(screen.queryByText(text)).not.toBeInTheDocument(),
    { timeout: 3000, interval: 100 }
  );
}

/**
 * Flush microtasks + fire all pending fake timers inside act().
 * Repeat for N rounds because React processes state updates asynchronously
 * inside act(): when a timer fires and calls setState, React batches the
 * update until act() ends. Then effects fire and create NEW timers.
 * Multiple rounds catch this cascade: auto-open → setIsOpen → effect →
 * focus timer → setTargetRect → effect → (terminates).
 */
async function settleAllTimers(rounds = 10) {
  for (let i = 0; i < rounds; i++) {
    await act(async () => {
      await Promise.resolve(); // flush microtasks
      vi.runAllTimers();       // fire all pending timers
    });
  }
}

/** Advance fake timers enough for the tour to auto-open and fully render */
async function advanceToOpenTour() {
  await settleAllTimers();
}

/** Click a button and let React process all state updates within act() */
async function clickAndWait(button: HTMLElement) {
  await act(async () => {
    fireEvent.click(button);
  });
  await settleAllTimers();
}

/** Fire a DOM event inside act(), then settle all timers */
async function fireAndSettle(eventFn: () => void) {
  await act(async () => {
    eventFn();
  });
  await settleAllTimers();
}

// ─── Tests ─────────────────────────────────────────

describe('DashboardTour', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
  });

  afterEach(() => {
    document.body.innerHTML = '';
  });

  // ─── Floating Button ──────────────────────────

  describe('Floating Button', () => {
    it('should show floating button immediately when tour is not completed', async () => {
      localStorage.removeItem(STORAGE_KEY);
      renderTour();

      // FloatingTourButton's useEffect fires → getTourCompleted() false
      // → setShow(true) immediately (inside render's act()) → button visible.
      // syncTourFromBackend resolves on microtask, .finally() runs and
      // schedules setTimeout(800). We flush microtasks but do NOT advance
      // time past 800ms — the auto-open timer should NOT fire yet, keeping
      // the floating button visible.
      await act(async () => {
        await Promise.resolve(); // flush microtasks
      });

      // Clear the 800ms auto-open timer so vi.waitFor doesn't internally
      // advance past 800ms and fire it outside act() while polling.
      vi.clearAllTimers();

      await waitForText('Tour pelo Dashboard');
    });

    it('should replace floating button with tour overlay after auto-open', async () => {
      setupTourTargets();
      renderTour();
      await advanceToOpenTour();

      // Auto-open fires after 800ms, tryFocus sets targetRect after another 400ms
      await waitForText('📊 Métricas em Tempo Real');

      // Floating button should be gone
      expect(screen.queryByText('Tour pelo Dashboard')).not.toBeInTheDocument();
    });
  });

  // ─── Tour Overlay ─────────────────────────────

  describe('Tour Overlay', () => {
    it('should auto-open with step counter, close button, and title', async () => {
      setupTourTargets();
      renderTour();
      await advanceToOpenTour();

      await waitForText('📊 Métricas em Tempo Real');

      expect(screen.getByText('1')).toBeInTheDocument();
      expect(screen.getByText('/ 7')).toBeInTheDocument();
      expect(screen.getByTitle('Fechar tour')).toBeInTheDocument();
      expect(screen.getByText(/principais métricas: mensagens enviadas/i)).toBeInTheDocument();
    });
  });

  // ─── Navigation ───────────────────────────────

  describe('Navigation', () => {
    it('should show "Começar" on first step and NOT "Voltar"', async () => {
      setupTourTargets();
      renderTour();
      await advanceToOpenTour();
      await waitForText('Começar');

      expect(screen.queryByText('Voltar')).not.toBeInTheDocument();
    });

    it('should advance to next step when clicking Next', async () => {
      setupTourTargets();
      renderTour();
      await advanceToOpenTour();
      await waitForText('Começar');

      await clickAndWait(screen.getByText('Começar'));
      await waitForText('📈 Gráfico de Mensagens');
    });

    it('should go back when clicking Voltar', async () => {
      setupTourTargets();
      renderTour();
      await advanceToOpenTour();
      await waitForText('Começar');

      // Go to step 2
      await clickAndWait(screen.getByText('Começar'));
      await waitForText('📈 Gráfico de Mensagens');

      // Click Voltar
      await clickAndWait(screen.getByText('Voltar'));
      await waitForText('📊 Métricas em Tempo Real');
    });

    it('should skip tour when clicking Pular', async () => {
      setupTourTargets();
      renderTour();
      await advanceToOpenTour();
      await waitForText('Pular');

      await fireAndSettle(() => fireEvent.click(screen.getByText('Pular')));
      await waitForTextToDisappear('📊 Métricas em Tempo Real');
    });

    it('should close tour when clicking the X button', async () => {
      setupTourTargets();
      renderTour();
      await advanceToOpenTour();

      await vi.waitFor(
        () => expect(screen.getByTitle('Fechar tour')).toBeInTheDocument(),
        { timeout: 5000, interval: 100 }
      );

      await fireAndSettle(() => fireEvent.click(screen.getByTitle('Fechar tour')));
      await waitForTextToDisappear('📊 Métricas em Tempo Real');
    });

    it('should navigate to step 3 when clicking the 3rd progress dot', async () => {
      setupTourTargets();
      renderTour();
      await advanceToOpenTour();
      await waitForText('Começar');

      // Find the step indicator dots
      const closeBtn = screen.getByTitle('Fechar tour');
      const allButtons = screen.getAllByRole('button');
      const dotButtons = allButtons.filter(
        (btn) =>
          btn !== closeBtn &&
          (btn.textContent?.trim() === '' || btn.textContent === null)
      );

      // Click the 3rd dot (index 2)
      expect(dotButtons.length).toBeGreaterThanOrEqual(3);
      await clickAndWait(dotButtons[2]);
      await waitForText('🎯 Pipeline de Vendas');
    });

    it('should show "Começar a usar" CTA on last step', async () => {
      setupTourTargets();
      renderTour();
      await advanceToOpenTour();
      await waitForText('Começar');

      // Navigate through all steps to reach the last one
      for (let i = 0; i < 6; i++) {
        const nextBtn = screen.queryByText('Próximo') || screen.queryByText('Começar');
        if (!nextBtn) break;
        await clickAndWait(nextBtn);
      }

      await waitForText('Começar a usar');
    });

    it('should complete tour when clicking "Começar a usar" on last step', async () => {
      setupTourTargets();
      renderTour();
      await advanceToOpenTour();
      await waitForText('Começar');

      // Navigate to last step
      for (let i = 0; i < 6; i++) {
        const nextBtn = screen.queryByText('Próximo') || screen.queryByText('Começar');
        if (!nextBtn) break;
        await clickAndWait(nextBtn);
      }

      await waitForText('Começar a usar');
      await fireAndSettle(() => fireEvent.click(screen.getByText('Começar a usar')));

      await waitForTextToDisappear('🧭 Navegação Completa');
    });
  });

  // ─── Keyboard Support ─────────────────────────

  describe('Keyboard Support', () => {
    it('should skip tour when pressing Escape', async () => {
      setupTourTargets();
      renderTour();
      await advanceToOpenTour();
      await waitForText('📊 Métricas em Tempo Real');

      await fireAndSettle(() => fireEvent.keyDown(window, { key: 'Escape' }));
      await waitForTextToDisappear('📊 Métricas em Tempo Real');
    });

    it('should advance step when pressing ArrowRight', async () => {
      setupTourTargets();
      renderTour();
      await advanceToOpenTour();
      await waitForText('📊 Métricas em Tempo Real');

      await fireAndSettle(() => fireEvent.keyDown(window, { key: 'ArrowRight' }));
      await waitForText('📈 Gráfico de Mensagens');
    });

    it('should go back when pressing ArrowLeft', async () => {
      setupTourTargets();
      renderTour();
      await advanceToOpenTour();
      await waitForText('📊 Métricas em Tempo Real');

      // Advance to step 2 via ArrowRight
      await fireAndSettle(() => fireEvent.keyDown(window, { key: 'ArrowRight' }));
      await waitForText('📈 Gráfico de Mensagens');

      // Press ArrowLeft to go back
      await fireAndSettle(() => fireEvent.keyDown(window, { key: 'ArrowLeft' }));
      await waitForText('📊 Métricas em Tempo Real');
    });

    it('should prevent default on arrow keys', async () => {
      setupTourTargets();
      renderTour();
      await advanceToOpenTour();
      await waitForText('📊 Métricas em Tempo Real');

      const event = new KeyboardEvent('keydown', { key: 'ArrowRight', cancelable: true });
      await act(async () => {
        window.dispatchEvent(event);
      });
      expect(event.defaultPrevented).toBe(true);

      // Settle focus timers to prevent act() warnings during teardown
      await settleAllTimers();
    });

    it('should NOT respond to arrow keys when tour is closed', async () => {
      localStorage.setItem(STORAGE_KEY, 'true');
      renderTour();

      await fireAndSettle(() => fireEvent.keyDown(window, { key: 'ArrowRight' }));
      expect(screen.queryByText('📈 Gráfico de Mensagens')).not.toBeInTheDocument();
    });
  });

  // ─── localStorage Persistence ─────────────────

  describe('localStorage Persistence', () => {
    it('should persist completion when skipping tour', async () => {
      setupTourTargets();
      renderTour();
      await advanceToOpenTour();
      await waitForText('Pular');

      await fireAndSettle(() => fireEvent.click(screen.getByText('Pular')));
      await waitForTextToDisappear('📊 Métricas em Tempo Real');

      expect(localStorage.getItem(STORAGE_KEY)).toBe('true');
    });

    it('should persist completion when pressing Escape', async () => {
      setupTourTargets();
      renderTour();
      await advanceToOpenTour();
      await waitForText('📊 Métricas em Tempo Real');

      await fireAndSettle(() => fireEvent.keyDown(window, { key: 'Escape' }));
      await waitForTextToDisappear('📊 Métricas em Tempo Real');

      expect(localStorage.getItem(STORAGE_KEY)).toBe('true');
    });

    it('should persist completion when clicking close button', async () => {
      setupTourTargets();
      renderTour();
      await advanceToOpenTour();

      await vi.waitFor(
        () => expect(screen.getByTitle('Fechar tour')).toBeInTheDocument(),
        { timeout: 5000, interval: 100 }
      );

      await fireAndSettle(() => fireEvent.click(screen.getByTitle('Fechar tour')));
      await waitForTextToDisappear('📊 Métricas em Tempo Real');

      expect(localStorage.getItem(STORAGE_KEY)).toBe('true');
    });

    it('should persist completion when navigating to last step', async () => {
      setupTourTargets();
      renderTour();
      await advanceToOpenTour();
      await waitForText('Começar');

      for (let i = 0; i < 6; i++) {
        const nextBtn = screen.queryByText('Próximo') || screen.queryByText('Começar');
        if (!nextBtn) break;
        await clickAndWait(nextBtn);
      }

      await waitForText('Começar a usar');
      await fireAndSettle(() => fireEvent.click(screen.getByText('Começar a usar')));

      expect(localStorage.getItem(STORAGE_KEY)).toBe('true');
    });

    it('should NOT auto-open after completion', async () => {
      setupTourTargets();
      const { unmount } = renderTour();
      await advanceToOpenTour();
      await waitForText('Pular');

      await fireAndSettle(() => fireEvent.click(screen.getByText('Pular')));
      await waitForTextToDisappear('📊 Métricas em Tempo Real');
      expect(localStorage.getItem(STORAGE_KEY)).toBe('true');

      unmount();

      // Re-render — should NOT auto-open
      renderTour();
      await settleAllTimers();
      expect(screen.queryByText('📊 Métricas em Tempo Real')).not.toBeInTheDocument();
      expect(screen.queryByTitle('Fechar tour')).not.toBeInTheDocument();
    });
  });

  // ─── Edge Cases ───────────────────────────────

  describe('Edge Cases', () => {
    it('should handle missing target elements gracefully', async () => {
      // No target elements in DOM
      renderTour();
      await advanceToOpenTour();

      await vi.waitFor(
        () => expect(screen.getByTitle('Fechar tour')).toBeInTheDocument(),
        { timeout: 3000, interval: 100 }
      );
      expect(screen.getByText('1')).toBeInTheDocument();
      expect(screen.getByText('/ 7')).toBeInTheDocument();
    });

    it('should show all 7 step titles in order', async () => {
      setupTourTargets();
      renderTour();
      await advanceToOpenTour();

      const titles = [
        '📊 Métricas em Tempo Real',
        '📈 Gráfico de Mensagens',
        '🎯 Pipeline de Vendas',
        '📋 Resumo Rápido',
        '🤖 IA Megan',
        '🕐 Atividade Recente',
        '🧭 Navegação Completa',
      ];

      for (let i = 0; i < titles.length; i++) {
        await waitForText(titles[i]);

        const nextBtn = screen.queryByText('Próximo') || screen.queryByText('Começar');
        if (nextBtn) {
          await clickAndWait(nextBtn);
        }
      }
    });

    it('should not crash when localStorage is unavailable', async () => {
      vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
        throw new Error('localStorage not available');
      });
      vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
        throw new Error('localStorage not available');
      });

      setupTourTargets();
      renderTour();
      await advanceToOpenTour();

      await waitForText('📊 Métricas em Tempo Real');

      // Pular should also not crash
      await fireAndSettle(() => fireEvent.click(screen.getByText('Pular')));
      await waitForTextToDisappear('📊 Métricas em Tempo Real');

      vi.restoreAllMocks();
    });
  });
});
