import { useEffect, useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { whatsappApi, paymentsApi, knowledgeBaseApi, flowsApi } from '../api';
import { useAuthStore } from '../store';
import {
  Zap, MessageSquare, CreditCard, Bot, CheckCircle2, Loader2, ArrowRight,
  Sparkles, ChevronRight,
} from 'lucide-react';
import OnboardingTour from '../components/OnboardingTour';

interface OnboardingItem {
  id: 'whatsapp' | 'payments' | 'ai';
  icon: React.ElementType;
  title: string;
  description: string;
  actionLabel: string;
  actionLink: string;
  completed: boolean;
  loading: boolean;
}

export default function OnboardingPage() {
  const user = useAuthStore((s) => s.user);
  const [tourComplete, setTourComplete] = useState(false);
  const [items, setItems] = useState<OnboardingItem[]>([
    { id: 'whatsapp', icon: MessageSquare, title: 'Conectar WhatsApp', description: 'Conecte seu número para começar a atender', actionLabel: 'Conectar Agora', actionLink: '/whatsapp', completed: false, loading: true },
    { id: 'payments', icon: CreditCard, title: 'Configurar Pagamentos', description: 'Ative PIX, cartão e boleto com Mercado Pago', actionLabel: 'Configurar', actionLink: '/settings', completed: false, loading: true },
    { id: 'ai', icon: Bot, title: 'Treinar IA Megan', description: 'Alimente a base de conhecimento da sua IA', actionLabel: 'Treinar IA', actionLink: '/knowledge-base', completed: false, loading: true },
  ]);
  const [overallLoading, setOverallLoading] = useState(true);
  const [showConfetti, setShowConfetti] = useState(false);

  const checkAll = useCallback(async () => {
    setOverallLoading(true);

    // Check WhatsApp
    try {
      const { data: numbers } = await whatsappApi.list();
      const hasConnected = Array.isArray(numbers) && numbers.some((n: any) => n.status === 'CONNECTED');
      setItems((prev) => prev.map((i) => i.id === 'whatsapp' ? { ...i, completed: hasConnected, loading: false } : i));
    } catch {
      setItems((prev) => prev.map((i) => i.id === 'whatsapp' ? { ...i, completed: false, loading: false } : i));
    }

    // Check Mercado Pago
    try {
      const { data: mpStatus } = await paymentsApi.getStatus();
      setItems((prev) => prev.map((i) => i.id === 'payments' ? { ...i, completed: mpStatus?.configured ?? false, loading: false } : i));
    } catch {
      setItems((prev) => prev.map((i) => i.id === 'payments' ? { ...i, completed: false, loading: false } : i));
    }

    // Check AI / Knowledge Base
    try {
      const { data: kbStats } = await knowledgeBaseApi.getStats();
      const hasItems = kbStats?.totalItems > 0 || kbStats?.total > 0;
      setItems((prev) => prev.map((i) => i.id === 'ai' ? { ...i, completed: !!hasItems, loading: false } : i));
    } catch {
      // If KB fails, check if there are any flows as alternative
      try {
        const { data: flows } = await flowsApi.list();
        const hasFlows = Array.isArray(flows) && flows.length > 0;
        setItems((prev) => prev.map((i) => i.id === 'ai' ? { ...i, completed: hasFlows, loading: false } : i));
      } catch {
        setItems((prev) => prev.map((i) => i.id === 'ai' ? { ...i, completed: false, loading: false } : i));
      }
    }

    setOverallLoading(false);
  }, []);

  useEffect(() => {
    checkAll();
  }, [checkAll]);

  const completedCount = items.filter((i) => i.completed).length;
  const totalCount = items.length;
  const progress = Math.round((completedCount / totalCount) * 100);
  const allComplete = completedCount === totalCount;

  useEffect(() => {
    if (allComplete && !overallLoading) {
      setShowConfetti(true);
      const timer = setTimeout(() => setShowConfetti(false), 4000);
      return () => clearTimeout(timer);
    }
  }, [allComplete, overallLoading]);

  return (
    <div className="min-h-screen bg-dark-950 flex flex-col">
      {/* Confetti */}
      {showConfetti && (
        <div className="fixed inset-0 pointer-events-none z-50 overflow-hidden">
          {Array.from({ length: 30 }).map((_, i) => (
            <div
              key={i}
              className="absolute w-2 h-2 rounded-full"
              style={{
                left: `${Math.random() * 100}%`,
                top: '-10px',
                backgroundColor: ['#25D366', '#6366f1', '#f59e0b', '#ef4444', '#8b5cf6'][i % 5],
                animationName: 'float',
                animationDelay: `${Math.random() * 2}s`,
                animationDuration: `${2 + Math.random() * 3}s`,
                width: `${4 + Math.random() * 8}px`,
                height: `${4 + Math.random() * 8}px`,
              }}
            />
          ))}
        </div>
      )}

      {/* Onboarding Tour (only on first visit) */}
      {!tourComplete && <OnboardingTour onComplete={() => setTourComplete(true)} />}

      {/* Top Bar */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-dark-700/30" data-tour="ob-dashboard">
        <Link to="/" className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-zap-500 to-brand-600 flex items-center justify-center shadow-lg shadow-zap-500/20">
            <Zap className="w-5 h-5 text-white" />
          </div>
          <span className="text-lg font-heading font-bold text-white">
            Zap<span className="text-zap-400">Flow</span>
          </span>
        </Link>
        <div className="flex items-center gap-4">
          <Link
            to="/"
            className="text-sm text-dark-400 hover:text-white transition-colors"
          >
            Ir para o Dashboard
          </Link>
          <span className="text-xs text-dark-500">
            {user?.name || 'Usuário'}
          </span>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex items-center justify-center p-6">
        <div className="w-full max-w-2xl animate-fade-in">
          {/* Welcome */}
          <div className="text-center mb-10">
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-zap-500/10 border border-zap-500/20 mb-4" data-tour="ob-welcome">
              <Sparkles className="w-4 h-4 text-zap-400" />
              <span className="text-xs font-semibold text-zap-400">SETUP RÁPIDO</span>
            </div>
            <h1 className="text-3xl md:text-4xl font-heading font-bold text-white mb-3" data-tour="ob-welcome">
              {allComplete
                ? '🎉 Tudo pronto!'
                : 'Vamos configurar seu ZapFlow'}
            </h1>
            <p className="text-dark-400 max-w-lg mx-auto">
              {allComplete
                ? 'Sua conta está completa e pronta para vender. Hora de ver o dashboard!'
                : 'Complete os passos abaixo para ativar todos os recursos. Leva menos de 5 minutos.'}
            </p>
          </div>

          {/* Progress Bar */}
          {!allComplete && (
            <div className="mb-8" data-tour="ob-progress">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-dark-400">Progresso</span>
                <span className="text-sm font-bold text-zap-400">{completedCount}/{totalCount}</span>
              </div>
              <div className="w-full h-2.5 bg-dark-700 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-zap-500 to-brand-500 rounded-full transition-all duration-700 ease-out"
                  style={{ width: `${progress}%` }}
                />
              </div>
            </div>
          )}

          {/* All Done Banner */}
          {allComplete && (
            <div className="mb-8 p-6 rounded-2xl bg-emerald-500/5 border-2 border-emerald-500/20 text-center">
              <div className="w-16 h-16 rounded-full bg-emerald-500/10 flex items-center justify-center mx-auto mb-4">
                <CheckCircle2 className="w-8 h-8 text-emerald-400" />
              </div>
              <h2 className="text-xl font-heading font-bold text-white mb-2">
                Setup completo! 🚀
              </h2>
              <p className="text-sm text-dark-300 mb-6 max-w-md mx-auto">
                WhatsApp conectado, pagamentos configurados e IA pronta para atender.
                Você já pode começar a vender!
              </p>
              <Link
                to="/"
                className="inline-flex items-center gap-2 bg-zap-500 hover:bg-zap-600 text-white font-bold px-8 py-3.5 rounded-xl transition-all shadow-lg shadow-zap-500/20 active:scale-[0.98] btn-glow"
              >
                Ir para o Dashboard
                <ArrowRight className="w-5 h-5" />
              </Link>
            </div>
          )}

          {/* Checklist */}
          {!allComplete && (
            <div className="space-y-4">
              {items.map((item, index) => (
                <div
                  key={item.id}
                  data-tour={`ob-${item.id}`}
                  className={`glass-card p-6 transition-all duration-300 ${
                    item.completed
                      ? 'border-emerald-500/20 bg-emerald-500/3'
                      : 'hover:border-zap-500/30'
                  }`}
                >
                  <div className="flex items-start gap-4">
                    {/* Status Icon */}
                    <div className={`relative flex-shrink-0 w-12 h-12 rounded-xl flex items-center justify-center transition-all ${
                      item.loading
                        ? 'bg-dark-700/50 border border-dark-600'
                        : item.completed
                          ? 'bg-emerald-500/15 border-2 border-emerald-500/30'
                          : 'bg-zap-500/10 border border-zap-500/20'
                    }`}>
                      {item.loading ? (
                        <Loader2 className="w-5 h-5 text-dark-400 animate-spin" />
                      ) : item.completed ? (
                        <CheckCircle2 className="w-6 h-6 text-emerald-400" />
                      ) : (
                        <item.icon className="w-5 h-5 text-zap-400" />
                      )}
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-sm font-semibold text-white">{item.title}</span>
                        {item.completed && (
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                            CONCLUÍDO
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-dark-400 mt-1">{item.description}</p>

                      {/* Action Button */}
                      {!item.completed && (
                        <Link
                          to={item.actionLink}
                          className="inline-flex items-center gap-1.5 mt-3 text-xs font-medium px-4 py-2 rounded-lg bg-zap-500/10 text-zap-400 border border-zap-500/20 hover:bg-zap-500/20 transition-all"
                        >
                          <item.icon className="w-3.5 h-3.5" />
                          {item.actionLabel}
                          <ChevronRight className="w-3.5 h-3.5" />
                        </Link>
                      )}
                    </div>

                    {/* Step Number */}
                    <div className="flex-shrink-0 w-7 h-7 rounded-full bg-dark-700/50 border border-dark-600 flex items-center justify-center">
                      <span className="text-[10px] font-bold text-dark-400">{index + 1}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Bottom Actions */}
          {!allComplete && (
            <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-4" data-tour="ob-actions">
              <button
                onClick={checkAll}
                disabled={overallLoading}
                className="inline-flex items-center gap-2 text-sm text-dark-400 hover:text-white transition-colors"
              >
                {overallLoading ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <CheckCircle2 className="w-4 h-4" />
                )}
                Verificar novamente
              </button>
              <Link
                to="/"
                className="text-sm text-dark-500 hover:text-dark-300 transition-colors"
              >
                Pular, vou configurar depois →
              </Link>
            </div>
          )}

          {/* Trial Info */}
          <div className="mt-8 p-4 rounded-xl bg-gradient-to-r from-zap-500/5 to-brand-500/5 border border-zap-500/10 text-center">
            <p className="text-xs text-dark-400">
              🎁 Você tem <strong className="text-zap-400">7 dias de teste grátis</strong> para explorar todos os recursos.
              Sem compromisso, cancele quando quiser.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
