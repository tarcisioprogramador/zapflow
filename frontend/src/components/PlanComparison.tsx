import { TrialStatus } from '../types';
import { Crown, Check, X, Zap, Users, GitBranch, Columns, MessageSquare, Bot, Globe, Send } from 'lucide-react';

interface PlanFeature {
  label: string;
  icon: React.ReactNode;
  free: string | boolean;
  starter: string | boolean;
  pro: string | boolean;
}

const FEATURES: PlanFeature[] = [
  { label: 'Números WhatsApp', icon: <MessageSquare className="w-4 h-4" />, free: '1', starter: '1', pro: '3' },
  { label: 'Atendentes', icon: <Users className="w-4 h-4" />, free: '1', starter: '5', pro: 'Ilimitado' },
  { label: 'CRM Boards', icon: <Columns className="w-4 h-4" />, free: '1', starter: '2', pro: '5' },
  { label: 'Flows Automáticos', icon: <GitBranch className="w-4 h-4" />, free: '3', starter: '10', pro: 'Ilimitado' },
  { label: 'Campanhas em Massa', icon: <Send className="w-4 h-4" />, free: '0', starter: '5', pro: 'Ilimitado' },
  { label: 'IA Megan (Auto Reply)', icon: <Bot className="w-4 h-4" />, free: false, starter: false, pro: true },
  { label: 'Integrações Webhook', icon: <Globe className="w-4 h-4" />, free: false, starter: false, pro: true },
];

interface PlanComparisonProps {
  trial?: TrialStatus | null;
  currentPlan?: string;
}

export default function PlanComparison({ trial, currentPlan }: PlanComparisonProps) {
  const isTrialActive = trial?.isActive && !trial?.isExpired;
  const daysLeft = trial?.daysRemaining ?? 0;

  return (
    <div className="glass-card overflow-hidden">
      {/* Header */}
      <div className="p-6 border-b border-dark-700/30">
        <div className="flex items-center gap-3 mb-2">
          <Crown className="w-6 h-6 text-zap-400" />
          <h3 className="text-lg font-heading font-bold text-white">Comparação de Planos</h3>
        </div>
        {isTrialActive && (
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-zap-500/10 border border-zap-500/20 text-sm">
            <Zap className="w-4 h-4 text-zap-400" />
            <span className="text-zap-400 font-medium">
              {daysLeft} {daysLeft === 1 ? 'dia' : 'dias'} restantes no teste grátis
            </span>
          </div>
        )}
        {trial?.isExpired && (
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-red-500/10 border border-red-500/20 text-sm">
            <span className="text-red-400 font-medium">Teste grátis expirado</span>
          </div>
        )}
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-dark-700/30">
              <th className="text-left py-4 px-6 text-sm font-medium text-dark-400 w-1/3">Recurso</th>
              <th className={`text-center py-4 px-4 text-sm font-bold ${currentPlan === 'FREE' || currentPlan === 'STARTER' ? 'text-zap-400' : 'text-dark-400'}`}>
                <div className="flex flex-col items-center gap-1">
                  <span>Teste Grátis</span>
                  <span className="text-[10px] text-dark-500 font-normal">FREE / STARTER</span>
                </div>
              </th>
              <th className={`text-center py-4 px-4 text-sm font-bold ${currentPlan === 'PRO' ? 'text-zap-400' : 'text-dark-400'}`}>
                <div className="flex flex-col items-center gap-1">
                  <div className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-zap-500/10">
                    <Crown className="w-3 h-3 text-zap-400" />
                    <span>IA Pro</span>
                  </div>
                  <span className="text-[10px] text-dark-500 font-normal">R$ 197/mês</span>
                </div>
              </th>
            </tr>
          </thead>
          <tbody>
            {FEATURES.map((feature, index) => {
              // Determina se o recurso está disponível (lida com string e boolean)
              const freeVal = feature.free;
              const proVal = feature.pro;
              const isFreeAvailable = typeof freeVal === 'boolean' ? freeVal : freeVal !== '0';
              const isProAvailable = typeof proVal === 'boolean' ? proVal : true;

              return (
                <tr key={feature.label} className={`border-b border-dark-800/50 hover:bg-dark-800/20 transition-colors ${index % 2 === 0 ? 'bg-dark-900/20' : ''}`}>
                  <td className="py-4 px-6">
                    <div className="flex items-center gap-3">
                      <span className="text-dark-500">{feature.icon}</span>
                      <span className="text-sm text-dark-200">{feature.label}</span>
                    </div>
                  </td>
                  {/* Free/Starter column */}
                  <td className="text-center py-4 px-4">
                    <div className="flex items-center justify-center gap-1.5">
                      {isFreeAvailable ? (
                        typeof freeVal === 'boolean'
                          ? <Check className="w-4 h-4 text-green-400" />
                          : <span className="text-sm text-dark-300 font-medium">{freeVal}</span>
                      ) : (
                        <X className="w-4 h-4 text-red-400/60" />
                      )}
                    </div>
                  </td>
                  {/* Pro column */}
                  <td className="text-center py-4 px-4">
                    <div className="flex items-center justify-center gap-1.5">
                      {isProAvailable ? (
                        typeof proVal === 'boolean'
                          ? <Check className="w-4 h-4 text-green-400" />
                          : <span className="text-sm text-white font-medium">{proVal}</span>
                      ) : (
                        <span className="text-sm text-dark-500">—</span>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Footer */}
      <div className="p-4 border-t border-dark-700/30 bg-dark-900/30">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-xs text-dark-400">
            <Check className="w-3.5 h-3.5 text-zap-400" />
            {isTrialActive
              ? `Durante o teste grátis você tem acesso aos recursos do plano IA Starter`
              : trial?.isExpired
                ? 'Seu teste expirou. Faça upgrade para continuar usando.'
                : 'Compare os planos e escolha o ideal para você'}
          </div>
        </div>
      </div>
    </div>
  );
}
