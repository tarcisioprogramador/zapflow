import { useEffect, useState, useCallback } from 'react';
import { useAuthStore } from '../store';
import { webhooksApi, usersApi, paymentsApi, authApi } from '../api';
import { Webhook, TrialStatus } from '../types';
import PlanComparison from '../components/PlanComparison';
import {
  User, Users, Webhook as WebhookIcon, Key, CreditCard, Bell, Shield, Globe, Plus, Trash2, Send,
  ExternalLink, Copy, Check, Zap, Loader2,
} from 'lucide-react';
import toast from 'react-hot-toast';

const tabs = [
  { id: 'profile', label: 'Perfil', icon: User },
  { id: 'team', label: 'Equipe', icon: Users },
  { id: 'webhooks', label: 'Webhooks', icon: WebhookIcon },
  { id: 'api', label: 'API', icon: Key },
  { id: 'plan', label: 'Plano', icon: CreditCard },
];

function PlanCard({ plan }: { plan: { id: string; name: string; price: string; period: string; features: string[]; current: boolean; popular: boolean } }) {
  const [loading, setLoading] = useState(false);

  const handleUpgrade = async () => {
    setLoading(true);
    try {
      const { data } = await paymentsApi.createCheckout({ plan: plan.id });
      if (data.url) {
        window.location.href = data.url;
      }
    } catch (err: any) {
      const msg = err.response?.data?.error || 'Erro ao iniciar checkout';
      if (msg.includes('Stripe não configurado')) {
        alert('Pagamento via Stripe ainda não configurado. Entre em contato com o suporte para assinar.');
      } else {
        alert(msg);
      }
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

  const loadTrial = useCallback(async () => {
    try {
      const { data } = await authApi.trial();
      setTrial(data);
    } catch { /* ignore */ }
  }, []);

  useEffect(() => {
    if (activeTab === 'webhooks') loadWebhooks();
    if (activeTab === 'team') loadTeam();
    if (activeTab === 'plan') loadTrial();
  }, [activeTab, loadTrial]);

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

          {/* Webhooks */}
          {activeTab === 'webhooks' && (
            <div className="glass-card p-6 max-w-3xl">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg font-heading font-bold text-white">Webhooks</h3>
                <button onClick={() => setShowWebhookModal(true)} className="btn-primary text-sm flex items-center gap-2">
                  <Plus className="w-4 h-4" /> Novo Webhook
                </button>
              </div>
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
            </div>
          )}

          {/* API */}
          {activeTab === 'api' && (
            <div className="glass-card p-6 max-w-3xl">
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
            </div>
          )}

          {/* Plan */}
          {activeTab === 'plan' && (
            <div className="max-w-4xl space-y-6">
              <h3 className="text-lg font-heading font-bold text-white">Seu Plano</h3>

              <PlanComparison trial={trial} currentPlan={user?.plan} />

              <h4 className="text-lg font-heading font-bold text-white">Fazer Upgrade</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-w-2xl">
                {[
                  { id: 'STARTER', name: 'IA Starter', price: '97', period: '/mês', features: ['1 Número conectado', '5 atendentes', 'CRM Kanban (2 quadros)', '15.000 Webhooks', '5M Tokens de IA'], current: user?.plan === 'STARTER' || user?.plan === 'FREE', popular: false },
                  { id: 'PRO', name: 'IA Pro', price: '197', period: '/mês', features: ['1 Número conectado', 'Atendentes ilimitados', 'CRM Kanban (5 quadros)', '30.000 Webhooks', '10M Tokens de IA', 'Integração Post/Put/Get'], current: user?.plan === 'PRO', popular: true },
                ].map((plan) => (
                  <PlanCard
                    key={plan.id}
                    plan={plan}
                  />
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

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
