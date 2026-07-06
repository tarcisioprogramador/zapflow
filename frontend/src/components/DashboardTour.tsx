import { useEffect, useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { X, ChevronLeft, ChevronRight, SkipForward, Zap } from 'lucide-react';
import { syncTourToBackend, syncTourFromBackend } from '../utils/tourSync';

// ─── Tour Steps ───────────────────────────────────
interface TourStep {
  targetSelector: string;
  title: string;
  description: string;
  tooltipPosition: 'top' | 'bottom' | 'left' | 'right';
  action?: {
    label: string;
    link: string;
  };
}

const STEPS: TourStep[] = [
  {
    targetSelector: '[data-tour="stats"]',
    title: '📊 Métricas em Tempo Real',
    description: 'Acompanhe suas principais métricas: mensagens enviadas, conversas ativas, contatos e taxa de conversão — tudo atualizado em tempo real.',
    tooltipPosition: 'bottom',
  },
  {
    targetSelector: '[data-tour="chart-messages"]',
    title: '📈 Gráfico de Mensagens',
    description: 'Visualize o volume de mensagens dos últimos 7 dias. O gráfico de área mostra a tendência de conversas ao longo da semana.',
    tooltipPosition: 'top',
  },
  {
    targetSelector: '[data-tour="chart-pipeline"]',
    title: '🎯 Pipeline de Vendas',
    description: 'Acompanhe seus leads em cada etapa do funil: Lead → Contato → Proposta → Fechado. Veja quantos cards estão em cada fase.',
    tooltipPosition: 'top',
  },
  {
    targetSelector: '[data-tour="summary"]',
    title: '📋 Resumo Rápido',
    description: 'Confira de relance seus flows ativos, campanhas em andamento e números de WhatsApp conectados.',
    tooltipPosition: 'top',
  },
  {
    targetSelector: '[data-tour="ai-performance"]',
    title: '🤖 IA Megan',
    description: 'A inteligência artificial do ZapFlow trabalha 24 horas por dia atendendo seus clientes com 94% de taxa de acerto e resposta em 1.2s.',
    tooltipPosition: 'top',
  },
  {
    targetSelector: '[data-tour="activity"]',
    title: '🕐 Atividade Recente',
    description: 'Fique por dentro de tudo que acontece: novas conversas, campanhas enviadas, leads movidos no CRM e flows ativados.',
    tooltipPosition: 'left',
  },
  {
    targetSelector: '[data-tour="sidebar"]',
    title: '🧭 Navegação Completa',
    description: 'Use o menu lateral para acessar WhatsApp, Conversas, Automações, CRM, Disparos, Contatos e Configurações. Tudo na palma da mão!',
    tooltipPosition: 'right',
    action: {
      label: 'Começar a usar',
      link: '/whatsapp',
    },
  },
];

const TOUR_STORAGE_KEY = 'zapflow-dashboard-tour-completed';

// ─── Helpers ──────────────────────────────────────
function getTourCompleted(): boolean {
  try {
    return localStorage.getItem(TOUR_STORAGE_KEY) === 'true';
  } catch {
    return false;
  }
}

function setTourCompleted(value: boolean) {
  try {
    localStorage.setItem(TOUR_STORAGE_KEY, value ? 'true' : 'false');
  } catch {
    // localStorage might not be available
  }
  // Sync to backend in the background
  if (value) {
    syncTourToBackend({ dashboard: true });
  }
}

// ─── Tooltip Content ──────────────────────────────
function TourTooltip({
  step,
  current,
  total,
  onPrev,
  onNext,
  onSkip,
  onGoTo,
}: {
  step: TourStep;
  current: number;
  total: number;
  onPrev: () => void;
  onNext: () => void;
  onSkip: () => void;
  onGoTo: (index: number) => void;
}) {
  const isFirst = current === 0;
  const isLast = current === total - 1;

  return (
    <div className="bg-dark-800 border border-dark-600/60 rounded-2xl shadow-2xl shadow-black/40 p-5 w-80 animate-fade-in">
      {/* Title */}
      <h3 className="text-base font-heading font-bold text-white mb-2">{step.title}</h3>
      <p className="text-sm text-dark-300 leading-relaxed mb-4">{step.description}</p>

      {/* Steps indicator */}
      <div className="flex items-center gap-1.5 mb-4">
        {Array.from({ length: total }).map((_, i) => (
          <button
            key={i}
            onClick={() => onGoTo(i)}
            className={`h-1.5 rounded-full transition-all duration-300 ${
              i === current
                ? 'w-6 bg-zap-500'
                : 'w-1.5 bg-dark-600 hover:bg-dark-500'
            }`}
          />
        ))}
      </div>

      {/* Actions */}
      <div className="flex items-center justify-between">
        <div className="flex gap-2">
          {!isFirst && (
            <button
              onClick={onPrev}
              className="flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-dark-300 hover:text-white bg-dark-700/50 hover:bg-dark-700 rounded-lg transition-all"
            >
              <ChevronLeft className="w-3.5 h-3.5" />
              Voltar
            </button>
          )}
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={onSkip}
            className="flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-dark-400 hover:text-dark-200 transition-colors"
          >
            <SkipForward className="w-3.5 h-3.5" />
            Pular
          </button>
          {isLast && step.action ? (
            <Link
              to={step.action.link}
              onClick={onSkip}
              className="flex items-center gap-1.5 px-4 py-1.5 text-xs font-bold text-white bg-zap-500 hover:bg-zap-600 rounded-lg transition-all shadow-lg shadow-zap-500/20"
            >
              {step.action.label}
              <ChevronRight className="w-3.5 h-3.5" />
            </Link>
          ) : (
            <button
              onClick={onNext}
              className="flex items-center gap-1 px-4 py-1.5 text-xs font-bold text-white bg-zap-500 hover:bg-zap-600 rounded-lg transition-all shadow-lg shadow-zap-500/20"
            >
              {isFirst ? 'Começar' : 'Próximo'}
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════
// ─── Dashboard Tour Component ─────────────────────
// ═══════════════════════════════════════════════════
export default function DashboardTour() {
  const [isOpen, setIsOpen] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const [targetRect, setTargetRect] = useState<DOMRect | null>(null);
  const [tooltipSide, setTooltipSide] = useState<'top' | 'bottom' | 'left' | 'right'>('bottom');


  // Sync backend status on mount, then auto-open if tour not completed
  useEffect(() => {
    let cancelled = false;
    syncTourFromBackend().finally(() => {
      if (cancelled) return;
      const completed = getTourCompleted();
      if (!completed) {
        setTimeout(() => {
          if (!cancelled) setIsOpen(true);
        }, 800);
      }
    });
    return () => { cancelled = true; };
  }, []);

  // Update target rect on scroll/resize


  // Scroll to target and update rect
  const focusTarget = useCallback((stepIndex: number) => {
    const step = STEPS[stepIndex];
    if (!step) return;

    const el = document.querySelector(step.targetSelector);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      // Wait for scroll to finish before measuring
      setTimeout(() => {
        const rect = el.getBoundingClientRect();
        setTargetRect(rect);
        setTooltipSide(step.tooltipPosition);
      }, 400);
    }
  }, []);

  // When step changes, focus the target
  useEffect(() => {
    if (isOpen) {
      focusTarget(currentStep);
    }
  }, [isOpen, currentStep, focusTarget]);

  // Find and focus target element (with retry for dynamic content)
  useEffect(() => {
    if (!isOpen) return;

    const step = STEPS[currentStep];
    if (!step) return;

    let cancelled = false;

    const tryFocus = (attempts = 0) => {
      if (cancelled) return;
      const el = document.querySelector(step.targetSelector);
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'center' });
        setTimeout(() => {
          if (!cancelled) {
            const rect = el.getBoundingClientRect();
            setTargetRect(rect);
            setTooltipSide(step.tooltipPosition);
          }
        }, 400);
      } else if (attempts < 8) {
        setTimeout(() => tryFocus(attempts + 1), 250);
      }
    };

    tryFocus();

    return () => { cancelled = true; };
  }, [isOpen, currentStep]);

  const goNext = useCallback(() => {
    if (currentStep < STEPS.length - 1) {
      setCurrentStep((s) => s + 1);
    } else {
      // Last step — complete tour
      setTourCompleted(true);
      setIsOpen(false);
    }
  }, [currentStep]);

  const goPrev = useCallback(() => {
    if (currentStep > 0) {
      setCurrentStep((s) => s - 1);
    }
  }, [currentStep]);

  const goToStep = useCallback((index: number) => {
    if (index >= 0 && index < STEPS.length) {
      setCurrentStep(index);
    }
  }, []);

  const skipTour = useCallback(() => {
    setTourCompleted(true);
    setIsOpen(false);
  }, []);

  // ─── Keyboard support ────────────────────────
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      switch (e.key) {
        case 'Escape':
          skipTour();
          break;
        case 'ArrowRight':
          e.preventDefault();
          goNext();
          break;
        case 'ArrowLeft':
          e.preventDefault();
          goPrev();
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, goNext, goPrev, skipTour]);


  const step = STEPS[currentStep];

  // Calculate tooltip position
  const getTooltipStyle = (): React.CSSProperties => {
    if (!targetRect) return { visibility: 'hidden' };

    const gap = 16;
    const windowW = window.innerWidth;
    const windowH = window.innerHeight;

    switch (tooltipSide) {
      case 'bottom':
        return {
          top: Math.min(targetRect.bottom + gap, windowH - 400),
          left: Math.max(16, Math.min(targetRect.left + targetRect.width / 2 - 160, windowW - 336)),
        };
      case 'top':
        return {
          top: Math.max(gap, targetRect.top - 400),
          left: Math.max(16, Math.min(targetRect.left + targetRect.width / 2 - 160, windowW - 336)),
        };
      case 'left':
        return {
          top: Math.max(gap, targetRect.top + targetRect.height / 2 - 150),
          left: Math.max(16, targetRect.left - 336),
        };
      case 'right':
        return {
          top: Math.max(gap, targetRect.top + targetRect.height / 2 - 150),
          left: Math.min(targetRect.right + gap, windowW - 336),
        };
      default:
        return {
          top: targetRect.bottom + gap,
          left: targetRect.left,
        };
    }
  };

  // If tour is not open, show a floating button for re-access
  if (!isOpen) {
    return (
      <FloatingTourButton onClick={() => { setTourCompleted(false); setCurrentStep(0); setIsOpen(true); }} />
    );
  }

  return (
    <div
      className="fixed inset-0 z-[60]"
      style={{ pointerEvents: 'none' }}
    >
      {/* SVG Spotlight Mask */}
      <svg className="absolute inset-0 w-full h-full" style={{ pointerEvents: 'auto' }}>
        <defs>
          <mask id="tour-spotlight">
            {/* Full white = fully visible overlay */}
            <rect width="100%" height="100%" fill="white" />
            {/* Black = transparent (cutout) */}
            {targetRect && (
              <rect
                x={targetRect.left - 8}
                y={targetRect.top - 8}
                width={targetRect.width + 16}
                height={targetRect.height + 16}
                rx={16}
                ry={16}
                fill="black"
                className="transition-all duration-500"
              />
            )}
          </mask>
        </defs>
        {/* Dark overlay with cutout */}
        <rect
          width="100%"
          height="100%"
          fill="rgba(0, 0, 0, 0.55)"
          mask="url(#tour-spotlight)"
          className="transition-all duration-300"
          onClick={goNext}
        />
      </svg>

      {/* Close button */}
      <button
        onClick={skipTour}
        className="fixed top-4 right-4 z-[70] p-2 rounded-xl bg-dark-800/80 border border-dark-600/50 text-dark-400 hover:text-white hover:bg-dark-700 transition-all backdrop-blur-sm"
        style={{ pointerEvents: 'auto' }}
        title="Fechar tour"
      >
        <X className="w-5 h-5" />
      </button>

      {/* Step counter */}
      <div
        className="fixed top-4 left-1/2 -translate-x-1/2 z-[70] px-3 py-1.5 rounded-full bg-dark-800/80 border border-dark-600/50 backdrop-blur-sm text-xs text-dark-400"
        style={{ pointerEvents: 'auto' }}
      >
        <span className="font-medium text-zap-400">{currentStep + 1}</span>
        <span className="text-dark-500"> / {STEPS.length}</span>
      </div>

      {/* Target pulse ring */}
      {targetRect && (
        <div
          className="absolute z-[65] rounded-xl border-2 border-zap-500/60 animate-pulse"
          style={{
            pointerEvents: 'none',
            top: targetRect.top - 12,
            left: targetRect.left - 12,
            width: targetRect.width + 24,
            height: targetRect.height + 24,
          }}
        />
      )}

      {/* Tooltip */}
      {step && targetRect && (
        <div
          className="fixed z-[70]"
          style={{ ...getTooltipStyle(), pointerEvents: 'auto' }}
        >
          <TourTooltip
            step={step}
            current={currentStep}
            total={STEPS.length}
            onPrev={goPrev}
            onNext={goNext}
            onSkip={skipTour}
            onGoTo={goToStep}
          />
        </div>
      )}
    </div>
  );
}

// ─── Floating Button ──────────────────────────────
function FloatingTourButton({ onClick }: { onClick: () => void }) {
  const [show, setShow] = useState(false);

  useEffect(() => {
    const completed = getTourCompleted();
    // Show a subtle hint after 30s on dashboard even if completed
    // But if not completed, show immediately
    if (!completed) {
      setShow(true);
      return;
    }
    const timer = setTimeout(() => setShow(true), 30000);
    return () => clearTimeout(timer);
  }, []);

  if (!show) return null;

  return (
    <button
      onClick={onClick}
      className="fixed bottom-6 right-6 z-50 flex items-center gap-2 px-4 py-3 rounded-2xl bg-gradient-to-r from-zap-500 to-brand-600 text-white font-semibold text-sm shadow-2xl shadow-zap-500/30 hover:shadow-zap-500/40 hover:scale-[1.02] active:scale-[0.98] transition-all duration-200 animate-fade-in"
    >
      <Zap className="w-4 h-4" />
      Tour pelo Dashboard
    </button>
  );
}
