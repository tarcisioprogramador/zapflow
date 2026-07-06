import { useEffect, useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { X, ChevronLeft, ChevronRight, SkipForward } from 'lucide-react';
import { syncTourToBackend, syncTourFromBackend } from '../utils/tourSync';

// ─── Steps ────────────────────────────────────────
interface TourStep {
  targetSelector: string;
  title: string;
  description: string;
  tooltipPosition: 'top' | 'bottom' | 'left' | 'right';
  action?: { label: string; link: string };
}

const STEPS: TourStep[] = [
  {
    targetSelector: '[data-tour="ob-welcome"]',
    title: '👋 Boas-vindas ao ZapFlow!',
    description: 'Complete os 3 passos abaixo para ativar WhatsApp, pagamentos e IA. Leva menos de 5 minutos!',
    tooltipPosition: 'bottom',
  },
  {
    targetSelector: '[data-tour="ob-whatsapp"]',
    title: '📱 Conectar WhatsApp',
    description: 'Conecte seu número de WhatsApp para começar a atender clientes, enviar campanhas e automatizar respostas com IA.',
    tooltipPosition: 'top',
  },
  {
    targetSelector: '[data-tour="ob-payments"]',
    title: '💳 Configurar Pagamentos',
    description: 'Ative PIX, cartão de crédito e boleto com Mercado Pago. Seus clientes poderão pagar de forma rápida e segura.',
    tooltipPosition: 'top',
  },
  {
    targetSelector: '[data-tour="ob-ai"]',
    title: '🤖 Treinar IA Megan',
    description: 'Alimente a base de conhecimento da Megan com informações do seu negócio. Ela vai atender clientes 24h com inteligência.',
    tooltipPosition: 'top',
  },
  {
    targetSelector: '[data-tour="ob-actions"]',
    title: '🎯 Acompanhe o Progresso',
    description: 'Use "Verificar novamente" para atualizar o status. Pule e configure depois se preferir — você terá 7 dias de teste grátis!',
    tooltipPosition: 'top',
  },
  {
    targetSelector: '[data-tour="ob-dashboard"]',
    title: '🚀 Explorar o Dashboard',
    description: 'Pronto para começar? Vá para o Dashboard e veja suas métricas, gráficos e muito mais. O ZapFlow está pronto para ajudar!',
    tooltipPosition: 'bottom',
    action: { label: 'Ir para o Dashboard', link: '/' },
  },
];

const STORAGE_KEY = 'zapflow-onboarding-tour-completed';

function getTourCompleted(): boolean {
  try { return localStorage.getItem(STORAGE_KEY) === 'true'; }
  catch { return false; }
}
function setTourCompleted(value: boolean) {
  try { localStorage.setItem(STORAGE_KEY, value ? 'true' : 'false'); }
  catch { /* ignore */ }
  if (value) {
    syncTourToBackend({ onboarding: true });
  }
}

// ─── Tooltip ──────────────────────────────────────
function TourTooltip({
  step, current, total, onPrev, onNext, onSkip, onGoTo,
}: {
  step: TourStep; current: number; total: number;
  onPrev: () => void; onNext: () => void; onSkip: () => void;
  onGoTo: (i: number) => void;
}) {
  const isFirst = current === 0;
  const isLast = current === total - 1;
  return (
    <div className="bg-dark-800 border border-dark-600/60 rounded-2xl shadow-2xl shadow-black/40 p-5 w-80 animate-fade-in">
      <h3 className="text-base font-heading font-bold text-white mb-2">{step.title}</h3>
      <p className="text-sm text-dark-300 leading-relaxed mb-4">{step.description}</p>
      <div className="flex items-center gap-1.5 mb-4">
        {Array.from({ length: total }).map((_, i) => (
          <button key={i} onClick={() => onGoTo(i)}
            className={`h-1.5 rounded-full transition-all duration-300 ${
              i === current ? 'w-6 bg-zap-500' : 'w-1.5 bg-dark-600 hover:bg-dark-500'
            }`} />
        ))}
      </div>
      <div className="flex items-center justify-between">
        <div className="flex gap-2">
          {!isFirst && (
            <button onClick={onPrev}
              className="flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-dark-300 hover:text-white bg-dark-700/50 hover:bg-dark-700 rounded-lg transition-all">
              <ChevronLeft className="w-3.5 h-3.5" /> Voltar
            </button>
          )}
        </div>
        <div className="flex items-center gap-2">
          <button onClick={onSkip}
            className="flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-dark-400 hover:text-dark-200 transition-colors">
            <SkipForward className="w-3.5 h-3.5" /> Pular
          </button>
          {isLast && step.action ? (
            <Link to={step.action.link} onClick={onSkip}
              className="flex items-center gap-1.5 px-4 py-1.5 text-xs font-bold text-white bg-zap-500 hover:bg-zap-600 rounded-lg transition-all shadow-lg shadow-zap-500/20">
              {step.action.label} <ChevronRight className="w-3.5 h-3.5" />
            </Link>
          ) : (
            <button onClick={onNext}
              className="flex items-center gap-1 px-4 py-1.5 text-xs font-bold text-white bg-zap-500 hover:bg-zap-600 rounded-lg transition-all shadow-lg shadow-zap-500/20">
              {isFirst ? 'Começar' : 'Próximo'} <ChevronRight className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════
// ─── Onboarding Tour ──────────────────────────────
// ═══════════════════════════════════════════════════
export default function OnboardingTour({ onComplete }: { onComplete?: () => void }) {
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
        }, 600);
      }
    });
    return () => { cancelled = true; };
  }, []);

  // Try to focus the target element
  const tryFocus = useCallback((stepIdx: number) => {
    const step = STEPS[stepIdx];
    if (!step) return;
    let cancelled = false;

    const attempt = (tries = 0) => {
      if (cancelled) return;
      const el = document.querySelector(step.targetSelector);
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'center' });
        setTimeout(() => {
          if (!cancelled) {
            setTargetRect(el.getBoundingClientRect());
            setTooltipSide(step.tooltipPosition);
          }
        }, 400);
      } else if (tries < 8) {
        setTimeout(() => attempt(tries + 1), 250);
      }
    };
    attempt();
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    if (isOpen) {
      const cancel = tryFocus(currentStep);
      return cancel;
    }
  }, [isOpen, currentStep, tryFocus]);

  const goNext = useCallback(() => {
    if (currentStep < STEPS.length - 1) setCurrentStep((s) => s + 1);
    else { setTourCompleted(true); setIsOpen(false); onComplete?.(); }
  }, [currentStep, onComplete]);

  const goPrev = useCallback(() => {
    if (currentStep > 0) setCurrentStep((s) => s - 1);
  }, [currentStep]);

  const goToStep = useCallback((i: number) => {
    if (i >= 0 && i < STEPS.length) setCurrentStep(i);
  }, []);

  const skipTour = useCallback(() => {
    setTourCompleted(true); setIsOpen(false); onComplete?.();
  }, [onComplete]);

  // Keyboard
  useEffect(() => {
    if (!isOpen) return;
    const handler = (e: KeyboardEvent) => {
      switch (e.key) {
        case 'Escape': skipTour(); break;
        case 'ArrowRight': e.preventDefault(); goNext(); break;
        case 'ArrowLeft': e.preventDefault(); goPrev(); break;
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [isOpen, goNext, goPrev, skipTour]);

  const step = STEPS[currentStep];

  const getTooltipStyle = (): React.CSSProperties => {
    if (!targetRect) return { visibility: 'hidden' };
    const gap = 16, ww = window.innerWidth, wh = window.innerHeight;
    switch (tooltipSide) {
      case 'bottom':
        return { top: Math.min(targetRect.bottom + gap, wh - 400), left: Math.max(16, Math.min(targetRect.left + targetRect.width / 2 - 160, ww - 336)) };
      case 'top':
        return { top: Math.max(gap, targetRect.top - 400), left: Math.max(16, Math.min(targetRect.left + targetRect.width / 2 - 160, ww - 336)) };
      case 'left':
        return { top: Math.max(gap, targetRect.top + targetRect.height / 2 - 150), left: Math.max(16, targetRect.left - 336) };
      case 'right':
        return { top: Math.max(gap, targetRect.top + targetRect.height / 2 - 150), left: Math.min(targetRect.right + gap, ww - 336) };
      default: return { top: targetRect.bottom + gap, left: targetRect.left };
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[60]" style={{ pointerEvents: 'none' }}>
      {/* Spotlight */}
      <svg className="absolute inset-0 w-full h-full" style={{ pointerEvents: 'auto' }}>
        <defs>
          <mask id="ob-spotlight">
            <rect width="100%" height="100%" fill="white" />
            {targetRect && (
              <rect x={targetRect.left - 8} y={targetRect.top - 8}
                width={targetRect.width + 16} height={targetRect.height + 16}
                rx={16} ry={16} fill="black" className="transition-all duration-500" />
            )}
          </mask>
        </defs>
        <rect width="100%" height="100%" fill="rgba(0,0,0,0.55)" mask="url(#ob-spotlight)"
          className="transition-all duration-300" onClick={goNext} />
      </svg>

      {/* Close */}
      <button onClick={skipTour}
        className="fixed top-4 right-4 z-[70] p-2 rounded-xl bg-dark-800/80 border border-dark-600/50 text-dark-400 hover:text-white hover:bg-dark-700 transition-all backdrop-blur-sm"
        style={{ pointerEvents: 'auto' }} title="Fechar tour">
        <X className="w-5 h-5" />
      </button>

      {/* Counter */}
      <div className="fixed top-4 left-1/2 -translate-x-1/2 z-[70] px-3 py-1.5 rounded-full bg-dark-800/80 border border-dark-600/50 backdrop-blur-sm text-xs text-dark-400"
        style={{ pointerEvents: 'auto' }}>
        <span className="font-medium text-zap-400">{currentStep + 1}</span>
        <span className="text-dark-500"> / {STEPS.length}</span>
      </div>

      {/* Pulse ring */}
      {targetRect && (
        <div className="absolute z-[65] rounded-xl border-2 border-zap-500/60 animate-pulse"
          style={{ pointerEvents: 'none', top: targetRect.top - 12, left: targetRect.left - 12,
            width: targetRect.width + 24, height: targetRect.height + 24 }} />
      )}

      {/* Tooltip */}
      {step && targetRect && (
        <div className="fixed z-[70]" style={{ ...getTooltipStyle(), pointerEvents: 'auto' }}>
          <TourTooltip step={step} current={currentStep} total={STEPS.length}
            onPrev={goPrev} onNext={goNext} onSkip={skipTour} onGoTo={goToStep} />
        </div>
      )}
    </div>
  );
}
