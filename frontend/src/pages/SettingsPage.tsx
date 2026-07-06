import { useEffect, useState, useCallback } from 'react';
import { useAuthStore } from '../store';
import { webhooksApi, usersApi, paymentsApi, authApi } from '../api';
import { Webhook, TrialStatus, PaymentRecord, SubscriptionInfo } from '../types';
import PlanComparison from '../components/PlanComparison';
import MpSetupGuide from '../components/MpSetupGuide';
import {
  User, Users, Webhook as WebhookIcon, Key, CreditCard, Bell, Shield, Globe, Plus, Trash2, Send,
  ExternalLink, Copy, Check, Zap, Loader2, AlertCircle, CheckCircle2, Receipt, Calendar, ArrowRight, Clock,
  ExternalLink as ExternalLinkIcon,
} from 'lucide-react';
import toast from 'react-hot-toast';

const tabs = [
  { id: 'profile', label: 'Perfil', icon: User },
  { id: 'team', label: 'Equipe', icon: Users },
  { id: 'webhooks', label: 'Webhooks', icon: WebhookIcon },
  { id: 'api', label: 'API', icon: Key },
  { id: 'plan', label: 'Plano', icon: CreditCard },
];

function CouponInput({ onCouponValidated, planId }: { onCouponValidated: (coupon: { code: string; discountType: string; discountValue: number; discountAmount: number; finalAmount: number } | null) => void; planId: string }) {
  const [code, setCode] = useState('');
  const [validating, setValidating] = useState(false);
  const [result, setResult] = useState<{ valid: boolean; reason?: string; discountAmount?: number; finalAmount?: number; discountType?: string; discountValue?: number } | null>(null);

  const handleValidate = async () => {
    if (!code.trim()) return;
    setValidating(true);
    setResult(null);
    try {
      const { data } = await paymentsApi.validateCoupon({ code: code.trim(), plan: planId });
      setResult(data);
      if (data.valid) {
        onCouponValidated({ code: code.trim(), discountType: data.coupon?.discountType, discountValue: data.coupon?.discountValue, discountAmount: data.discountAmount, finalAmount: data.finalAmount });
      } else {
        onCouponValidated(null);
      }
    } catch {
      setResult({ valid: false, reason: 'Erro ao validar cupom' });
      onCouponValidated(null);
    } finally {
      setValidating(false);
    }
  };

  return (
    <div className="flex items-center gap-2">
      <input
        type="text"
        value={code}
        onChange={(e) => { setCode(e.target.value.toUpperCase()); setResult(null); }}
        placeholder="CUPOM"
        className="input-field w-28 text-xs font-mono uppercase"
        maxLength={20}
      />
      <button
        onClick={handleValidate}
        disabled={validating || !code.trim()}
        className="btn-ghost text-xs disabled:opacity-40"
      >
        {validating ? <Loader2 className="w-3 h-3 animate-spin" /> : 'Aplicar'}
      </button>
      {result && (
        <span className={`text-[10px] ${result.valid ? 'text-emerald-400' : 'text-red-400'}`}>
          {result.valid
            ? `-${result.discountType === 'percentage' ? `${result.discountValue}%` : `R$ ${((result.discountAmount || 0) / 100).toFixed(0).replace('.', ',')}`}`
            : result.reason}
        </span>
      )}
    </div>
  );
}

