import { useEffect, useState } from 'react';
import { whatsappApi } from '../api';
import { WhatsAppNumber } from '../types';
import {
  Plus, MessageSquare, Wifi, WifiOff, Loader2, Trash2, QrCode, Copy, RefreshCw,
} from 'lucide-react';
import toast from 'react-hot-toast';

export default function WhatsAppPage() {
  const [numbers, setNumbers] = useState<WhatsAppNumber[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [newNumber, setNewNumber] = useState({ number: '', name: '' });
  const [loading, setLoading] = useState(true);

  useEffect(() => { loadNumbers(); }, []);

  const loadNumbers = async () => {
    try {
      const { data } = await whatsappApi.list();
      setNumbers(data);
    } catch {
      setNumbers([
        { id: '1', number: '+5511999999999', name: 'Número Principal', status: 'CONNECTED', createdAt: '2024-01-15' },
        { id: '2', number: '+5511888888888', name: 'Suporte', status: 'CONNECTED', createdAt: '2024-02-10' },
      ]);
    } finally { setLoading(false); }
  };

  const handleConnect = async () => {
    try {
      const { data } = await whatsappApi.connect(newNumber);
      setNumbers([data, ...numbers]);
      setShowModal(false);
      setNewNumber({ number: '', name: '' });
      toast.success('Número conectado! Verificando...');
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Erro ao conectar');
    }
  };

  const handleDisconnect = async (id: string) => {
    if (!confirm('Desconectar este número?')) return;
    try {
      await whatsappApi.delete(id);
      setNumbers(numbers.filter((n) => n.id !== id));
      toast.success('Número desconectado');
    } catch {
      toast.error('Erro ao desconectar');
    }
  };

  const statusConfig = {
    CONNECTED: { label: 'Conectado', icon: Wifi, color: 'text-emerald-400', bg: 'bg-emerald-500/10', dot: 'bg-emerald-400' },
    DISCONNECTED: { label: 'Desconectado', icon: WifiOff, color: 'text-red-400', bg: 'bg-red-500/10', dot: 'bg-red-400' },
    CONNECTING: { label: 'Conectando...', icon: Loader2, color: 'text-yellow-400', bg: 'bg-yellow-500/10', dot: 'bg-yellow-400' },
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="page-header">
        <div>
          <h1 className="page-title">WhatsApp</h1>
          <p className="page-subtitle">Gerencie seus números conectados</p>
        </div>
        <button onClick={() => setShowModal(true)} className="btn-primary flex items-center gap-2">
          <Plus className="w-4 h-4" /> Conectar Número
        </button>
      </div>

      {/* Numbers Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {numbers.map((num) => {
          const status = statusConfig[num.status];
          return (
            <div key={num.id} className="glass-card p-6 hover:border-dark-600/60 transition-all group">
              <div className="flex items-start justify-between mb-4">
                <div className="w-12 h-12 rounded-xl bg-zap-500/10 flex items-center justify-center">
                  <MessageSquare className="w-6 h-6 text-zap-400" />
                </div>
                <div className={`flex items-center gap-2 ${status.bg} px-3 py-1.5 rounded-full`}>
                  <div className={`w-2 h-2 rounded-full ${status.dot} ${num.status === 'CONNECTING' ? 'animate-pulse' : ''}`} />
                  <span className={`text-xs font-medium ${status.color}`}>{status.label}</span>
                </div>
              </div>
              <h3 className="text-lg font-display font-bold text-white mb-1">{num.name}</h3>
              <p className="text-sm font-mono text-dark-300 mb-4">{num.number}</p>
              <div className="flex gap-2">
                <button className="btn-secondary flex-1 text-xs py-2">
                  <QrCode className="w-3.5 h-3.5 mr-1.5 inline" /> QR Code
                </button>
                <button
                  onClick={() => handleDisconnect(num.id)}
                  className="btn-ghost text-dark-500 hover:text-red-400 p-2"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          );
        })}

        {/* Add New */}
        <button
          onClick={() => setShowModal(true)}
          className="border-2 border-dashed border-dark-600 rounded-xl p-6 flex flex-col items-center justify-center gap-3 hover:border-zap-500/50 hover:bg-zap-500/5 transition-all group min-h-[200px]"
        >
          <div className="w-12 h-12 rounded-xl bg-dark-700 flex items-center justify-center group-hover:bg-zap-500/10 transition-colors">
            <Plus className="w-6 h-6 text-dark-400 group-hover:text-zap-400" />
          </div>
          <span className="text-sm font-medium text-dark-400 group-hover:text-zap-400">
            Conectar novo número
          </span>
        </button>
      </div>

      {/* Connection Info */}
      <div className="glass-card p-6">
        <h3 className="text-lg font-display font-bold text-white mb-4">Como conectar</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[
            { step: '1', title: 'Clique em "Conectar"', desc: 'Adicione o número de WhatsApp que deseja usar' },
            { step: '2', title: 'Escaneie o QR Code', desc: 'Abra o WhatsApp no celular e escaneie o código' },
            { step: '3', title: 'Pronto!', desc: 'Seu número está conectado e pronto para automatizar' },
          ].map((item) => (
            <div key={item.step} className="flex gap-4 p-4 rounded-xl bg-dark-800/50">
              <div className="w-8 h-8 rounded-lg bg-zap-500/10 flex items-center justify-center text-zap-400 font-bold text-sm flex-shrink-0">
                {item.step}
              </div>
              <div>
                <h4 className="text-sm font-semibold text-white mb-1">{item.title}</h4>
                <p className="text-xs text-dark-400">{item.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 animate-fade-in">
          <div className="glass-card w-full max-w-md p-6 mx-4 animate-slide-up">
            <h3 className="text-xl font-display font-bold text-white mb-4">Conectar Número</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-dark-300 mb-2">Nome</label>
                <input
                  type="text"
                  value={newNumber.name}
                  onChange={(e) => setNewNumber({ ...newNumber, name: e.target.value })}
                  placeholder="Ex: Atendimento, Vendas..."
                  className="input-field w-full"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-dark-300 mb-2">Número</label>
                <input
                  type="text"
                  value={newNumber.number}
                  onChange={(e) => setNewNumber({ ...newNumber, number: e.target.value })}
                  placeholder="+5511999999999"
                  className="input-field w-full font-mono"
                />
              </div>
              <div className="flex gap-3 mt-6">
                <button onClick={() => setShowModal(false)} className="btn-secondary flex-1">Cancelar</button>
                <button onClick={handleConnect} className="btn-primary flex-1">Conectar</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
