import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { flowsApi } from '../api';
import { Flow } from '../types';
import {
  Plus, GitBranch, Zap, Clock, ToggleLeft, ToggleRight, Copy, Trash2, Play, Pause,
} from 'lucide-react';
import toast from 'react-hot-toast';

export default function FlowsPage() {
  const [flows, setFlows] = useState<Flow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => { loadFlows(); }, []);

  const loadFlows = async () => {
    try {
      const { data } = await flowsApi.list();
      setFlows(data);
    } catch {
      setFlows([
        { id: '1', name: 'Boas-vindas Automático', description: 'Recebe novos leads com mensagem personalizada', isActive: true, triggerType: 'keyword', triggerValue: 'oi', nodes: [], edges: [], createdAt: '2024-03-10', updatedAt: '2024-03-15' },
        { id: '2', name: 'Qualificação de Leads', description: 'Perguntas para qualificar o lead automaticamente', isActive: true, triggerType: 'keyword', triggerValue: 'info', nodes: [], edges: [], createdAt: '2024-03-08', updatedAt: '2024-03-14' },
        { id: '3', name: 'Suporte Técnico', description: 'Redireciona para suporte humano quando necessário', isActive: false, triggerType: 'keyword', triggerValue: 'suporte', nodes: [], edges: [], createdAt: '2024-03-05', updatedAt: '2024-03-12' },
        { id: '4', name: 'Agendamento de Reunião', description: 'Agenda reunião automaticamente via IA', isActive: true, triggerType: 'keyword', triggerValue: 'agendar', nodes: [], edges: [], createdAt: '2024-03-01', updatedAt: '2024-03-10' },
      ]);
    } finally { setLoading(false); }
  };

  const handleCreate = async () => {
    try {
      const { data } = await flowsApi.create({ name: 'Novo Fluxo' });
      toast.success('Fluxo criado!');
      window.location.href = `/flows/${data.id}`;
    } catch { toast.error('Erro ao criar fluxo'); }
  };

  const handleToggle = async (id: string) => {
    try {
      const { data } = await flowsApi.toggle(id);
      setFlows(flows.map((f) => (f.id === id ? { ...f, isActive: data.isActive } : f)));
      toast.success(data.isActive ? 'Fluxo ativado!' : 'Fluxo desativado');
    } catch { toast.error('Erro ao alterar fluxo'); }
  };

  const handleDuplicate = async (id: string) => {
    try {
      const { data } = await flowsApi.duplicate(id);
      setFlows([data, ...flows]);
      toast.success('Fluxo duplicado!');
    } catch { toast.error('Erro ao duplicar'); }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Excluir este fluxo?')) return;
    try {
      await flowsApi.delete(id);
      setFlows(flows.filter((f) => f.id !== id));
      toast.success('Fluxo excluído');
    } catch { toast.error('Erro ao excluir'); }
  };

  const triggerLabels: Record<string, string> = {
    keyword: 'Palavra-chave', manual: 'Manual', event: 'Evento',
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="page-header">
        <div>
          <h1 className="page-title">Automações</h1>
          <p className="page-subtitle">Crie fluxos inteligentes para WhatsApp</p>
        </div>
        <button onClick={handleCreate} className="btn-primary flex items-center gap-2">
          <Plus className="w-4 h-4" /> Novo Fluxo
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: 'Total', value: flows.length, color: 'text-white' },
          { label: 'Ativos', value: flows.filter((f) => f.isActive).length, color: 'text-emerald-400' },
          { label: 'Inativos', value: flows.filter((f) => !f.isActive).length, color: 'text-dark-400' },
        ].map((s) => (
          <div key={s.label} className="glass-card p-4 text-center">
            <p className={`text-2xl font-heading font-bold ${s.color}`}>{s.value}</p>
            <p className="text-xs text-dark-400">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Flows List */}
      <div className="space-y-3">
        {flows.map((flow) => (
          <div key={flow.id} className="glass-card p-5 hover:border-dark-600/60 transition-all group">
            <div className="flex items-center gap-4">
              <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${
                flow.isActive ? 'bg-zap-500/10' : 'bg-dark-700'
              }`}>
                <GitBranch className={`w-6 h-6 ${flow.isActive ? 'text-zap-400' : 'text-dark-400'}`} />
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-3">
                  <h3 className="text-base font-heading font-bold text-white">{flow.name}</h3>
                  <span className={`badge text-[10px] ${flow.isActive ? 'badge-green' : 'badge-red'}`}>
                    {flow.isActive ? 'Ativo' : 'Inativo'}
                  </span>
                  <span className="badge badge-blue text-[10px]">
                    {triggerLabels[flow.triggerType]}: {flow.triggerValue}
                  </span>
                </div>
                <p className="text-sm text-dark-400 mt-1">{flow.description}</p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => handleToggle(flow.id)}
                  className={`p-2 rounded-lg transition-colors ${
                    flow.isActive ? 'text-emerald-400 hover:bg-emerald-500/10' : 'text-dark-500 hover:bg-dark-700'
                  }`}
                  title={flow.isActive ? 'Desativar' : 'Ativar'}
                >
                  {flow.isActive ? <ToggleRight className="w-6 h-6" /> : <ToggleLeft className="w-6 h-6" />}
                </button>
                <Link
                  to={`/flows/${flow.id}`}
                  className="btn-secondary text-xs py-1.5 px-3"
                >
                  <Zap className="w-3.5 h-3.5 mr-1 inline" /> Editar
                </Link>
                <button onClick={() => handleDuplicate(flow.id)} className="btn-ghost p-2" title="Duplicar">
                  <Copy className="w-4 h-4" />
                </button>
                <button onClick={() => handleDelete(flow.id)} className="btn-ghost p-2 text-dark-500 hover:text-red-400" title="Excluir">
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
            <div className="flex items-center gap-4 mt-3 ml-16 text-xs text-dark-500">
              <span className="flex items-center gap-1"><Clock className="w-3 h-3" /> {new Date(flow.updatedAt).toLocaleDateString('pt-BR')}</span>
              <span>{flow.nodes.length} nós</span>
              <span>{flow.edges.length} conexões</span>
            </div>
          </div>
        ))}
      </div>

      {flows.length === 0 && !loading && (
        <div className="text-center py-20">
          <GitBranch className="w-16 h-16 text-dark-600 mx-auto mb-4" />
          <h3 className="text-lg font-heading font-bold text-dark-400">Nenhum fluxo criado</h3>
          <p className="text-sm text-dark-500 mt-1 mb-6">Crie seu primeiro fluxo de automação</p>
          <button onClick={handleCreate} className="btn-primary">Criar Primeiro Fluxo</button>
        </div>
      )}
    </div>
  );
}
