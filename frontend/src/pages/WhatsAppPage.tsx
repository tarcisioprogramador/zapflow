import { useEffect, useState } from 'react';
import { whatsappApi } from '../api';
import { WhatsAppNumber } from '../types';
import {
  Plus, MessageSquare, Wifi, WifiOff, Loader2, Trash2, QrCode, Copy, RefreshCw, X, Smartphone,
} from 'lucide-react';
import toast from 'react-hot-toast';

export default function WhatsAppPage() {
  const [numbers, setNumbers] = useState<WhatsAppNumber[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [showQrModal, setShowQrModal] = useState<WhatsAppNumber | null>(null);
  const [qrCodeLoading, setQrCodeLoading] = useState(false);
  const [qrCode, setQrCode] = useState<string | null>(null);
  const [newNumber, setNewNumber] = useState({ number: '', name: '' });
  const [connecting, setConnecting] = useState(false);
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
    if (!newNumber.name || !newNumber.number) {
      toast.error('Preencha nome e número');
      return;
    }
    setConnecting(true);
    try {
      const { data } = await whatsappApi.connect(newNumber);
      setNumbers((prev) => [data, ...prev]);
      setShowModal(false);
      setNewNumber({ number: '', name: '' });

      // If QR code is returned, show it
      if (data.qrcode) {
        setQrCode(normalizeQrCode(data.qrcode));
        setShowQrModal(data);
      } else {
        toast.success('Número adicionado! Conectando...');
        // Poll for QR code / status updates
        pollForStatus(data.id, data);
      }
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Erro ao conectar');
    } finally {
      setConnecting(false);
    }
  };

  const pollForStatus = async (id: string, numberData?: WhatsAppNumber) => {
    const maxAttempts = 20;
    let attempts = 0;
    const displayNum = numberData;
    const interval = setInterval(async () => {
      attempts++;
      try {
        const { data } = await whatsappApi.getQrCode(id);
        if (data.qrcode) {
          setQrCode(normalizeQrCode(data.qrcode));
          if (displayNum) setShowQrModal(displayNum);
          clearInterval(interval);
        } else if (data.status === 'CONNECTED') {
          loadNumbers();
          clearInterval(interval);
        }
      } catch {
        // ignore polling errors
      }
      if (attempts >= maxAttempts) {
        clearInterval(interval);
        loadNumbers();
      }
    }, 3000);
  };

  // Strip any existing data: prefix so we can safely prepend it
  const normalizeQrCode = (base64: string): string => {
    return base64.replace(/^data:image\/[a-z]+;base64,/, '');
  };

  const handleRefreshQrCode = async (num: WhatsAppNumber) => {
    setQrCodeLoading(true);
    try {
      const { data } = await whatsappApi.getQrCode(num.id);
      if (data.qrcode) {
        setQrCode(normalizeQrCode(data.qrcode));
      } else {
        toast.error('QR Code ainda não disponível');
      }
    } catch {
      toast.error('Erro ao buscar QR Code');
    } finally {
      setQrCodeLoading(false);
    }
  };

  const handleDisconnect = async (id: string) => {
    if (!confirm('Desconectar este número?\nO número será desconectado mas permanecerá na lista.')) return;
    try {
      await whatsappApi.disconnect(id);
      setNumbers(numbers.map(n => n.id === id ? { ...n, status: 'DISCONNECTED', qrcode: '' } : n));
      if (showQrModal?.id === id) {
        setShowQrModal(null);
        setQrCode(null);
      }
      toast.success('Número desconectado');
    } catch {
      toast.error('Erro ao desconectar');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Remover este número permanentemente?')) return;
    try {
      await whatsappApi.delete(id);
      setNumbers(numbers.filter((n) => n.id !== id));
      if (showQrModal?.id === id) {
        setShowQrModal(null);
        setQrCode(null);
      }
      toast.success('Número removido');
    } catch {
      toast.error('Erro ao remover');
    }
  };

  const handleCopyNumber = (number: string) => {
    navigator.clipboard.writeText(number);
    toast.success('Número copiado!');
  };

  const statusConfig: Record<string, { label: string; icon: any; color: string; bg: string; dot: string }> = {
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
          const status = statusConfig[num.status] || statusConfig.DISCONNECTED;
          const Icon = status.icon;
          return (
            <div key={num.id} className="glass-card p-6 hover:border-dark-600/60 transition-all group">
              {/* Trial Expired Banner */}
              {num.trialExpired && (
                <div className="mb-4 px-3 py-2 rounded-lg bg-red-500/10 border border-red-500/30 text-center">
                  <p className="text-xs font-semibold text-red-400">⏰ Trial expirado</p>
                  <p className="text-[10px] text-red-400/70 mt-0.5">Faça upgrade do plano para continuar usando</p>
                </div>
              )}
              {/* Trial Remaining Banner */}
              {num.trialRemaining && !num.trialExpired && (
                <div className="mb-4 px-3 py-2 rounded-lg bg-yellow-500/10 border border-yellow-500/30 text-center">
                  <p className="text-xs font-semibold text-yellow-400">⏳ Período de teste</p>
                  <p className="text-[10px] text-yellow-400/70 mt-0.5">{num.trialRemaining}</p>
                </div>
              )}
              <div className="flex items-start justify-between mb-4">
                <div className="w-12 h-12 rounded-xl bg-zap-500/10 flex items-center justify-center">
                  <MessageSquare className="w-6 h-6 text-zap-400" />
                </div>
                <div className={`flex items-center gap-2 ${status.bg} px-3 py-1.5 rounded-full`}>
                  <div className={`w-2 h-2 rounded-full ${status.dot} ${num.status === 'CONNECTING' ? 'animate-pulse' : ''}`} />
                  <span className={`text-xs font-medium ${status.color}`}>{status.label}</span>
                </div>
              </div>
              <h3 className="text-lg font-heading font-bold text-white mb-1">{num.name}</h3>
              <p className="text-sm font-mono text-dark-300 mb-4">
                {num.number}
                <button
                  onClick={() => handleCopyNumber(num.number)}
                  className="ml-2 inline-flex text-dark-500 hover:text-zap-400 transition-colors"
                  title="Copiar número"
                >
                  <Copy className="w-3.5 h-3.5" />
                </button>
              </p>
              <div className="flex gap-2">
                {num.status === 'DISCONNECTED' && num.instanceId && (
                  <button
                    onClick={() => handleRefreshQrCode(num)}
                    className="btn-secondary flex-1 text-xs py-2"
                  >
                    <QrCode className="w-3.5 h-3.5 mr-1.5 inline" /> Reconectar
                  </button>
                )}
                {num.status === 'CONNECTED' && (
                  <button
                    onClick={() => handleDisconnect(num.id)}
                    className="btn-secondary flex-1 text-xs py-2 hover:border-red-500/50 hover:text-red-400"
                  >
                    <WifiOff className="w-3.5 h-3.5 mr-1.5 inline" /> Desconectar
                  </button>
                )}
                {(num.status === 'CONNECTING' || (!num.instanceId && num.status === 'DISCONNECTED')) && (
                  <button
                    onClick={() => {
                      setQrCode(null);
                      setShowQrModal(num);
                      handleRefreshQrCode(num);
                    }}
                    className="btn-secondary flex-1 text-xs py-2"
                  >
                    <QrCode className="w-3.5 h-3.5 mr-1.5 inline" /> QR Code
                  </button>
                )}
                <button
                  onClick={() => handleDelete(num.id)}
                  className="btn-ghost text-dark-500 hover:text-red-400 p-2"
                  title="Remover número"
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

      {/* QR Code Modal */}
      {showQrModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 animate-fade-in">
          <div className="glass-card w-full max-w-sm p-6 mx-4 animate-slide-up text-center">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-heading font-bold text-white">Conectar WhatsApp</h3>
              <button
                onClick={() => { setShowQrModal(null); setQrCode(null); }}
                className="btn-ghost p-1.5 text-dark-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-sm text-dark-400 mb-4">
              Escaneie o QR Code abaixo com o WhatsApp do seu celular
            </p>

            {qrCodeLoading && !qrCode ? (
              <div className="w-64 h-64 mx-auto rounded-xl bg-dark-800 flex items-center justify-center">
                <Loader2 className="w-8 h-8 text-zap-400 animate-spin" />
              </div>
            ) : qrCode ? (
              <div className="space-y-4">
                <div className="w-64 h-64 mx-auto rounded-xl bg-white p-3 flex items-center justify-center shadow-lg">
                  <img
                    src={`data:image/png;base64,${qrCode}`}
                    alt="QR Code WhatsApp"
                    className="w-full h-full object-contain"
                  />
                </div>
                <div className="flex items-center justify-center gap-4 p-3 rounded-lg bg-dark-800/50">
                  <Smartphone className="w-5 h-5 text-zap-400" />
                  <span className="text-sm text-dark-300">
                    <strong className="text-white">{showQrModal.name}</strong> — {showQrModal.number}
                  </span>
                </div>
                <button
                  onClick={() => handleRefreshQrCode(showQrModal)}
                  disabled={qrCodeLoading}
                  className="btn-secondary text-xs py-2 px-4"
                >
                  <RefreshCw className={`w-3.5 h-3.5 mr-1.5 inline ${qrCodeLoading ? 'animate-spin' : ''}`} />
                  Atualizar QR Code
                </button>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="w-64 h-64 mx-auto rounded-xl bg-dark-800 flex items-center justify-center">
                  <div className="text-center">
                    <Loader2 className="w-8 h-8 text-zap-400 animate-spin mx-auto mb-3" />
                    <p className="text-sm text-dark-400">Aguardando QR Code...</p>
                  </div>
                </div>
                <button
                  onClick={() => handleRefreshQrCode(showQrModal)}
                  disabled={qrCodeLoading}
                  className="btn-secondary text-xs py-2 px-4"
                >
                  <RefreshCw className="w-3.5 h-3.5 mr-1.5 inline" /> Tentar novamente
                </button>
              </div>
            )}

            <div className="mt-4 p-3 rounded-lg bg-dark-800/30 text-left">
              <h4 className="text-xs font-semibold text-dark-300 mb-2">Instruções:</h4>
              <ol className="text-xs text-dark-500 space-y-1.5 list-decimal list-inside">
                <li>Abra o WhatsApp no seu celular</li>
                <li>Toque em <strong className="text-dark-300">Menu</strong> ou <strong className="text-dark-300">Configurações</strong></li>
                <li>Selecione <strong className="text-dark-300">WhatsApp Web</strong></li>
                <li>Aponte a câmera para este QR Code</li>
              </ol>
            </div>
          </div>
        </div>
      )}

      {/* Connection Info */}
      <div className="glass-card p-6">
        <h3 className="text-lg font-heading font-bold text-white mb-4">Como conectar</h3>
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

      {/* Connect Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 animate-fade-in">
          <div className="glass-card w-full max-w-md p-6 mx-4 animate-slide-up">
            <h3 className="text-xl font-heading font-bold text-white mb-4">Conectar Número</h3>
            <div className="space-y-4">
              <div>
                <label htmlFor="whatsapp-name" className="block text-sm font-medium text-dark-300 mb-2">Nome</label>
                <input
                  id="whatsapp-name"
                  name="whatsapp-name"
                  type="text"
                  value={newNumber.name}
                  onChange={(e) => setNewNumber({ ...newNumber, name: e.target.value })}
                  placeholder="Ex: Atendimento, Vendas..."
                  className="input-field w-full"
                />
              </div>
              <div>
                <label htmlFor="whatsapp-number" className="block text-sm font-medium text-dark-300 mb-2">Número</label>
                <input
                  id="whatsapp-number"
                  name="whatsapp-number"
                  type="text"
                  value={newNumber.number}
                  onChange={(e) => setNewNumber({ ...newNumber, number: e.target.value })}
                  placeholder="+5511999999999"
                  className="input-field w-full font-mono"
                />
                <p className="text-xs text-dark-500 mt-1">Formato: +55DDDNÚMERO (com código do país)</p>
              </div>
              <div className="flex gap-3 mt-6">
                <button onClick={() => setShowModal(false)} className="btn-secondary flex-1">Cancelar</button>
                <button onClick={handleConnect} disabled={connecting} className="btn-primary flex-1">
                  {connecting ? (
                    <span className="flex items-center justify-center gap-2">
                      <Loader2 className="w-4 h-4 animate-spin" /> Conectando...
                    </span>
                  ) : 'Conectar'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
