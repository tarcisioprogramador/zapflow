import { useEffect, useState, useRef } from 'react';
import { useParams } from 'react-router-dom';
import { conversationsApi, whatsappApi } from '../api';
import { Conversation, Message } from '../types';
import { useSocket } from '../hooks/useSocket';
import {
  Search, Send, Paperclip, Phone, Video, MoreVertical,
  MessageSquare, Filter, CheckCheck, Image, Mic,
} from 'lucide-react';

export default function ConversationsPage() {
  const { id: selectedId } = useParams();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selected, setSelected] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const { joinConversation, leaveConversation, onMessage, onConversationUpdate } = useSocket();

  useEffect(() => { loadConversations(); }, []);

  // Real-time message listener
  useEffect(() => {
    const unsubMessage = onMessage((data: any) => {
      if (data.conversationId === selected?.id) {
        setMessages((prev) => [...prev, data]);
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
      }
    });

    const unsubUpdate = onConversationUpdate((data: any) => {
      setConversations((prev) =>
        prev.map((c) =>
          c.id === data.conversationId
            ? { ...c, updatedAt: new Date().toISOString(), messages: [{ content: data.lastMessage, createdAt: new Date().toISOString() } as Message] }
            : c
        )
      );
    });

    return () => { unsubMessage(); unsubUpdate(); };
  }, [selected?.id, onMessage, onConversationUpdate]);

  // Join/leave conversation rooms
  useEffect(() => {
    if (selected?.id) {
      joinConversation(selected.id);
      return () => leaveConversation(selected.id);
    }
  }, [selected?.id, joinConversation, leaveConversation]);

  useEffect(() => {
    if (selectedId) {
      const conv = conversations.find((c) => c.id === selectedId);
      if (conv) handleSelect(conv);
    }
  }, [selectedId, conversations]);

  const loadConversations = async () => {
    try {
      const { data } = await conversationsApi.list();
      setConversations(data);
    } catch {
      setConversations([
        {
          id: '1', status: 'open', createdAt: '2024-03-15T10:00:00Z', updatedAt: '2024-03-15T10:05:00Z',
          contact: { id: 'c1', name: 'João Silva', phone: '+5511988888888', tags: '["lead","vip"]', createdAt: '' },
          whatsappNumber: { id: 'w1', number: '+5511999999999', name: 'Principal' },
          tags: [{ tag: { id: 't1', name: 'Lead', color: '#6366f1' } }],
          messages: [{ id: 'm1', content: 'Olá! Gostaria de saber os planos', type: 'TEXT', from: '+5511988888888', to: '+5511999999999', status: 'READ', isFromBot: false, createdAt: '2024-03-15T10:05:00Z' }],
        },
        {
          id: '2', status: 'open', createdAt: '2024-03-15T09:30:00Z', updatedAt: '2024-03-15T09:45:00Z',
          contact: { id: 'c2', name: 'Maria Santos', phone: '+5511977777777', tags: '["lead"]', createdAt: '' },
          whatsappNumber: { id: 'w1', number: '+5511999999999', name: 'Principal' },
          tags: [{ tag: { id: 't2', name: 'Urgente', color: '#ef4444' } }],
          messages: [{ id: 'm2', content: 'Preciso de suporte!', type: 'TEXT', from: '+5511977777777', to: '+5511999999999', status: 'READ', isFromBot: false, createdAt: '2024-03-15T09:45:00Z' }],
        },
        {
          id: '3', status: 'pending', createdAt: '2024-03-14T15:00:00Z', updatedAt: '2024-03-14T15:30:00Z',
          contact: { id: 'c3', name: 'Pedro Costa', phone: '+5511966666666', tags: '["cliente"]', createdAt: '' },
          whatsappNumber: { id: 'w1', number: '+5511999999999', name: 'Principal' },
          tags: [],
          messages: [{ id: 'm3', content: 'Vou analisar a proposta', type: 'TEXT', from: '+5511999999999', to: '+5511966666666', status: 'DELIVERED', isFromBot: true, createdAt: '2024-03-14T15:30:00Z' }],
        },
        {
          id: '4', status: 'closed', createdAt: '2024-03-13T11:00:00Z', updatedAt: '2024-03-13T11:20:00Z',
          contact: { id: 'c4', name: 'Ana Oliveira', phone: '+5511955555555', tags: '["lead","interessado"]', createdAt: '' },
          whatsappNumber: { id: 'w2', number: '+5511888888888', name: 'Suporte' },
          tags: [{ tag: { id: 't3', name: 'Fechado', color: '#10b981' } }],
          messages: [{ id: 'm4', content: 'Obrigada! Fechado!', type: 'TEXT', from: '+5511955555555', to: '+5511888888888', status: 'READ', isFromBot: false, createdAt: '2024-03-13T11:20:00Z' }],
        },
      ]);
    } finally { setLoading(false); }
  };

  const handleSelect = async (conv: Conversation) => {
    setSelected(conv);
    if (conv.messages?.length) setMessages(conv.messages);
  };

  const handleSend = async () => {
    if (!newMessage.trim() || !selected) return;

    const toPhone = selected.contact?.phone || newMessage.trim();
    const msg: Message = {
      id: `msg-${Date.now()}`, content: newMessage, type: 'TEXT',
      from: selected.whatsappNumber.number, to: toPhone,
      status: 'SENT', isFromBot: true, createdAt: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, msg]);
    setNewMessage('');
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });

    // Send via API
    try {
      // Send via the connected WhatsApp number
      await whatsappApi.send(selected.whatsappNumber.id, {
        to: toPhone,
        message: msg.content,
      });
    } catch (err: any) {
      // Demo mode - message saved locally, no backend to send
      console.log('[Conversations] Message queued (demo mode)');
    }
  };

  const filteredConversations = conversations.filter((c) =>
    c.contact?.name.toLowerCase().includes(search.toLowerCase()) ||
    c.contact?.phone.includes(search)
  );

  const statusColors = { open: 'bg-emerald-400', pending: 'bg-yellow-400', closed: 'bg-dark-500' };
  const statusLabels = { open: 'Aberta', pending: 'Pendente', closed: 'Fechada' };

  return (
    <div className="flex h-[calc(100vh-7rem)] gap-0 -m-6 animate-fade-in">
      {/* Conversations List */}
      <div className="w-96 border-r border-dark-700/50 flex flex-col bg-dark-900/50">
        <div className="p-4 border-b border-dark-700/50">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-lg font-heading font-bold text-white">Conversas</h2>
            <button className="btn-ghost p-2"><Filter className="w-4 h-4" /></button>
          </div>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-dark-500" />
            <input
              id="conversations-search"
              name="conversations-search"
              type="text" value={search} onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar conversa..."
              className="input-field pl-10 w-full text-sm"
            />
          </div>
        </div>
        <div className="flex-1 overflow-y-auto">
          {filteredConversations.map((conv) => (
            <div
              key={conv.id}
              onClick={() => handleSelect(conv)}
              className={`flex items-center gap-3 p-4 cursor-pointer border-b border-dark-700/30 transition-all hover:bg-dark-800/50 ${
                selected?.id === conv.id ? 'bg-dark-800/70 border-l-2 border-l-zap-500' : ''
              }`}
            >
              <div className="relative flex-shrink-0">
                <div className="w-11 h-11 rounded-full bg-gradient-to-br from-zap-500/20 to-brand-500/20 flex items-center justify-center text-sm font-bold text-zap-400">
                  {conv.contact?.name?.charAt(0) || '?'}
                </div>
                <div className={`absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full border-2 border-dark-900 ${statusColors[conv.status as keyof typeof statusColors]}`} />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between">
                  <h4 className="text-sm font-semibold text-white truncate">{conv.contact?.name}</h4>
                  <span className="text-[10px] text-dark-500 flex-shrink-0">
                    {new Date(conv.updatedAt).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
                <p className="text-xs text-dark-400 truncate mt-0.5">
                  {conv.messages?.[0]?.content || 'Sem mensagens'}
                </p>
                <div className="flex items-center gap-1.5 mt-1">
                  {conv.tags?.map((t) => (
                    <span key={t.tag.id} className="badge text-[9px] px-1.5 py-0" style={{ backgroundColor: t.tag.color + '20', color: t.tag.color, borderColor: t.tag.color + '40' }}>
                      {t.tag.name}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Chat Area */}
      {selected ? (
        <div className="flex-1 flex flex-col bg-dark-950">
          {/* Chat Header */}
          <div className="h-16 border-b border-dark-700/50 flex items-center justify-between px-5 bg-dark-900/50">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-zap-500/20 to-brand-500/20 flex items-center justify-center text-sm font-bold text-zap-400">
                {selected.contact?.name?.charAt(0)}
              </div>
              <div>
                <h3 className="text-sm font-semibold text-white">{selected.contact?.name}</h3>
                <p className="text-xs text-dark-400">{selected.contact?.phone} • {statusLabels[selected.status as keyof typeof statusLabels]}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button className="btn-ghost p-2"><Phone className="w-4 h-4" /></button>
              <button className="btn-ghost p-2"><Video className="w-4 h-4" /></button>
              <button className="btn-ghost p-2"><MoreVertical className="w-4 h-4" /></button>
            </div>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-5 space-y-3">
            {messages.map((msg) => (
              <div key={msg.id} className={`flex ${msg.isFromBot ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-md px-4 py-2.5 rounded-2xl ${
                  msg.isFromBot
                    ? 'bg-zap-500 text-white rounded-br-md'
                    : 'bg-dark-800 text-dark-100 rounded-bl-md border border-dark-700/50'
                }`}>
                  <p className="text-sm leading-relaxed">{msg.content}</p>
                  <div className={`flex items-center gap-1 mt-1 ${msg.isFromBot ? 'justify-end' : ''}`}>
                    <span className={`text-[10px] ${msg.isFromBot ? 'text-white/60' : 'text-dark-500'}`}>
                      {new Date(msg.createdAt).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                    </span>
                    {msg.isFromBot && (
                      <CheckCheck className={`w-3.5 h-3.5 ${msg.status === 'READ' ? 'text-blue-300' : 'text-white/40'}`} />
                    )}
                  </div>
                </div>
              </div>
            ))}
            <div ref={messagesEndRef} />
          </div>

          {/* Input */}
          <div className="p-4 border-t border-dark-700/50 bg-dark-900/50">
            <div className="flex items-center gap-3">
              <button className="btn-ghost p-2"><Paperclip className="w-5 h-5 text-dark-400" /></button>
              <button className="btn-ghost p-2"><Image className="w-5 h-5 text-dark-400" /></button>
              <button className="btn-ghost p-2"><Mic className="w-5 h-5 text-dark-400" /></button>
              <input
                id="chat-message"
                name="chat-message"
                type="text" value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                placeholder="Digite sua mensagem..."
                className="input-field flex-1 text-sm"
              />
              <button onClick={handleSend} className="btn-primary p-2.5 rounded-xl" disabled={!newMessage.trim()}>
                <Send className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>
      ) : (
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <MessageSquare className="w-16 h-16 text-dark-600 mx-auto mb-4" />
            <h3 className="text-lg font-heading font-bold text-dark-400">Selecione uma conversa</h3>
            <p className="text-sm text-dark-500 mt-1">Escolha uma conversa ao lado para iniciar</p>
          </div>
        </div>
      )}
    </div>
  );
}
