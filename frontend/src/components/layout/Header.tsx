import { useLocation } from 'react-router-dom';
import { Search, Bell, MessageSquare, Plus, Sun, Moon } from 'lucide-react';
import { useAuthStore, useAppStore } from '../../store';

const pageTitles: Record<string, { title: string; subtitle: string }> = {
  '/': { title: 'Dashboard', subtitle: 'Visão geral do seu negócio' },
  '/whatsapp': { title: 'WhatsApp', subtitle: 'Gerenciar números conectados' },
  '/conversations': { title: 'Conversas', subtitle: 'Atendimento em tempo real' },
  '/flows': { title: 'Automações', subtitle: 'Construtor de fluxos inteligentes' },
  '/crm': { title: 'CRM Kanban', subtitle: 'Pipeline de vendas' },
  '/campaigns': { title: 'Disparos em Massa', subtitle: 'Campanhas e envios' },
  '/contacts': { title: 'Contatos', subtitle: 'Agenda de leads e clientes' },
  '/settings': { title: 'Configurações', subtitle: 'Personalizar sua conta' },
};

export default function Header() {
  const location = useLocation();
  const user = useAuthStore((s) => s.user);
  const { theme, toggleTheme } = useAppStore();
  const basePath = '/' + (location.pathname.split('/')[1] || '');
  const page = pageTitles[basePath] || { title: 'ZapFlow', subtitle: '' };

  return (
    <header className="h-16 border-b border-dark-700/50 bg-dark-900/50 backdrop-blur-xl flex items-center justify-between px-6 sticky top-0 z-40">
      <div>
        <h2 className="text-lg font-heading font-bold text-white">{page.title}</h2>
        <p className="text-xs text-dark-400">{page.subtitle}</p>
      </div>

      <div className="flex items-center gap-3">
        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-dark-500" />
          <input
            type="text"
            placeholder="Buscar..."
            className="input-field pl-10 pr-4 py-2 w-64 text-sm"
          />
        </div>

        {/* Quick Action */}
        <button className="btn-primary flex items-center gap-2 text-sm">
          <Plus className="w-4 h-4" />
          <span className="hidden sm:inline">Nova Ação</span>
        </button>

        {/* Notifications */}
        <button className="relative p-2 rounded-lg hover:bg-dark-700/50 transition-colors">
          <Bell className="w-5 h-5 text-dark-400" />
          <span className="absolute top-1 right-1 w-2 h-2 bg-zap-500 rounded-full animate-pulse" />
        </button>

        {/* Theme Toggle */}
        <button
          onClick={toggleTheme}
          className="p-2 rounded-lg hover:bg-dark-700/50 transition-colors text-dark-400 hover:text-dark-200"
          title={theme === 'dark' ? 'Modo claro' : 'Modo escuro'}
        >
          {theme === 'dark' ? (
            <Sun className="w-5 h-5" />
          ) : (
            <Moon className="w-5 h-5" />
          )}
        </button>

        {/* WhatsApp Status */}
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-dark-800/50 border border-dark-700/50">
          <MessageSquare className="w-4 h-4 text-zap-400" />
          <span className="text-xs font-medium text-zap-400">Online</span>
        </div>
      </div>
    </header>
  );
}
