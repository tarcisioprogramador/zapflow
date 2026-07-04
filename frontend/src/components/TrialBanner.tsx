import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { authApi } from '../api';
import { TrialStatus } from '../types';
import { Clock, Zap, AlertTriangle, X, ArrowRight, Crown } from 'lucide-react';

export default function TrialBanner() {
  const [trial, setTrial] = useState<TrialStatus | null>(null);
  const [dismissed, setDismissed] = useState(false);
  const [loading, setLoading] = useState(true);

  const loadTrial = useCallback(async () => {
    try {
      const { data } = await authApi.trial();
      setTrial(data);
    } catch {
      setTrial(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadTrial();
    // Refresh every 5 minutes to keep countdown accurate
    const interval = setInterval(loadTrial, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, [loadTrial]);

  // Don't show for paid plans or if dismissed or still loading
  if (loading || !trial || dismissed) return null;

  // Paid plans — no banner needed
  if (trial.plan === 'PRO' || trial.plan === 'ENTERPRISE') return null;

  // Trial expired — blocking banner
  if (trial.isExpired) {
    return (
      <div className="bg-gradient-to-r from-red-600/20 to-orange-600/20 border-b border-red-500/20 animate-fade-in">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-8 h-8 rounded-lg bg-red-500/20 flex items-center justify-center flex-shrink-0">
              <AlertTriangle className="w-4 h-4 text-red-400" />
            </div>
            <div className="min-w-0">
              <p className="text-sm font-medium text-white truncate">
                Seu período de teste gratuito expirou
              </p>
              <p className="text-xs text-red-300/80">
                Faça upgrade para continuar usando todos os recursos
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3 flex-shrink-0">
            <Link
              to="/settings"
              className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-lg bg-red-500 hover:bg-red-600 text-white text-sm font-medium transition-all duration-200 shadow-lg shadow-red-500/20"
            >
              <Crown className="w-4 h-4" />
              Fazer Upgrade
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
            <button
              onClick={() => setDismissed(true)}
              className="p-1.5 rounded-lg hover:bg-white/5 text-red-300 hover:text-white transition-colors"
              aria-label="Fechar"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Active trial — countdown banner
  if (trial.isActive && trial.daysRemaining > 0) {
    const isUrgent = trial.daysRemaining <= 2;
    const bgColor = isUrgent
      ? 'bg-gradient-to-r from-yellow-600/20 to-orange-600/20 border-b border-yellow-500/20'
      : 'bg-gradient-to-r from-zap-600/10 to-brand-600/10 border-b border-zap-500/10';

    return (
      <div className={`${bgColor} animate-fade-in`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-2.5 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0">
            <div className={`w-8 h-8 rounded-lg ${isUrgent ? 'bg-yellow-500/20' : 'bg-zap-500/20'} flex items-center justify-center flex-shrink-0`}>
              {isUrgent ? (
                <Clock className="w-4 h-4 text-yellow-400" />
              ) : (
                <Zap className="w-4 h-4 text-zap-400" />
              )}
            </div>
            <div className="min-w-0">
              <p className="text-sm font-medium text-white truncate">
                {isUrgent
                  ? `⚠️ Apenas ${trial.daysRemaining} ${trial.daysRemaining === 1 ? 'dia' : 'dias'} restantes no teste grátis`
                  : `🎉 Você tem ${trial.daysRemaining} dias de teste grátis`}
              </p>
              <p className="text-xs text-dark-400 truncate">
                {isUrgent
                  ? 'Faça upgrade para não perder o acesso aos recursos'
                  : 'Aproveite todos os recursos sem compromisso'}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            <Link
              to="/settings"
              className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-sm font-medium transition-all duration-200 ${
                isUrgent
                  ? 'bg-yellow-500 hover:bg-yellow-600 text-white shadow-lg shadow-yellow-500/20'
                  : 'bg-white/10 hover:bg-white/15 text-white'
              }`}
            >
              <Crown className="w-3.5 h-3.5" />
              Ver Planos
            </Link>
            <button
              onClick={() => setDismissed(true)}
              className="p-1.5 rounded-lg hover:bg-white/5 text-dark-500 hover:text-dark-300 transition-colors"
              aria-label="Fechar"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    );
  }

  return null;
}