function OneTimePixButton({ planId, planName, price }: { planId: string; planName: string; price: string }) {
  const [loading, setLoading] = useState(false);
  const [coupon, setCoupon] = useState<{ code: string } | null>(null);

  const handlePay = async () => {
    setLoading(true);
    try {
      const { data } = await paymentsApi.createOneTimePix({ plan: planId, couponCode: coupon?.code });
      if (data.url) {
        window.location.href = data.url;
      }
    } catch (err: any) {
      const msg = err.response?.data?.error || 'Erro ao criar pagamento PIX';
      alert(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-wrap items-center gap-2">
      <button
        onClick={handlePay}
        disabled={loading}
        className="inline-flex items-center gap-2 bg-emerald-500 hover:bg-emerald-600 text-white font-semibold px-5 py-2.5 rounded-lg transition-all shadow-lg shadow-emerald-500/20 active:scale-[0.98] disabled:opacity-70"
      >
        {loading ? (
          <Loader2 className="w-4 h-4 animate-spin" />
        ) : (
          <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 0C5.383 0 0 5.383 0 12s5.383 12 12 12 12-5.383 12-12S18.617 0 12 0zm-1.004 16.125l-3.234-3.234 1.145-1.145 2.089 2.089 4.357-4.357 1.145 1.145-5.502 5.502z"/>
          </svg>
        )}
        {planName} — {price}
      </button>
      <CouponInput onCouponValidated={(c) => setCoupon(c)} planId={planId} />
    </div>
  );
}

function PlanCard({ plan }: { plan: { id: string; name: string; price: string; period: string; features: string[]; current: boolean; popular: boolean } }) {
  const [loading, setLoading] = useState(false);
  const [coupon, setCoupon] = useState<{ code: string } | null>(null);

  const handleUpgrade = async () => {
    setLoading(true);
    try {
      const { data } = await paymentsApi.createCheckout({ plan: plan.id, couponCode: coupon?.code });
      if (data.url) {
        window.location.href = data.url;
      }
    } catch (err: any) {
      const msg = err.response?.data?.error || 'Erro ao iniciar checkout';
      alert(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={`glass-card p-6 relative ${plan.popular ? 'border-zap-500/50 shadow-lg shadow-zap-500/10' : ''} ${plan.current ? 'bg-zap-500/5' : ''}`}>
      {plan.popular && (
        <div className="absolute -top-3 left-1/2 -translate-x-1/2">
          <span className="bg-zap-500 text-white text-xs font-bold px-4 py-1 rounded-full">Mais Popular</span>
        </div>
      )}
      <h4 className="text-xl font-heading font-bold text-white mb-1">{plan.name}</h4>
      <div className="flex items-baseline gap-1 mt-2 mb-4">
        <span className="text-sm text-dark-400">R$</span>
        <span className="text-4xl font-heading font-bold text-white">{plan.price}</span>
        <span className="text-sm text-dark-400">{plan.period}</span>
      </div>
      <ul className="space-y-2 mb-6">
        {plan.features.map((f) => (
          <li key={f} className="flex items-center gap-2 text-sm text-dark-300">
            <Zap className="w-3.5 h-3.5 text-zap-400 flex-shrink-0" /> {f}
          </li>
        ))}
      </ul>
      <div className="space-y-2">
        <CouponInput onCouponValidated={(c) => setCoupon(c)} planId={plan.id} />
        <button
          onClick={plan.current ? undefined : handleUpgrade}
          disabled={loading}
          className={`w-full flex items-center justify-center gap-2 font-semibold px-5 py-3 rounded-lg transition-all ${
            plan.current
              ? 'bg-dark-700 text-white border border-dark-600 cursor-default'
              : plan.popular
                ? 'bg-zap-500 hover:bg-zap-600 text-white shadow-lg shadow-zap-500/20 active:scale-[0.98]'
                : 'bg-dark-800 hover:bg-dark-700 text-white border border-dark-600 active:scale-[0.98]'
          }`}
        >
          {loading ? (
            <Loader2 className="w-5 h-5 animate-spin" />
          ) : plan.current ? (
            'Plano Atual'
          ) : (
            'Fazer Upgrade'
          )}
        </button>
      </div>
    </div>
  );
}

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState('profile');
  const user = useAuthStore((s) => s.user);
  const [trial, setTrial] = useState<TrialStatus | null>(null);
  const [profileForm, setProfileForm] = useState({ name: user?.name || '', email: user?.email || '' });
  const [webhooks, setWebhooks] = useState<Webhook[]>([]);
  const [teamMembers, setTeamMembers] = useState<any[]>([]);
  const [newWebhook, setNewWebhook] = useState({ name: '', url: '', events: ['message.received'] });
  const [showWebhookModal, setShowWebhookModal] = useState(false);

  // Subscription & payment history
  const [subscription, setSubscription] = useState<SubscriptionInfo | null>(null);
  const [loadingSubscription, setLoadingSubscription] = useState(false);
  const [payments, setPayments] = useState<PaymentRecord[]>([]);
  const [loadingPayments, setLoadingPayments] = useState(false);
  const [paymentsPage, setPaymentsPage] = useState(1);
  const [paymentsTotal, setPaymentsTotal] = useState(0);
  const [portalLoading, setPortalLoading] = useState(false);
  const [cancelLoading, setCancelLoading] = useState(false);
  const [showCancelConfirm, setShowCancelConfirm] = useState(false);

  const loadTrial = useCallback(async () => {
    try {
      const { data } = await authApi.trial();
      setTrial(data);
    } catch { /* ignore */ }
  }, []);

  // Load subscription info
  const loadSubscription = useCallback(async () => {
    setLoadingSubscription(true);
    try {
      const { data } = await paymentsApi.getSubscription();
      setSubscription(data);
    } catch {
      setSubscription(null);
    } finally {
      setLoadingSubscription(false);
    }
  }, []);

  // Load payment history
  const loadPayments = useCallback(async (page = 1) => {
    setLoadingPayments(true);
    try {
      const { data } = await paymentsApi.getHistory({ page, limit: 10 });
      setPayments(data.payments || []);
      setPaymentsTotal(data.pagination?.total || 0);
      setPaymentsPage(data.pagination?.page || 1);
    } catch {
      setPayments([]);
    } finally {
      setLoadingPayments(false);
    }
  }, []);

  // Handle portal session
  const handleOpenPortal = async () => {
    setPortalLoading(true);
    try {
      const { data } = await paymentsApi.createPortal();
      if (data.url) {
        window.location.href = data.url;
      }
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Erro ao abrir portal');
    } finally {
      setPortalLoading(false);
    }
  };

  const handleCancelSubscription = async () => {
    setCancelLoading(true);
    try {
      await paymentsApi.cancelSubscription();
      toast.success('Assinatura cancelada com sucesso');
      setShowCancelConfirm(false);
      loadSubscription();
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Erro ao cancelar assinatura');
    } finally {
      setCancelLoading(false);
    }
  };

  // Load data when Plan tab opens
  useEffect(() => {
    if (activeTab === 'plan') {
      loadTrial();
      loadSubscription();
      loadPayments();
    }
  }, [activeTab, loadTrial, loadSubscription, loadPayments]);

  useEffect(() => {
    if (activeTab === 'webhooks') loadWebhooks();
    if (activeTab === 'team') loadTeam();
  }, [activeTab]);

  const loadWebhooks = async () => {
    try {
      const { data } = await webhooksApi.list();
      setWebhooks(data);
    } catch {
      setWebhooks([
        { id: '1', name: 'Notificação Slack', url: 'https://hooks.slack.com/...', events: ['message.received', 'conversation.opened'], isActive: true, createdAt: '2024-03-10' },
        { id: '2', name: 'CRM Externo', url: 'https://api.crm.com/webhook', events: ['lead.created', 'lead.moved'], isActive: true, createdAt: '2024-03-12' },
      ]);
    }
  };

  const loadTeam = async () => {
    try {
      const { data } = await usersApi.list();
      setTeamMembers(data);
    } catch {
      setTeamMembers([
        { id: '1', name: 'Admin', email: 'admin@zapflow.com', role: 'OWNER' },
        { id: '2', name: 'Atendente 1', email: 'atendente@zapflow.com', role: 'ATTENDANT' },
      ]);
    }
  };

  const handleCreateWebhook = async () => {
    try {
      const { data } = await webhooksApi.create(newWebhook);
      setWebhooks([...webhooks, data]);
      setShowWebhookModal(false);
      setNewWebhook({ name: '', url: '', events: ['message.received'] });
      toast.success('Webhook criado!');
    } catch { toast.error('Erro ao criar webhook'); }
  };

  const handleTestWebhook = async (id: string) => {
    try {
      await webhooksApi.test(id);
      toast.success('Teste enviado!');
    } catch { toast.error('Erro ao testar webhook'); }
  };

  const handleDeleteWebhook = async (id: string) => {
    if (!confirm('Excluir webhook?')) return;
    try {
      await webhooksApi.delete(id);
      setWebhooks(webhooks.filter((w) => w.id !== id));
      toast.success('Webhook excluído');
    } catch { toast.error('Erro ao excluir'); }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="page-header">
        <div>
          <h1 className="page-title">Configurações</h1>
          <p className="page-subtitle">Gerencie sua conta e integrações</p>
        </div>
      </div>

      <div className="flex gap-6">
        {/* Sidebar Tabs */}
        <div className="w-56 flex-shrink-0">
          <nav className="space-y-1">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`sidebar-item w-full ${activeTab === tab.id ? 'active' : ''}`}
              >
                <tab.icon className="w-4 h-4" />
                <span>{tab.label}</span>
              </button>
            ))}
          </nav>
        </div>

        {/* Content */}
        <div className="flex-1">
          {/* Profile */}
          {activeTab === 'profile' && (
            <div className="glass-card p-6 max-w-2xl">
              <h3 className="text-lg font-heading font-bold text-white mb-6">Perfil</h3>
              <div className="flex items-center gap-4 mb-6">
                <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-zap-500 to-brand-600 flex items-center justify-center text-2xl font-bold text-white">
                  {user?.name?.charAt(0)}
                </div>
                <div>
                  <p className="text-lg font-semibold text-white">{user?.name}</p>
                  <p className="text-sm text-dark-400">{user?.role} • Plano {user?.plan}</p>
                </div>
              </div>
              <div className="space-y-4">
                <div>
                  <label htmlFor="settings-name" className="block text-sm font-medium text-dark-300 mb-2">Nome</label>
                  <input id="settings-name" name="settings-name" value={profileForm.name} onChange={(e) => setProfileForm({ ...profileForm, name: e.target.value })} className="input-field w-full" />
                </div>
                <div>
                  <label htmlFor="settings-email" className="block text-sm font-medium text-dark-300 mb-2">Email</label>
                  <input id="settings-email" name="settings-email" value={profileForm.email} onChange={(e) => setProfileForm({ ...profileForm, email: e.target.value })} className="input-field w-full" />
                </div>
                <button className="btn-primary">Salvar Alterações</button>
              </div>
            </div>
          )}

          {/* Team */}
          {activeTab === 'team' && (
            <div className="glass-card p-6 max-w-3xl">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg font-heading font-bold text-white">Equipe</h3>
                <button className="btn-primary text-sm flex items-center gap-2">
                  <Plus className="w-4 h-4" /> Convidar Membro
                </button>
              </div>
              <div className="space-y-3">
                {teamMembers.map((member) => (
                  <div key={member.id} className="flex items-center justify-between p-4 rounded-xl bg-dark-800/50 border border-dark-700/30">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-gradient-to-br from-zap-500/20 to-brand-500/20 flex items-center justify-center text-sm font-bold text-zap-400">
                        {member.name.charAt(0)}
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-white">{member.name}</p>
                        <p className="text-xs text-dark-400">{member.email}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className={`badge ${member.role === 'OWNER' ? 'badge-green' : member.role === 'ADMIN' ? 'badge-blue' : 'badge-purple'}`}>
                        {member.role}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Webhooks (only ADMIN/OWNER can manage) */}
          {activeTab === 'webhooks' && (
            <div className="glass-card p-6 max-w-3xl">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg font-heading font-bold text-white">Webhooks</h3>
                {user?.role && ['OWNER', 'ADMIN'].includes(user.role) && (
                  <button onClick={() => setShowWebhookModal(true)} className="btn-primary text-sm flex items-center gap-2">
                    <Plus className="w-4 h-4" /> Novo Webhook
                  </button>
                )}
              </div>
              {!user?.role || !['OWNER', 'ADMIN'].includes(user.role) ? (
                <div className="p-4 rounded-xl bg-dark-800/50 border border-dark-700/30 text-center">
                  <Shield className="w-8 h-8 text-dark-500 mx-auto mb-2" />
                  <p className="text-sm text-dark-400">Apenas administradores podem gerenciar webhooks.</p>
                  <p className="text-xs text-dark-500 mt-1">Entre em contato com o administrador da sua conta.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {webhooks.map((wh) => (
                    <div key={wh.id} className="flex items-center justify-between p-4 rounded-xl bg-dark-800/50 border border-dark-700/30">
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <h4 className="text-sm font-semibold text-white">{wh.name}</h4>
                          <span className={`badge text-[10px] ${wh.isActive ? 'badge-green' : 'badge-red'}`}>
                            {wh.isActive ? 'Ativo' : 'Inativo'}
                          </span>
                        </div>
                        <p className="text-xs text-dark-400 font-mono mt-1 truncate">{wh.url}</p>
                        <div className="flex gap-1 mt-2">
                          {wh.events.map((ev) => (
                            <span key={ev} className="badge badge-blue text-[9px]">{ev}</span>
                          ))}
                        </div>
                      </div>
                      <div className="flex items-center gap-2 ml-4">
                        <button onClick={() => handleTestWebhook(wh.id)} className="btn-ghost text-xs">
                          <Send className="w-3.5 h-3.5" /> Testar
                        </button>
                        <button onClick={() => handleDeleteWebhook(wh.id)} className="btn-ghost text-dark-500 hover:text-red-400">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* API (only ADMIN/OWNER can view keys) */}
          {activeTab === 'api' && (
            <div className="glass-card p-6 max-w-3xl">
              {user?.role && ['OWNER', 'ADMIN'].includes(user.role) ? (
                <>
                  <h3 className="text-lg font-heading font-bold text-white mb-6">API Pública</h3>
                  <div className="space-y-4">
                    <div className="p-4 rounded-xl bg-dark-800/50 border border-dark-700/30">
                      <h4 className="text-sm font-semibold text-white mb-2">Base URL</h4>
                      <div className="flex items-center gap-2">
                        <code className="flex-1 text-sm font-mono text-zap-400 bg-dark-900/50 p-2 rounded-lg">
                          https://api.zapflow.com/v1
                        </code>
                        <button className="btn-ghost p-2"><Copy className="w-4 h-4" /></button>
                      </div>
                    </div>
                    <div className="p-4 rounded-xl bg-dark-800/50 border border-dark-700/30">
                      <h4 className="text-sm font-semibold text-white mb-2">API Key</h4>
                      <div className="flex items-center gap-2">
                        <code className="flex-1 text-sm font-mono text-dark-300 bg-dark-900/50 p-2 rounded-lg">
                          zf_live_sk_xxxxxxxxxxxxxxxxxxxxxxxx
                        </code>
                        <button className="btn-ghost p-2"><Copy className="w-4 h-4" /></button>
                      </div>
                    </div>
                    <div className="p-4 rounded-xl bg-dark-800/50 border border-dark-700/30">
                      <h4 className="text-sm font-semibold text-white mb-3">Endpoints Disponíveis</h4>
                      <div className="space-y-2">
                        {[
                          { method: 'GET', path: '/messages', desc: 'Listar mensagens' },
                          { method: 'POST', path: '/messages/send', desc: 'Enviar mensagem' },
                          { method: 'GET', path: '/contacts', desc: 'Listar contatos' },
                          { method: 'POST', path: '/contacts', desc: 'Criar contato' },
                          { method: 'GET', path: '/conversations', desc: 'Listar conversas' },
                          { method: 'POST', path: '/flows/:id/trigger', desc: 'Disparar fluxo' },
                        ].map((ep) => (
                          <div key={ep.path} className="flex items-center gap-3 p-2 rounded-lg hover:bg-dark-700/30">
                            <span className={`badge text-[10px] w-14 justify-center ${
                              ep.method === 'GET' ? 'badge-green' : 'badge-blue'
                            }`}>{ep.method}</span>
                            <code className="text-xs font-mono text-dark-200">{ep.path}</code>
                            <span className="text-xs text-dark-500 ml-auto">{ep.desc}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                    <a href="#" className="flex items-center gap-2 text-sm text-zap-400 hover:text-zap-300">
                      <ExternalLink className="w-4 h-4" /> Ver documentação completa da API
                    </a>
                  </div>
                </>
              ) : (
                <div className="text-center py-10">
                  <Key className="w-10 h-10 text-dark-500 mx-auto mb-3" />
                  <p className="text-sm text-dark-400">Apenas administradores podem acessar as chaves de API.</p>
                  <p className="text-xs text-dark-500 mt-1">Entre em contato com o administrador da sua conta.</p>
                </div>
              )}
            </div>
          )}

          {/* Plan */}
          {activeTab === 'plan' && (
            <div className="max-w-4xl space-y-6">
              <h3 className="text-lg font-heading font-bold text-white">Seu Plano</h3>

              <PlanComparison trial={trial} currentPlan={user?.plan} />

              {/* ─── Current Subscription Status ────────────── */}
              <div className="glass-card p-6">
                <h4 className="text-lg font-heading font-bold text-white mb-4 flex items-center gap-2">
                  <CreditCard className="w-5 h-5 text-zap-400" />
                  Assinatura
                </h4>

                {loadingSubscription ? (
                  <div className="flex items-center justify-center py-6">
                    <Loader2 className="w-5 h-5 animate-spin text-zap-400" />
                  </div>
                ) : subscription?.hasSubscription ? (
                  <div className="space-y-4">
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                      <div className="p-4 rounded-xl bg-dark-800/50 border border-dark-700/30">
                        <p className="text-xs text-dark-500 mb-1">Plano Atual</p>
                        <p className="text-lg font-bold text-white">{subscription.planName}</p>
                        <p className="text-xs text-zap-400 mt-1">R$ {(subscription.amount / 100).toFixed(2).replace('.', ',')}/mês</p>
                      </div>
                      <div className="p-4 rounded-xl bg-dark-800/50 border border-dark-700/30">
                        <p className="text-xs text-dark-500 mb-1">Status</p>
                        <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium ${
                          subscription.subscriptionStatus === 'active'
                            ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                            : subscription.subscriptionStatus === 'past_due'
                              ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                              : 'bg-dark-700 text-dark-300 border border-dark-600'
                        }`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${
                            subscription.subscriptionStatus === 'active' ? 'bg-emerald-400'
                              : subscription.subscriptionStatus === 'past_due' ? 'bg-amber-400'
                                : 'bg-dark-400'
                          }`} />
                          {subscription.subscriptionStatus === 'active' ? 'Ativa'
                            : subscription.subscriptionStatus === 'past_due' ? 'Pagamento Pendente'
                              : subscription.subscriptionStatus || 'Ativa'}
                        </span>
                      </div>
                      <div className="p-4 rounded-xl bg-dark-800/50 border border-dark-700/30">
                        <p className="text-xs text-dark-500 mb-1">Próxima Cobrança</p>
                        {subscription.currentPeriodEnd ? (
                          <>
                            <p className="text-lg font-bold text-white">
                              {new Date(subscription.currentPeriodEnd).toLocaleDateString('pt-BR')}
                            </p>
                            <p className="text-xs text-dark-400 mt-1">
                              {subscription.daysRemaining != null && subscription.daysRemaining > 0
                                ? `Em ${subscription.daysRemaining} ${subscription.daysRemaining === 1 ? 'dia' : 'dias'}`
                                : subscription.daysRemaining != null && subscription.daysRemaining <= 0
                                  ? 'Vencida'
                                  : '—'}
                            </p>
                          </>
                        ) : (
                          <p className="text-sm text-dark-400">—</p>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-3 pt-2 flex-wrap">
                      <button
                        onClick={handleOpenPortal}
                        disabled={portalLoading}
                        className="btn-primary text-sm flex items-center gap-2"
                      >
                        {portalLoading ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <ExternalLinkIcon className="w-4 h-4" />
                        )}
                        Gerenciar Assinatura
                      </button>
                      <button
                        onClick={() => setShowCancelConfirm(true)}
                        className="btn-ghost text-sm text-red-400 hover:text-red-300 flex items-center gap-2"
                      >
                        Cancelar Assinatura
                      </button>
                      <p className="text-xs text-dark-500">
                        No Mercado Pago você pode gerenciar sua assinatura, atualizar forma de pagamento ou cancelar.
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="p-4 rounded-xl bg-dark-800/50 border border-dark-700/30 text-center">
                    <p className="text-dark-400 text-sm">
                      {user?.plan === 'FREE' || user?.plan === 'STARTER'
                        ? 'Você está no período de teste gratuito. Faça upgrade para ter acesso a todos os recursos!'
                        : 'Nenhuma assinatura ativa no momento.'}
                    </p>
                  </div>
                )}
              </div>

              {/* ─── Mercado Pago Setup Guide (only for ADMIN/OWNER) ── */}
              {user?.role && ['OWNER', 'ADMIN'].includes(user.role) && (
                <MpSetupGuide onConfigChange={() => { loadSubscription(); }} compact />
              )}

              {/* ─── Upgrade Cards ───────────────────── */}
              <h4 className="text-lg font-heading font-bold text-white">Assinatura Mensal</h4>
              <p className="text-sm text-dark-400 mb-4">
                Escolha um plano e assine com cobrança recorrente automática todo mês.
              </p>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 max-w-4xl">
                {[
                  { id: 'STARTER', name: 'IA Starter', price: '97', period: '/mês', features: ['1 Número conectado', '5 atendentes', 'CRM Kanban (2 quadros)', '15.000 Webhooks', '5M Tokens de IA'], current: user?.plan === 'STARTER' || user?.plan === 'FREE', popular: false },
                  { id: 'PRO', name: 'IA Pro', price: '197', period: '/mês', features: ['1 Número conectado', 'Atendentes ilimitados', 'CRM Kanban (5 quadros)', '30.000 Webhooks', '10M Tokens de IA', 'Integração Post/Put/Get'], current: user?.plan === 'PRO', popular: true },
                  { id: 'ENTERPRISE', name: 'Enterprise', price: '497', period: '/mês', features: ['Números ilimitados', 'Atendentes ilimitados', 'CRM Kanban ilimitado', 'Webhooks ilimitados', '20M Tokens de IA', 'Suporte prioritário 24h', 'SLA 99.9%', 'Onboarding dedicado'], current: user?.plan === 'ENTERPRISE', popular: false },
                ].map((plan) => (
                  <PlanCard
                    key={plan.id}
                    plan={plan}
                  />
                ))}
              </div>

              {/* ─── One-Time PIX Button ──────────────── */}
              <div className="glass-card p-6 border-2 border-emerald-500/30 bg-emerald-500/5">
                <div className="flex items-start gap-4">
                  <div className="w-14 h-14 rounded-xl bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center flex-shrink-0">
                    <svg className="w-7 h-7 text-emerald-400" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M12 0C5.383 0 0 5.383 0 12s5.383 12 12 12 12-5.383 12-12S18.617 0 12 0zm-1.004 16.125l-3.234-3.234 1.145-1.145 2.089 2.089 4.357-4.357 1.145 1.145-5.502 5.502z"/>
                    </svg>
                  </div>
                  <div className="flex-1">
                    <h4 className="text-lg font-heading font-bold text-white flex items-center gap-2">
                      Pagamento Avulso via PIX
                      <span className="bg-emerald-500/20 text-emerald-400 text-[10px] font-bold px-2 py-0.5 rounded-full border border-emerald-500/30">INSTANTÂNEO</span>
                    </h4>
                    <p className="text-sm text-dark-300 mt-1">
                      Pague <strong>uma única vez</strong> com PIX, cartão ou boleto. Sem assinatura, sem compromisso mensal.
                      Ideal para testar um plano por um mês ou se você prefere não vincular um cartão.
                    </p>
                    <div className="flex flex-wrap gap-3 mt-4">
                      {[
                        { id: 'STARTER', name: 'Starter', price: 'R$ 97' },
                        { id: 'PRO', name: 'Pro', price: 'R$ 197' },
                        { id: 'ENTERPRISE', name: 'Enterprise', price: 'R$ 497' },
                      ].map((planOption) => (
                        <OneTimePixButton
                          key={planOption.id}
                          planId={planOption.id}
                          planName={planOption.name}
                          price={planOption.price}
                        />
                      ))}
                    </div>
                    <div className="flex items-center gap-4 mt-4 text-xs text-dark-500">
                      <span className="flex items-center gap-1">
                        <Check className="w-3.5 h-3.5 text-emerald-400" />
                        PIX aprova em segundos
                      </span>
                      <span className="flex items-center gap-1">
                        <Check className="w-3.5 h-3.5 text-emerald-400" />
                        Cartão de crédito
                      </span>
                      <span className="flex items-center gap-1">
                        <Check className="w-3.5 h-3.5 text-emerald-400" />
                        Boleto bancário
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* ─── Payment History ──────────────────── */}
              <div className="glass-card p-6">
                <div className="flex items-center justify-between mb-6">
                  <h4 className="text-lg font-heading font-bold text-white flex items-center gap-2">
                    <Receipt className="w-5 h-5 text-zap-400" />
                    Histórico de Pagamentos
                  </h4>
                  {paymentsTotal > 0 && (
                    <span className="text-xs text-dark-500">{paymentsTotal} registro(s)</span>
                  )}
                </div>

                {loadingPayments ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="w-5 h-5 animate-spin text-zap-400" />
                  </div>
                ) : payments.length > 0 ? (
                  <div className="space-y-3">
                    {payments.map((payment) => (
                      <div key={payment.id} className="flex items-center justify-between p-4 rounded-xl bg-dark-800/50 border border-dark-700/30 hover:bg-dark-700/30 transition-colors">
                        <div className="flex items-center gap-4">
                          <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                            payment.status === 'succeeded' ? 'bg-emerald-500/10'
                              : payment.status === 'failed' ? 'bg-red-500/10'
                                : 'bg-dark-700/50'
                          }`}>
                            {payment.status === 'succeeded' ? (
                              <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                            ) : payment.status === 'failed' ? (
                              <AlertCircle className="w-5 h-5 text-red-400" />
                            ) : (
                              <Clock className="w-5 h-5 text-amber-400" />
                            )}
                          </div>
                          <div>
                            <p className="text-sm font-semibold text-white">
                              {payment.description || `Pagamento ${payment.plan}`}
                            </p>
                            <div className="flex items-center gap-2 mt-1">
                              <span className="text-xs text-dark-400">
                                {new Date(payment.createdAt).toLocaleDateString('pt-BR', {
                                  day: '2-digit', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit'
                                })}
                              </span>
                              <span className={`badge text-[10px] ${
                                payment.status === 'succeeded' ? 'badge-green'
                                  : payment.status === 'failed' ? 'badge-red'
                                    : payment.status === 'refunded' ? 'badge-purple'
                                      : 'badge-blue'
                              }`}>
                                {payment.status === 'succeeded' ? 'Pago'
                                  : payment.status === 'failed' ? 'Falhou'
                                    : payment.status === 'refunded' ? 'Reembolsado'
                                      : 'Pendente'}
                              </span>
                            </div>
                            {payment.periodStart && payment.periodEnd && (
                              <div className="flex items-center gap-1 mt-1 text-[10px] text-dark-500">
                                <Calendar className="w-3 h-3" />
                                {new Date(payment.periodStart).toLocaleDateString('pt-BR')}
                                <ArrowRight className="w-3 h-3" />
                                {new Date(payment.periodEnd).toLocaleDateString('pt-BR')}
                              </div>
                            )}
                          </div>
                        </div>
                        <div className="text-right">
                          <p className={`text-base font-bold ${
                            payment.status === 'succeeded' ? 'text-white'
                              : payment.status === 'failed' ? 'text-red-400'
                                : 'text-dark-300'
                          }`}>
                            R$ {(payment.amount / 100).toFixed(2).replace('.', ',')}
                          </p>
                          <p className="text-xs text-dark-500 mt-0.5">{payment.plan}</p>
                          {payment.discountAmount && payment.discountAmount > 0 && (
                            <p className="text-[10px] text-emerald-400 mt-0.5">
                              -R$ {(payment.discountAmount / 100).toFixed(2).replace('.', ',')}
                              {payment.couponCode && ` (${payment.couponCode})`}
                            </p>
                          )}
                        </div>
                      </div>
                    ))}

                    {/* Pagination */}
                    <div className="flex items-center justify-center gap-2 pt-2">
                      <button
                        onClick={() => loadPayments(paymentsPage - 1)}
                        disabled={paymentsPage <= 1}
                        className="btn-ghost text-xs disabled:opacity-30"
                      >
                        Anterior
                      </button>
                      <span className="text-xs text-dark-500">
                        Página {paymentsPage} de {Math.ceil(paymentsTotal / 10)}
                      </span>
                      <button
                        onClick={() => loadPayments(paymentsPage + 1)}
                        disabled={paymentsPage >= Math.ceil(paymentsTotal / 10)}
                        className="btn-ghost text-xs disabled:opacity-30"
                      >
                        Próxima
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="p-8 text-center">
                    <Receipt className="w-10 h-10 text-dark-600 mx-auto mb-3" />
                    <p className="text-sm text-dark-500">Nenhum pagamento registrado ainda.</p>
                    <p className="text-xs text-dark-600 mt-1">
                      Os pagamentos aparecerão aqui após a primeira cobrança.
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Cancel Subscription Modal */}
      {showCancelConfirm && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 animate-fade-in">
          <div className="glass-card w-full max-w-md p-6 mx-4 animate-slide-up">
            <h3 className="text-xl font-heading font-bold text-white mb-2">Cancelar Assinatura</h3>
            <p className="text-sm text-dark-400 mb-6">
              Tem certeza? Seu plano será rebaixado para <strong>Free</strong> e você perderá acesso aos recursos
              premium no final do período já pago. Esta ação não pode ser desfeita.
            </p>
            <div className="flex gap-3">
              <button onClick={() => setShowCancelConfirm(false)} className="btn-secondary flex-1">
                Manter Assinatura
              </button>
              <button
                onClick={handleCancelSubscription}
                disabled={cancelLoading}
                className="flex-1 bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/30 font-semibold px-5 py-3 rounded-lg transition-all disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {cancelLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Confirmar Cancelamento'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Webhook Modal */}
      {showWebhookModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 animate-fade-in">
          <div className="glass-card w-full max-w-md p-6 mx-4 animate-slide-up">
            <h3 className="text-xl font-heading font-bold text-white mb-4">Novo Webhook</h3>
            <div className="space-y-4">
              <div>
                <label htmlFor="webhook-name" className="block text-sm font-medium text-dark-300 mb-2">Nome</label>
                <input id="webhook-name" name="webhook-name" value={newWebhook.name} onChange={(e) => setNewWebhook({ ...newWebhook, name: e.target.value })} className="input-field w-full" />
              </div>
              <div>
                <label htmlFor="webhook-url" className="block text-sm font-medium text-dark-300 mb-2">URL</label>
                <input id="webhook-url" name="webhook-url" value={newWebhook.url} onChange={(e) => setNewWebhook({ ...newWebhook, url: e.target.value })} placeholder="https://..." className="input-field w-full font-mono" />
              </div>
              <div className="flex gap-3 mt-6">
                <button onClick={() => setShowWebhookModal(false)} className="btn-secondary flex-1">Cancelar</button>
                <button onClick={handleCreateWebhook} className="btn-primary flex-1">Criar</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
