import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import OnboardingTour from '../../components/OnboardingTour';

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

const STORAGE_KEY = 'zapflow-onboarding-tour-completed';

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
    <div data-tour="ob-welcome">Welcome Section</div>
    <div data-tour="ob-whatsapp">WhatsApp Section</div>
    <div data-tour="ob-payments">Payments Section</div>
    <div data-tour="ob-ai">AI Section</div>
    <div data-tour="ob-actions">Actions Section</div>
    <div data-tour="ob-dashboard">Dashboard Link</div>
  `;
  document.body.appendChild(container);
  return container;
}

function renderTour(onComplete?: () => void) {
  return render(
    <MemoryRouter>
      <OnboardingTour onComplete={onComplete} />
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

describe('OnboardingTour', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
  });

  afterEach(() => {
    document.body.innerHTML = '';
  });

  // ─── Rendering / Auto-open ────────────────────

  describe('Rendering & Auto-open', () => {
    it('should auto-open with step counter, close button, and title', async () => {
      setupTourTargets();
      renderTour();
      await advanceToOpenTour();

      await waitForText('👋 Boas-vindas ao ZapFlow!');

      expect(screen.getByText('1')).toBeInTheDocument();
      expect(screen.getByText('/ 6')).toBeInTheDocument();
      expect(screen.getByTitle('Fechar tour')).toBeInTheDocument();
      expect(screen.getByText(/complete os 3 passos abaixo/i)).toBeInTheDocument();
    });

    it('should show step counter with correct totals', async () => {
      setupTourTargets();
      renderTour();
      await advanceToOpenTour();

      await waitForText('👋 Boas-vindas ao ZapFlow!');
      expect(screen.getByText('1')).toBeInTheDocument();
      expect(screen.getByText('/ 6')).toBeInTheDocument();
    });

    it('should render nothing when closed', async () => {
      localStorage.setItem(STORAGE_KEY, 'true');
      renderTour();

      // syncTourFromBackend resolves, .finally() runs,
      // getTourCompleted() returns true → no timer scheduled
      await settleAllTimers();

      expect(screen.queryByText('👋 Boas-vindas ao ZapFlow!')).not.toBeInTheDocument();
      expect(screen.queryByTitle('Fechar tour')).not.toBeInTheDocument();
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

    it('should advance to next step when clicking "Começar" / "Próximo"', async () => {
      setupTourTargets();
      renderTour();
      await advanceToOpenTour();
      await waitForText('Começar');

      await clickAndWait(screen.getByText('Começar'));
      await waitForText('📱 Conectar WhatsApp');
    });

    it('should show "Voltar" on step 2 and go back when clicked', async () => {
      setupTourTargets();
      renderTour();
      await advanceToOpenTour();
      await waitForText('Começar');

      // Go to step 2
      await clickAndWait(screen.getByText('Começar'));
      await waitForText('📱 Conectar WhatsApp');

      // "Voltar" should be visible on step 2
      expect(screen.getByText('Voltar')).toBeInTheDocument();

      // Click Voltar
      await clickAndWait(screen.getByText('Voltar'));
      await waitForText('👋 Boas-vindas ao ZapFlow!');
    });

    it('should skip tour when clicking "Pular"', async () => {
      setupTourTargets();
      renderTour();
      await advanceToOpenTour();
      await waitForText('Pular');

      await fireAndSettle(() => fireEvent.click(screen.getByText('Pular')));
      await waitForTextToDisappear('👋 Boas-vindas ao ZapFlow!');
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
      await waitForTextToDisappear('👋 Boas-vindas ao ZapFlow!');
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

      expect(dotButtons.length).toBeGreaterThanOrEqual(3);
      await clickAndWait(dotButtons[2]);
      await waitForText('💳 Configurar Pagamentos');
    });

    it('should show "Ir para o Dashboard" CTA on last step', async () => {
      setupTourTargets();
      renderTour();
      await advanceToOpenTour();
      await waitForText('Começar');

      // Navigate through all steps to reach the last one
      for (let i = 0; i < 5; i++) {
        const nextBtn = screen.queryByText('Próximo') || screen.queryByText('Começar');
        if (!nextBtn) break;
        await clickAndWait(nextBtn);
      }

      await waitForText('Ir para o Dashboard');
    });

    it('should complete tour when clicking "Ir para o Dashboard" on last step', async () => {
      setupTourTargets();
      renderTour();
      await advanceToOpenTour();
      await waitForText('Começar');

      // Navigate to last step
      for (let i = 0; i < 5; i++) {
        const nextBtn = screen.queryByText('Próximo') || screen.queryByText('Começar');
        if (!nextBtn) break;
        await clickAndWait(nextBtn);
      }

      await waitForText('Ir para o Dashboard');
      await fireAndSettle(() => fireEvent.click(screen.getByText('Ir para o Dashboard')));

      await waitForTextToDisappear('🚀 Explorar o Dashboard');
    });

    it('should call onComplete when finishing the tour', async () => {
      const onComplete = vi.fn();
      setupTourTargets();
      renderTour(onComplete);
      await advanceToOpenTour();
      await waitForText('Começar');

      // Navigate to last step
      for (let i = 0; i < 5; i++) {
        const nextBtn = screen.queryByText('Próximo') || screen.queryByText('Começar');
        if (!nextBtn) break;
        await clickAndWait(nextBtn);
      }

      await waitForText('Ir para o Dashboard');
      await fireAndSettle(() => fireEvent.click(screen.getByText('Ir para o Dashboard')));

      await vi.waitFor(() => expect(onComplete).toHaveBeenCalledTimes(1), { timeout: 2000 });
    });

    it('should call onComplete when skipping the tour', async () => {
      const onComplete = vi.fn();
      setupTourTargets();
      renderTour(onComplete);
      await advanceToOpenTour();
      await waitForText('Pular');

      await fireAndSettle(() => fireEvent.click(screen.getByText('Pular')));
      await waitForTextToDisappear('👋 Boas-vindas ao ZapFlow!');

      expect(onComplete).toHaveBeenCalledTimes(1);
    });
  });

  // ─── Keyboard Support ─────────────────────────

  describe('Keyboard Support', () => {
    it('should skip tour when pressing Escape', async () => {
      setupTourTargets();
      renderTour();
      await advanceToOpenTour();
      await waitForText('👋 Boas-vindas ao ZapFlow!');

      await fireAndSettle(() => fireEvent.keyDown(window, { key: 'Escape' }));
      await waitForTextToDisappear('👋 Boas-vindas ao ZapFlow!');
    });

    it('should advance step when pressing ArrowRight', async () => {
      setupTourTargets();
      renderTour();
      await advanceToOpenTour();
      await waitForText('👋 Boas-vindas ao ZapFlow!');

      await fireAndSettle(() => fireEvent.keyDown(window, { key: 'ArrowRight' }));
      await waitForText('📱 Conectar WhatsApp');
    });

    it('should go back when pressing ArrowLeft', async () => {
      setupTourTargets();
      renderTour();
      await advanceToOpenTour();
      await waitForText('👋 Boas-vindas ao ZapFlow!');

      // Advance to step 2 via ArrowRight
      await fireAndSettle(() => fireEvent.keyDown(window, { key: 'ArrowRight' }));
      await waitForText('📱 Conectar WhatsApp');

      // Press ArrowLeft to go back
      await fireAndSettle(() => fireEvent.keyDown(window, { key: 'ArrowLeft' }));
      await waitForText('👋 Boas-vindas ao ZapFlow!');
    });

    it('should prevent default on arrow keys', async () => {
      setupTourTargets();
      renderTour();
      await advanceToOpenTour();
      await waitForText('👋 Boas-vindas ao ZapFlow!');

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
      expect(screen.queryByText('📱 Conectar WhatsApp')).not.toBeInTheDocument();
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
      await waitForTextToDisappear('👋 Boas-vindas ao ZapFlow!');

      expect(localStorage.getItem(STORAGE_KEY)).toBe('true');
    });

    it('should persist completion when pressing Escape', async () => {
      setupTourTargets();
      renderTour();
      await advanceToOpenTour();
      await waitForText('👋 Boas-vindas ao ZapFlow!');

      await fireAndSettle(() => fireEvent.keyDown(window, { key: 'Escape' }));
      await waitForTextToDisappear('👋 Boas-vindas ao ZapFlow!');

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
      await waitForTextToDisappear('👋 Boas-vindas ao ZapFlow!');

      expect(localStorage.getItem(STORAGE_KEY)).toBe('true');
    });

    it('should persist completion when finishing the tour on last step', async () => {
      setupTourTargets();
      renderTour();
      await advanceToOpenTour();
      await waitForText('Começar');

      for (let i = 0; i < 5; i++) {
        const nextBtn = screen.queryByText('Próximo') || screen.queryByText('Começar');
        if (!nextBtn) break;
        await clickAndWait(nextBtn);
      }

      await waitForText('Ir para o Dashboard');
      await fireAndSettle(() => fireEvent.click(screen.getByText('Ir para o Dashboard')));

      expect(localStorage.getItem(STORAGE_KEY)).toBe('true');
    });

    it('should NOT auto-open after completion', async () => {
      setupTourTargets();
      const { unmount } = renderTour();
      await advanceToOpenTour();
      await waitForText('Pular');

      await fireAndSettle(() => fireEvent.click(screen.getByText('Pular')));
      await waitForTextToDisappear('👋 Boas-vindas ao ZapFlow!');
      expect(localStorage.getItem(STORAGE_KEY)).toBe('true');

      unmount();

      // Re-render — should NOT auto-open
      renderTour();
      await settleAllTimers();
      expect(screen.queryByText('👋 Boas-vindas ao ZapFlow!')).not.toBeInTheDocument();
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
      expect(screen.getByText('/ 6')).toBeInTheDocument();
    });

    it('should show all 6 step titles in order', async () => {
      setupTourTargets();
      renderTour();
      await advanceToOpenTour();

      const titles = [
        '👋 Boas-vindas ao ZapFlow!',
        '📱 Conectar WhatsApp',
        '💳 Configurar Pagamentos',
        '🤖 Treinar IA Megan',
        '🎯 Acompanhe o Progresso',
        '🚀 Explorar o Dashboard',
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

      // getTourCompleted returns false (try/catch) → tour auto-opens
      await waitForText('👋 Boas-vindas ao ZapFlow!');

      // Pular should also not crash
      await fireAndSettle(() => fireEvent.click(screen.getByText('Pular')));
      await waitForTextToDisappear('👋 Boas-vindas ao ZapFlow!');

      vi.restoreAllMocks();
    });
  });
});
