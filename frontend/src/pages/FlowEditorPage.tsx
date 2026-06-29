import { useEffect, useState, useCallback, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { flowsApi } from '../api';
import { Flow } from '../types';
import {
  ArrowLeft, Save, Play, Pause, Plus, Trash2, MessageSquare, Clock, GitBranch,
  Bot, Zap, ChevronRight, Settings, ToggleRight, ToggleLeft,
} from 'lucide-react';
import toast from 'react-hot-toast';

interface FlowNode {
  id: string;
  type: string;
  x: number;
  y: number;
  data: Record<string, any>;
}

interface FlowEdge {
  id: string;
  source: string;
  target: string;
  label?: string;
}

const nodeTypes = [
  { type: 'startNode', label: 'Início', icon: Zap, color: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30' },
  { type: 'message', label: 'Enviar Mensagem', icon: MessageSquare, color: 'bg-zap-500/10 text-zap-400 border-zap-500/30' },
  { type: 'delay', label: 'Aguardar', icon: Clock, color: 'bg-yellow-500/10 text-yellow-400 border-yellow-500/30' },
  { type: 'condition', label: 'Condição', icon: GitBranch, color: 'bg-purple-500/10 text-purple-400 border-purple-500/30' },
  { type: 'ai', label: 'Resposta IA', icon: Bot, color: 'bg-brand-500/10 text-brand-400 border-brand-500/30' },
  { type: 'action', label: 'Ação', icon: Zap, color: 'bg-orange-500/10 text-orange-400 border-orange-500/30' },
];

export default function FlowEditorPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [flow, setFlow] = useState<Flow | null>(null);
  const [nodes, setNodes] = useState<FlowNode[]>([]);
  const [edges, setEdges] = useState<FlowEdge[]>([]);
  const [selectedNode, setSelectedNode] = useState<FlowNode | null>(null);
  const [dragging, setDragging] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const canvasRef = useRef<HTMLDivElement>(null);

  useEffect(() => { loadFlow(); }, [id]);

  const loadFlow = async () => {
    try {
      const { data } = await flowsApi.get(id!);
      setFlow(data);
      const rawNodes = typeof data.nodes === 'string' ? JSON.parse(data.nodes) : (data.nodes || []);
      const rawEdges = typeof data.edges === 'string' ? JSON.parse(data.edges) : (data.edges || []);
      setNodes(rawNodes.map((n: any) => ({ id: n.id, type: n.type, x: n.position?.x || 0, y: n.position?.y || 0, data: n.data || {} })));
      setEdges(rawEdges.map((e: any) => ({ id: e.id, source: e.source, target: e.target, label: e.label })));
    } catch { toast.error('Erro ao carregar fluxo'); }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await flowsApi.update(id!, {
        nodes: nodes.map((n) => ({ id: n.id, type: n.type, position: { x: n.x, y: n.y }, data: n.data })),
        edges,
      });
      toast.success('Fluxo salvo!');
    } catch { toast.error('Erro ao salvar'); }
    finally { setSaving(false); }
  };

  const addNode = (type: string) => {
    const node: FlowNode = {
      id: `${type}-${Date.now()}`,
      type,
      x: 400 + Math.random() * 200,
      y: 200 + Math.random() * 200,
      data: {
        label: nodeTypes.find((n) => n.type === type)?.label || type,
        message: type === 'message' ? 'Nova mensagem...' : undefined,
        delay: type === 'delay' ? 5 : undefined,
        condition: type === 'condition' ? '' : undefined,
      },
    };
    setNodes([...nodes, node]);
    setSelectedNode(node);
  };

  const updateNodeData = (nodeId: string, data: Record<string, any>) => {
    setNodes(nodes.map((n) => n.id === nodeId ? { ...n, data: { ...n.data, ...data } } : n));
    if (selectedNode?.id === nodeId) {
      setSelectedNode({ ...selectedNode, data: { ...selectedNode.data, ...data } });
    }
  };

  const deleteNode = (nodeId: string) => {
    setNodes(nodes.filter((n) => n.id !== nodeId));
    setEdges(edges.filter((e) => e.source !== nodeId && e.target !== nodeId));
    if (selectedNode?.id === nodeId) setSelectedNode(null);
  };

  const connectNodes = (sourceId: string) => {
    // Simple connect: find next unconnected or prompt
    const existingTargets = edges.filter((e) => e.source === sourceId).map((e) => e.target);
    const available = nodes.filter((n) => n.id !== sourceId && !existingTargets.includes(n.id));
    if (available.length > 0) {
      const target = available[0];
      setEdges([...edges, { id: `e-${Date.now()}`, source: sourceId, target: target.id }]);
      toast.success('Conexão criada!');
    }
  };

  const handleNodeDrag = (nodeId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const startX = e.clientX;
    const startY = e.clientY;
    const node = nodes.find((n) => n.id === nodeId);
    if (!node) return;
    const origX = node.x;
    const origY = node.y;

    const onMove = (me: MouseEvent) => {
      setNodes((prev) => prev.map((n) =>
        n.id === nodeId ? { ...n, x: origX + (me.clientX - startX), y: origY + (me.clientY - startY) } : n
      ));
    };
    const onUp = () => {
      document.removeEventListener('mousemove', onMove);
      document.removeEventListener('mouseup', onUp);
    };
    document.addEventListener('mousemove', onMove);
    document.addEventListener('mouseup', onUp);
  };

  const getNodeIcon = (type: string) => {
    const found = nodeTypes.find((n) => n.type === type);
    return found?.icon || MessageSquare;
  };

  const getNodeColor = (type: string) => {
    return nodeTypes.find((n) => n.type === type)?.color || 'bg-dark-700 text-dark-300 border-dark-600';
  };

  return (
    <div className="flex h-[calc(100vh-7rem)] -m-6 animate-fade-in">
      {/* Toolbar */}
      <div className="w-64 border-r border-dark-700/50 bg-dark-900/50 flex flex-col">
        <div className="p-4 border-b border-dark-700/50">
          <button onClick={() => navigate('/flows')} className="btn-ghost flex items-center gap-2 text-sm mb-3">
            <ArrowLeft className="w-4 h-4" /> Voltar
          </button>
          <h3 className="text-sm font-display font-bold text-white truncate">{flow?.name || 'Carregando...'}</h3>
          <div className="flex items-center gap-2 mt-2">
            <button onClick={handleSave} disabled={saving} className="btn-primary flex-1 text-xs py-2">
              {saving ? 'Salvando...' : 'Salvar'}
            </button>
          </div>
        </div>

        <div className="p-4 flex-1 overflow-y-auto">
          <p className="text-xs font-semibold text-dark-400 uppercase tracking-wider mb-3">Nós</p>
          <div className="space-y-2">
            {nodeTypes.map((nt) => (
              <button
                key={nt.type}
                onClick={() => addNode(nt.type)}
                className="w-full flex items-center gap-3 p-3 rounded-xl border border-dark-700/50 hover:border-dark-600 bg-dark-800/50 hover:bg-dark-800 transition-all text-left"
              >
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${nt.color}`}>
                  <nt.icon className="w-4 h-4" />
                </div>
                <span className="text-sm text-dark-200">{nt.label}</span>
              </button>
            ))}
          </div>

          {/* Node Properties */}
          {selectedNode && (
            <div className="mt-6 p-4 rounded-xl border border-dark-700/50 bg-dark-800/50">
              <div className="flex items-center justify-between mb-3">
                <p className="text-xs font-semibold text-dark-400 uppercase tracking-wider">Propriedades</p>
                <button onClick={() => deleteNode(selectedNode.id)} className="text-dark-500 hover:text-red-400">
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
              <div className="space-y-3">
                <div>
                  <label className="text-xs text-dark-400 mb-1 block">Nome</label>
                  <input
                    value={selectedNode.data.label || ''}
                    onChange={(e) => updateNodeData(selectedNode.id, { label: e.target.value })}
                    className="input-field w-full text-xs"
                  />
                </div>
                {selectedNode.type === 'message' && (
                  <div>
                    <label className="text-xs text-dark-400 mb-1 block">Mensagem</label>
                    <textarea
                      value={selectedNode.data.message || ''}
                      onChange={(e) => updateNodeData(selectedNode.id, { message: e.target.value })}
                      className="input-field w-full text-xs h-20 resize-none"
                    />
                  </div>
                )}
                {selectedNode.type === 'delay' && (
                  <div>
                    <label className="text-xs text-dark-400 mb-1 block">Segundos</label>
                    <input
                      type="number"
                      value={selectedNode.data.delay || 5}
                      onChange={(e) => updateNodeData(selectedNode.id, { delay: parseInt(e.target.value) })}
                      className="input-field w-full text-xs"
                    />
                  </div>
                )}
                {selectedNode.type === 'condition' && (
                  <div>
                    <label className="text-xs text-dark-400 mb-1 block">Condição</label>
                    <input
                      value={selectedNode.data.condition || ''}
                      onChange={(e) => updateNodeData(selectedNode.id, { condition: e.target.value })}
                      placeholder="ex: mensagem contém 'plano'"
                      className="input-field w-full text-xs"
                    />
                  </div>
                )}
                {selectedNode.type === 'ai' && (
                  <div>
                    <label className="text-xs text-dark-400 mb-1 block">Prompt do Assistente</label>
                    <textarea
                      value={selectedNode.data.prompt || ''}
                      onChange={(e) => updateNodeData(selectedNode.id, { prompt: e.target.value })}
                      placeholder="Instruções para a IA..."
                      className="input-field w-full text-xs h-20 resize-none"
                    />
                  </div>
                )}
                <button onClick={() => connectNodes(selectedNode.id)} className="btn-secondary w-full text-xs py-2">
                  <Plus className="w-3 h-3 mr-1 inline" /> Conectar a próximo nó
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Canvas */}
      <div ref={canvasRef} className="flex-1 relative overflow-auto bg-dark-950" style={{ backgroundImage: 'radial-gradient(circle, #1e293b 1px, transparent 1px)', backgroundSize: '24px 24px' }}>
        {/* Nodes */}
        {nodes.map((node) => {
          const Icon = getNodeIcon(node.type);
          const isSelected = selectedNode?.id === node.id;
          return (
            <div
              key={node.id}
              className={`absolute cursor-move select-none transition-shadow ${
                isSelected ? 'ring-2 ring-zap-500 shadow-lg shadow-zap-500/20' : ''
              }`}
              style={{ left: node.x, top: node.y }}
              onClick={(e) => { e.stopPropagation(); setSelectedNode(node); }}
              onMouseDown={(e) => handleNodeDrag(node.id, e)}
            >
              <div className={`w-48 rounded-xl border p-3 bg-dark-800/90 backdrop-blur-sm ${getNodeColor(node.type)}`}>
                <div className="flex items-center gap-2 mb-1">
                  <Icon className="w-4 h-4" />
                  <span className="text-xs font-semibold text-white truncate">{node.data.label}</span>
                </div>
                {node.data.message && (
                  <p className="text-[10px] text-dark-400 truncate mt-1">{node.data.message}</p>
                )}
                {node.data.delay && (
                  <p className="text-[10px] text-dark-400 mt-1">⏳ {node.data.delay}s</p>
                )}
                {node.type === 'start' && (
                  <div className="text-[10px] text-zap-400 mt-1">Gatilho: {flow?.triggerValue}</div>
                )}
              </div>
              {/* Output handle */}
              <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 w-4 h-4 rounded-full bg-dark-600 border-2 border-dark-800 hover:bg-zap-500 transition-colors cursor-crosshair" />
              {/* Input handle */}
              <div className="absolute -top-2 left-1/2 -translate-x-1/2 w-4 h-4 rounded-full bg-dark-600 border-2 border-dark-800" />
            </div>
          );
        })}

        {/* Edges (simplified SVG lines) */}
        <svg className="absolute inset-0 w-full h-full pointer-events-none">
          {edges.map((edge) => {
            const source = nodes.find((n) => n.id === edge.source);
            const target = nodes.find((n) => n.id === edge.target);
            if (!source || !target) return null;
            const sx = source.x + 96;
            const sy = source.y + 40;
            const tx = target.x + 96;
            const ty = target.y;
            return (
              <g key={edge.id}>
                <path
                  d={`M ${sx} ${sy} C ${sx} ${sy + 60}, ${tx} ${ty - 60}, ${tx} ${ty}`}
                  stroke="#25D366" strokeWidth="2" fill="none" strokeDasharray={edge.label ? '5,5' : 'none'}
                />
                {edge.label && (
                  <text x={(sx + tx) / 2} y={(sy + ty) / 2} fill="#94a3b8" fontSize="10" textAnchor="middle">
                    {edge.label}
                  </text>
                )}
              </g>
            );
          })}
        </svg>

        {nodes.length === 0 && (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="text-center">
              <GitBranch className="w-12 h-12 text-dark-600 mx-auto mb-3" />
              <p className="text-dark-400 text-sm">Arraste nós da barra lateral para começar</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
