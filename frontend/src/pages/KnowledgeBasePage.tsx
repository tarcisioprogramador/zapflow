import { useEffect, useState } from 'react';
import { knowledgeBaseApi } from '../api';
import { BookOpen, Plus, Trash2, Save, FileText, Search, ChevronDown, ChevronUp } from 'lucide-react';
import toast from 'react-hot-toast';

interface KnowledgeItem {
  id: string;
  title: string;
  content: string;
  category: string;
}

export default function KnowledgeBasePage() {
  const [items, setItems] = useState<KnowledgeItem[]>([]);
  const [search, setSearch] = useState('');
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState({ title: '', content: '', category: 'Geral' });
  const [stats, setStats] = useState({ total: 0, categories: 0, characters: 0 });
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState<string | null>(null);

  useEffect(() => { loadItems(); loadStats(); }, []);

  const loadItems = async () => {
    try {
      const { data } = await knowledgeBaseApi.list({ search });
      setItems(data);
    } catch {
      // Fallback to demo data
      setItems([
        { id: '1', title: 'Planos e Preços', content: 'Starter: R$97/mês - 1 número, 5 atendentes, CRM básico.\nPro: R$197/mês - 3 números, ilimitado, IA, webhooks.\nEnterprise: R$497/mês - tudo ilimitado, suporte 24/7.', category: 'Comercial' },
        { id: '2', title: 'Horário de Funcionamento', content: 'Atendimento automatizado 24/7 via IA.\nAtendimento humano: Seg-Sex 9h às 18h.\nSuporte prioritário (Pro): Seg-Sex 8h às 20h.', category: 'Geral' },
        { id: '3', title: 'Política de Cancelamento', content: 'Cancelamento a qualquer momento sem multa.\nAcesso mantido até o final do período pago.\nReembolso em até 7 dias após pagamento.', category: 'Comercial' },
      ]);
    } finally { setLoading(false); }
  };

  const loadStats = async () => {
    try {
      const { data } = await knowledgeBaseApi.getStats();
      setStats(data);
    } catch { /* demo */ }
  };

  const handleSearch = async () => {
    try {
      const { data } = await knowledgeBaseApi.list({ search });
      setItems(data);
    } catch { /* demo */ }
  };

  useEffect(() => {
    const timer = setTimeout(handleSearch, 300);
    return () => clearTimeout(timer);
  }, [search]);

  const handleAdd = async () => {
    if (!form.title || !form.content) { toast.error('Preencha título e conteúdo'); return; }
    try {
      const { data } = await knowledgeBaseApi.create(form);
      setItems([data, ...items]);
      setForm({ title: '', content: '', category: 'Geral' });
      setShowAdd(false);
      loadStats();
      toast.success('Item adicionado à base de conhecimento!');
    } catch {
      toast.error('Erro ao adicionar item');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Remover este item?')) return;
    try {
      await knowledgeBaseApi.delete(id);
      setItems(items.filter((i) => i.id !== id));
      loadStats();
      toast.success('Item removido');
    } catch {
      toast.error('Erro ao remover item');
    }
  };

  const handleUpdate = async (id: string, updates: Partial<KnowledgeItem>) => {
    setItems(items.map((i) => (i.id === id ? { ...i, ...updates } : i)));
  };

  const handleSave = async (id: string) => {
    const item = items.find((i) => i.id === id);
    if (!item) return;
    setSavingId(id);
    try {
      await knowledgeBaseApi.update(id, { title: item.title, content: item.content, category: item.category });
      loadStats();
      toast.success('Salvo!');
    } catch {
      toast.error('Erro ao salvar');
    } finally { setSavingId(null); }
  };

  const categories = [...new Set(items.map((i) => i.category))];

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="page-header">
        <div>
          <h1 className="page-title">Base de Conhecimento</h1>
          <p className="page-subtitle">Treine a IA com informações do seu negócio</p>
        </div>
        <button onClick={() => setShowAdd(true)} className="btn-primary flex items-center gap-2">
          <Plus className="w-4 h-4" /> Adicionar Item
        </button>
      </div>

      {/* Info Banner */}
      <div className="glass-card p-5 bg-gradient-to-r from-brand-500/10 to-zap-500/10 border border-brand-500/20">
        <div className="flex items-start gap-4">
          <div className="w-10 h-10 rounded-xl bg-brand-500/20 flex items-center justify-center flex-shrink-0">
            <BookOpen className="w-5 h-5 text-brand-400" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-white mb-1">Como funciona</h3>
            <p className="text-xs text-dark-400 leading-relaxed">
              A base de conhecimento alimenta o assistente IA do ZapFlow. Quando um cliente envia uma mensagem,
              a IA consulta essas informações para gerar respostas precisas e personalizadas para o seu negócio.
              Adicione informações sobre produtos, preços, políticas, FAQ e qualquer conteúdo relevante.
            </p>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: 'Total de Itens', value: stats.total, color: 'text-white' },
          { label: 'Categorias', value: stats.categories, color: 'text-purple-400' },
          { label: 'Caracteres', value: stats.characters.toLocaleString(), color: 'text-zap-400' },
        ].map((s) => (
          <div key={s.label} className="stat-card">
            <p className={`text-2xl font-heading font-bold ${s.color}`}>{s.value}</p>
            <p className="text-xs text-dark-400">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Search */}
      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-dark-500" />
        <input
          id="kb-search"
          name="kb-search"
          type="text" value={search} onChange={(e) => setSearch(e.target.value)}
          placeholder="Buscar na base de conhecimento..."
          className="input-field pl-10 w-full"
        />
      </div>

      {/* Knowledge Items */}
      <div className="space-y-3">
        {items.map((item) => (
          <div key={item.id} className="glass-card overflow-hidden">
            <div
              className="flex items-center justify-between p-4 cursor-pointer hover:bg-dark-800/30 transition-colors"
              onClick={() => setExpandedId(expandedId === item.id ? null : item.id)}
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-zap-500/10 flex items-center justify-center">
                  <FileText className="w-5 h-5 text-zap-400" />
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-white">{item.title}</h3>
                  <span className="badge badge-purple text-[10px]">{item.category}</span>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button onClick={(e) => { e.stopPropagation(); handleDelete(item.id); }} className="btn-ghost p-1.5 text-dark-500 hover:text-red-400">
                  <Trash2 className="w-4 h-4" />
                </button>
                {expandedId === item.id ? <ChevronUp className="w-4 h-4 text-dark-400" /> : <ChevronDown className="w-4 h-4 text-dark-400" />}
              </div>
            </div>
            {expandedId === item.id && (
              <div className="px-4 pb-4 border-t border-dark-700/30 pt-4 animate-slide-up">
                <textarea
                  value={item.content}
                  onChange={(e) => handleUpdate(item.id, { content: e.target.value })}
                  className="input-field w-full h-32 resize-none text-sm font-mono"
                />
                <div className="flex gap-2 mt-3">
                  <input
                    value={item.category}
                    onChange={(e) => handleUpdate(item.id, { category: e.target.value })}
                    className="input-field text-xs w-40"
                    placeholder="Categoria"
                  />
                  <button
                    onClick={() => handleSave(item.id)}
                    disabled={savingId === item.id}
                    className="btn-primary text-xs flex items-center gap-1"
                  >
                    {savingId === item.id ? (
                      <div className="w-3 h-3 border border-white/30 border-t-white rounded-full animate-spin" />
                    ) : (
                      <Save className="w-3 h-3" />
                    )}
                    Salvar
                  </button>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>

      {items.length === 0 && !loading && (
        <div className="text-center py-12">
          <BookOpen className="w-12 h-12 text-dark-600 mx-auto mb-3" />
          <p className="text-dark-400 text-sm">Nenhum item na base de conhecimento</p>
          <p className="text-dark-500 text-xs mt-1">Adicione informações para treinar a IA</p>
        </div>
      )}

      {/* Add Modal */}
      {showAdd && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 animate-fade-in">
          <div className="glass-card w-full max-w-md p-6 mx-4 animate-slide-up">
            <h3 className="text-xl font-heading font-bold text-white mb-4">Novo Item</h3>
            <div className="space-y-4">
              <div>
                <label htmlFor="kb-title" className="block text-sm font-medium text-dark-300 mb-2">Título</label>
                <input id="kb-title" name="kb-title" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="Ex: Política de Troca" className="input-field w-full" />
              </div>
              <div>
                <label htmlFor="kb-category" className="block text-sm font-medium text-dark-300 mb-2">Categoria</label>
                <input id="kb-category" name="kb-category" value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} placeholder="Ex: Comercial, Suporte, Geral" className="input-field w-full" />
              </div>
              <div>
                <label htmlFor="kb-content" className="block text-sm font-medium text-dark-300 mb-2">Conteúdo</label>
                <textarea id="kb-content" name="kb-content" value={form.content} onChange={(e) => setForm({ ...form, content: e.target.value })} placeholder="Informações que a IA deve usar..." className="input-field w-full h-32 resize-none" />
              </div>
              <div className="flex gap-3 mt-6">
                <button onClick={() => setShowAdd(false)} className="btn-secondary flex-1">Cancelar</button>
                <button onClick={handleAdd} className="btn-primary flex-1">Adicionar</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
