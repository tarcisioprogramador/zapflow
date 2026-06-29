import { useEffect, useState } from 'react';
import { crmApi } from '../api';
import { CrmBoard, CrmStage, CrmCard } from '../types';
import {
  Plus, Columns3, DollarSign, MoreVertical, Trash2, Edit3, GripVertical,
  User, Phone, Tag,
} from 'lucide-react';
import { parseTags } from '../utils';
import toast from 'react-hot-toast';

export default function CrmPage() {
  const [boards, setBoards] = useState<CrmBoard[]>([]);
  const [selectedBoard, setSelectedBoard] = useState<CrmBoard | null>(null);
  const [cards, setCards] = useState<CrmCard[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddCard, setShowAddCard] = useState<string | null>(null);
  const [newCard, setNewCard] = useState({ title: '', value: '', contactName: '', contactPhone: '' });

  useEffect(() => { loadBoards(); }, []);

  const loadBoards = async () => {
    try {
      const { data } = await crmApi.listBoards();
      setBoards(data);
      if (data.length > 0) {
        setSelectedBoard(data[0]);
        loadCards(data[0].id);
      }
    } catch {
      // Demo data
      const demoBoard: CrmBoard = {
        id: '1', name: 'Pipeline de Vendas',
        stages: [
          { id: 's1', name: 'Lead', color: '#6366f1', position: 0 },
          { id: 's2', name: 'Contato', color: '#f59e0b', position: 1 },
          { id: 's3', name: 'Proposta', color: '#3b82f6', position: 2 },
          { id: 's4', name: 'Negociação', color: '#8b5cf6', position: 3 },
          { id: 's5', name: 'Fechado', color: '#10b981', position: 4 },
        ],
        _count: { cards: 8 },
      };
      setBoards([demoBoard]);
      setSelectedBoard(demoBoard);
      setCards([
        { id: 'c1', title: 'João Silva - Tech Corp', value: 500, position: 0, stageId: 's1', boardId: '1', stage: demoBoard.stages[0], contact: { id: '1', name: 'João Silva', phone: '+5511988888888', tags: '["lead"]', createdAt: '' } },
        { id: 'c2', title: 'Maria Santos', value: 300, position: 1, stageId: 's1', boardId: '1', stage: demoBoard.stages[0], contact: { id: '2', name: 'Maria Santos', phone: '+5511977777777', tags: '["lead"]', createdAt: '' } },
        { id: 'c3', title: 'Pedro Costa - StartupX', value: 800, position: 0, stageId: 's2', boardId: '1', stage: demoBoard.stages[1], contact: { id: '3', name: 'Pedro Costa', phone: '+5511966666666', tags: '["interessado"]', createdAt: '' } },
        { id: 'c4', title: 'Ana Oliveira', value: 450, position: 1, stageId: 's2', boardId: '1', stage: demoBoard.stages[1], contact: { id: '4', name: 'Ana Oliveira', phone: '+5511955555555', tags: '["lead"]', createdAt: '' } },
        { id: 'c5', title: 'Lucas Ferreira - Agência', value: 1200, position: 0, stageId: 's3', boardId: '1', stage: demoBoard.stages[2], contact: { id: '5', name: 'Lucas Ferreira', phone: '+5511944444444', tags: '["parceiro"]', createdAt: '' } },
        { id: 'c6', title: 'Fernanda Lima', value: 600, position: 0, stageId: 's4', boardId: '1', stage: demoBoard.stages[3] },
        { id: 'c7', title: 'Ricardo Alves', value: 900, position: 0, stageId: 's5', boardId: '1', stage: demoBoard.stages[4] },
        { id: 'c8', title: 'Camila Souza', value: 350, position: 1, stageId: 's5', boardId: '1', stage: demoBoard.stages[4] },
      ]);
    } finally { setLoading(false); }
  };

  const loadCards = async (boardId: string) => {
    try {
      const { data } = await crmApi.listCards(boardId);
      setCards(data);
    } catch { /* use demo */ }
  };

  const handleCreateBoard = async () => {
    const name = prompt('Nome do novo board:');
    if (!name) return;
    try {
      const { data } = await crmApi.createBoard({ name });
      setBoards([...boards, data]);
      setSelectedBoard(data);
      toast.success('Board criado!');
    } catch { toast.error('Erro ao criar board'); }
  };

  const handleAddCard = async (stageId: string) => {
    if (!newCard.title.trim() || !selectedBoard) return;
    try {
      const { data } = await crmApi.createCard({
        title: newCard.title,
        value: newCard.value ? parseFloat(newCard.value) : undefined,
        boardId: selectedBoard.id,
        stageId,
      });
      setCards([...cards, data]);
      setNewCard({ title: '', value: '', contactName: '', contactPhone: '' });
      setShowAddCard(null);
      toast.success('Card criado!');
    } catch { toast.error('Erro ao criar card'); }
  };

  const handleMoveCard = (cardId: string, targetStageId: string) => {
    const card = cards.find((c) => c.id === cardId);
    if (!card || card.stageId === targetStageId) return;
    const targetStage = selectedBoard?.stages.find((s) => s.id === targetStageId);
    setCards(cards.map((c) =>
      c.id === cardId ? { ...c, stageId: targetStageId, stage: targetStage || c.stage } : c
    ));
    toast.success('Card movido!');
  };

  const handleDeleteCard = (cardId: string) => {
    setCards(cards.filter((c) => c.id !== cardId));
    toast.success('Card removido');
  };

  const totalValue = cards.reduce((sum, c) => sum + (c.value || 0), 0);

  const handleDragStart = (e: React.DragEvent, cardId: string) => {
    e.dataTransfer.setData('cardId', cardId);
  };

  const handleDrop = (e: React.DragEvent, stageId: string) => {
    e.preventDefault();
    const cardId = e.dataTransfer.getData('cardId');
    if (cardId) handleMoveCard(cardId, stageId);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="w-8 h-8 border-2 border-zap-500/30 border-t-zap-500 rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="page-header">
        <div>
          <h1 className="page-title">CRM Kanban</h1>
          <p className="page-subtitle">Pipeline de vendas • {cards.length} cards • R$ {totalValue.toLocaleString()}</p>
        </div>
        <div className="flex items-center gap-3">
          <select
            value={selectedBoard?.id || ''}
            onChange={(e) => {
              const board = boards.find((b) => b.id === e.target.value);
              setSelectedBoard(board || null);
              if (board) loadCards(board.id);
            }}
            className="input-field text-sm"
          >
            {boards.map((b) => (
              <option key={b.id} value={b.id}>{b.name}</option>
            ))}
          </select>
          <button onClick={handleCreateBoard} className="btn-secondary text-sm">+ Board</button>
        </div>
      </div>

      {/* Kanban Board */}
      <div className="flex gap-4 overflow-x-auto pb-4 -mx-2 px-2" style={{ minHeight: 'calc(100vh - 16rem)' }}>
        {selectedBoard?.stages.map((stage) => {
          const stageCards = cards.filter((c) => c.stageId === stage.id);
          const stageValue = stageCards.reduce((sum, c) => sum + (c.value || 0), 0);

          return (
            <div
              key={stage.id}
              className="flex-shrink-0 w-80 flex flex-col"
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => handleDrop(e, stage.id)}
            >
              {/* Column Header */}
              <div className="flex items-center justify-between mb-3 px-1">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full" style={{ backgroundColor: stage.color }} />
                  <h3 className="text-sm font-semibold text-white">{stage.name}</h3>
                  <span className="badge bg-dark-700 text-dark-300 text-[10px]">{stageCards.length}</span>
                </div>
                {stageValue > 0 && (
                  <span className="text-xs font-mono text-dark-400">R$ {stageValue.toLocaleString()}</span>
                )}
              </div>

              {/* Cards */}
              <div className="flex-1 space-y-2 p-2 rounded-xl bg-dark-900/50 border border-dark-700/30 min-h-[100px]">
                {stageCards.map((card) => (
                  <div
                    key={card.id}
                    draggable
                    onDragStart={(e) => handleDragStart(e, card.id)}
                    className="glass-card p-3 cursor-grab active:cursor-grabbing hover:border-dark-600/60 transition-all group"
                  >
                    <div className="flex items-start justify-between mb-2">
                      <h4 className="text-sm font-semibold text-white leading-tight">{card.title}</h4>
                      <button
                        onClick={() => handleDeleteCard(card.id)}
                        className="opacity-0 group-hover:opacity-100 text-dark-500 hover:text-red-400 transition-all"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                    {card.contact && (
                      <div className="flex items-center gap-2 mb-2">
                        <User className="w-3 h-3 text-dark-500" />
                        <span className="text-xs text-dark-400">{card.contact.name}</span>
                      </div>
                    )}
                    {card.value && (
                      <div className="flex items-center gap-1.5">
                        <DollarSign className="w-3 h-3 text-emerald-400" />
                        <span className="text-xs font-semibold text-emerald-400">R$ {card.value.toLocaleString()}</span>
                      </div>
                    )}
                    {parseTags(card.contact?.tags).length > 0 && (
                      <div className="flex gap-1 mt-2 flex-wrap">
                        {parseTags(card.contact?.tags).map((tag: string) => (
                          <span key={tag} className="badge badge-purple text-[9px]">{tag}</span>
                        ))}
                      </div>
                    )}
                  </div>
                ))}

                {/* Add Card */}
                {showAddCard === stage.id ? (
                  <div className="p-3 rounded-xl border border-zap-500/30 bg-dark-800/80">
                    <input
                      autoFocus
                      value={newCard.title}
                      onChange={(e) => setNewCard({ ...newCard, title: e.target.value })}
                      onKeyDown={(e) => e.key === 'Enter' && handleAddCard(stage.id)}
                      placeholder="Título do card..."
                      className="input-field w-full text-xs mb-2"
                    />
                    <input
                      value={newCard.value}
                      onChange={(e) => setNewCard({ ...newCard, value: e.target.value })}
                      placeholder="Valor (R$)"
                      className="input-field w-full text-xs mb-2"
                    />
                    <div className="flex gap-2">
                      <button onClick={() => handleAddCard(stage.id)} className="btn-primary flex-1 text-xs py-1.5">Adicionar</button>
                      <button onClick={() => setShowAddCard(null)} className="btn-secondary text-xs py-1.5">Cancelar</button>
                    </div>
                  </div>
                ) : (
                  <button
                    onClick={() => setShowAddCard(stage.id)}
                    className="w-full p-2 rounded-lg border border-dashed border-dark-600 text-dark-500 hover:border-zap-500/50 hover:text-zap-400 hover:bg-zap-500/5 transition-all text-xs flex items-center justify-center gap-1"
                  >
                    <Plus className="w-3.5 h-3.5" /> Adicionar card
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
