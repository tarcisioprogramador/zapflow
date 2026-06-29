import { useEffect, useState } from 'react';
import { campaignsApi } from '../api';
import { Campaign } from '../types';
import {
  Plus, Send, Pause, Play, Trash2, Eye, Clock, CheckCircle2, XCircle,
  FileText, Users, BarChart3, AlertCircle,
} from 'lucide-react';
import toast from 'react-hot-toast';

export default function CampaignsPage() {
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({ name: '', message: '', mediaUrl: '' });
  const [loading, setLoading] = useState(true);

  useEffect(() => { loadCampaigns(); }, []);

  const loadCampaigns = async () => {
    try {
      const { data } = await campaignsApi.list();
      setCampaigns(data);
    } catch {
      setCampaigns([
        { id: '1', name: 'Promoção de Verão', message: '🌞 Promoção de Verão! 30% de desconto em todos os planos.', status: 'COMPLETED', totalSent: 450, totalFailed: 12, _count: { contacts: 462 }, createdAt: '2024-03-10' },
        { id: '2', name: 'Lançamento Produto', message: '🚀 Novo produto lançado! Conheça agora...', status: 'RUNNING', totalSent: 230, totalFailed: 5, _count: { contacts: 500 }, createdAt: '2024-03-14' },
        { id: '3', name: 'Follow-up Semanal', message: 'Olá! Não esqueça de agendar sua reunião...', status: 'SCHEDULED', totalSent: 0, totalFailed: 0, _count: { contacts: 120 }, createdAt: '2024-03-15' },
        { id: '4', name: 'Pesquisa de Satisfação', message: '📊 Sua opinião é importante! Responda nossa pesquisa...', status: 'DRAFT', totalSent: 0, totalFailed: 0, _count: { contacts: 300 }, createdAt: '2024-03-15' },
        { id: '5', name: 'Black Friday', message: '🖤 Black Friday: Até 50% OFF em tudo!', status: 'PAUSED', totalSent: 180, totalFailed: 8, _count: { contacts: 350 }, createdAt: '2024-03-12' },
      ]);
    } finally { setLoading(false); }
  };

  const handleCreate = async () => {
    if (!form.name || !form.message) { toast.error('Preencha nome e mensagem'); return; }
    try {
      const { data } = await campaignsApi.create(form);
      setCampaigns([data, ...campaigns]);
      setShowModal(false);
      setForm({ name: '', message: '', mediaUrl: '' });
      toast.success('Campanha criada!');
    } catch { toast.error('Erro ao criar campanha'); }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Excluir esta campanha?')) return;
    try {
      await campaignsApi.delete(id);
      setCampaigns(campaigns.filter((c) => c.id !== id));
      toast.success('Campanha excluída');
    } catch { toast.error('Erro ao excluir'); }
  };

  const statusConfig = {
    DRAFT: { label: 'Rascunho', icon: FileText, color: 'badge bg-dark-600 text-dark-300' },
    SCHEDULED: { label: 'Agendada', icon: Clock, color: 'badge-blue' },
    RUNNING: { label: 'Executando', icon: Play, color: 'badge-green' },
    COMPLETED: { label: 'Concluída', icon: CheckCircle2, color: 'badge bg-emerald-500/10 text-emerald-400' },
    PAUSED: { label: 'Pausada', icon: Pause, color: 'badge-yellow' },
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="page-header">
        <div>
          <h1 className="page-title">Disparos em Massa</h1>
          <p className="page-subtitle">Campanhas e envios para sua lista de contatos</p>
        </div>
        <button onClick={() => setShowModal(true)} className="btn-primary flex items-center gap-2">
          <Plus className="w-4 h-4" /> Nova Campanha
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {[
          { label: 'Total Campanhas', value: campaigns.length, icon: FileText, color: 'text-white' },
          { label: 'Enviados', value: campaigns.reduce((s, c) => s + c.totalSent, 0).toLocaleString(), icon: Send, color: 'text-zap-400' },
          { label: 'Falhas', value: campaigns.reduce((s, c) => s + c.totalFailed, 0), icon: AlertCircle, color: 'text-red-400' },
          { label: 'Contatos Alcançados', value: campaigns.reduce((s, c) => s + (c._count?.contacts || 0), 0).toLocaleString(), icon: Users, color: 'text-purple-400' },
        ].map((s) => (
          <div key={s.label} className="stat-card">
            <div className="flex items-center gap-3">
              <s.icon className={`w-5 h-5 ${s.color}`} />
              <div>
                <p className="text-xl font-display font-bold text-white">{s.value}</p>
                <p className="text-xs text-dark-400">{s.label}</p>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Campaigns List */}
      <div className="space-y-3">
        {campaigns.map((campaign) => {
          const status = statusConfig[campaign.status];
          const progress = campaign._count?.contacts ? (campaign.totalSent / campaign._count.contacts) * 100 : 0;
          return (
            <div key={campaign.id} className="glass-card p-5 hover:border-dark-600/60 transition-all group">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl bg-brand-500/10 flex items-center justify-center">
                  <Send className="w-6 h-6 text-brand-400" />
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-3">
                    <h3 className="text-base font-display font-bold text-white">{campaign.name}</h3>
                    <span className={status.color}>{status.label}</span>
                  </div>
                  <p className="text-sm text-dark-400 mt-1 truncate max-w-lg">{campaign.message}</p>
                  <div className="flex items-center gap-4 mt-2 text-xs text-dark-500">
                    <span>{campaign._count?.contacts || 0} contatos</span>
                    <span>{campaign.totalSent} enviados</span>
                    {campaign.totalFailed > 0 && <span className="text-red-400">{campaign.totalFailed} falhas</span>}
                    <span>{new Date(campaign.createdAt).toLocaleDateString('pt-BR')}</span>
                  </div>
                  {campaign.totalSent > 0 && (
                    <div className="mt-2 h-1.5 bg-dark-700 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-zap-500 to-brand-500 rounded-full transition-all"
                        style={{ width: `${Math.min(progress, 100)}%` }}
                      />
                    </div>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  {campaign.status === 'DRAFT' && (
                    <button className="btn-primary text-xs py-1.5 px-3">
                      <Send className="w-3.5 h-3.5 mr-1 inline" /> Enviar
                    </button>
                  )}
                  {campaign.status === 'RUNNING' && (
                    <button className="btn-secondary text-xs py-1.5 px-3">
                      <Pause className="w-3.5 h-3.5 mr-1 inline" /> Pausar
                    </button>
                  )}
                  {campaign.status === 'PAUSED' && (
                    <button className="btn-primary text-xs py-1.5 px-3">
                      <Play className="w-3.5 h-3.5 mr-1 inline" /> Retomar
                    </button>
                  )}
                  <button onClick={() => handleDelete(campaign.id)} className="btn-ghost p-2 text-dark-500 hover:text-red-400">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {campaigns.length === 0 && !loading && (
        <div className="text-center py-20">
          <Send className="w-16 h-16 text-dark-600 mx-auto mb-4" />
          <h3 className="text-lg font-display font-bold text-dark-400">Nenhuma campanha</h3>
          <p className="text-sm text-dark-500 mt-1 mb-6">Crie sua primeira campanha de disparo</p>
          <button onClick={() => setShowModal(true)} className="btn-primary">Criar Campanha</button>
        </div>
      )}

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 animate-fade-in">
          <div className="glass-card w-full max-w-lg p-6 mx-4 animate-slide-up">
            <h3 className="text-xl font-display font-bold text-white mb-4">Nova Campanha</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-dark-300 mb-2">Nome</label>
                <input
                  value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })}
                  placeholder="Nome da campanha"
                  className="input-field w-full"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-dark-300 mb-2">Mensagem</label>
                <textarea
                  value={form.message} onChange={(e) => setForm({ ...form, message: e.target.value })}
                  placeholder="Digite a mensagem que será enviada..."
                  className="input-field w-full h-32 resize-none"
                  maxLength={1000}
                />
                <p className="text-xs text-dark-500 mt-1">{form.message.length}/1000 caracteres</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-dark-300 mb-2">URL da Mídia (opcional)</label>
                <input
                  value={form.mediaUrl} onChange={(e) => setForm({ ...form, mediaUrl: e.target.value })}
                  placeholder="https://..."
                  className="input-field w-full"
                />
              </div>
              <div className="flex gap-3 mt-6">
                <button onClick={() => setShowModal(false)} className="btn-secondary flex-1">Cancelar</button>
                <button onClick={handleCreate} className="btn-primary flex-1">Criar Campanha</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
