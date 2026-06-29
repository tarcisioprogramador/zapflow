import { NavLink, useLocation } from 'react-router-dom';
import { useAppStore, useAuthStore } from '../../store';
import {
  LayoutDashboard, MessageSquare, MessagesSquare, GitBranch, Columns3,
  Send, Users, Settings, Zap, ChevronLeft, ChevronRight, LogOut, Bot, X, Menu, BookOpen,
} from 'lucide-react';

const navItems = [
  { to: '/', icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/whatsapp', icon: MessageSquare, label: 'WhatsApp' },
  { to: '/conversations', icon: MessagesSquare, label: 'Conversas' },
  { to: '/flows', icon: GitBranch, label: 'Automações' },
  { to: '/crm', icon: Columns3, label: 'CRM Kanban' },
  { to: '/campaigns', icon: Send, label: 'Disparos' },
  { to: '/contacts', icon: Users, label: 'Contatos' },
  { to: '/knowledge-base', icon: BookOpen, label: 'Base de Conhecimento' },
  { to: '/settings', icon: Settings, label: 'Configurações' },
];

export default function Sidebar() {
  const { sidebarOpen, toggleSidebar, setSidebarOpen } = useAppStore();
  const user = useAuthStore((s) => s.user);
  const logout = useAuthStore((s) => s.logout);
  const location = useLocation();

  return (
    <>
      {/* Mobile hamburger button */}
      <button
        onClick={() => setSidebarOpen(true)}
        className="fixed top-4 left-4 z-50 lg:hidden p-2 rounded-xl bg-dark-800 border border-dark-700 shadow-lg"
      >
        <Menu className="w-5 h-5 text-dark-300" />
      </button>

      {/* Mobile overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed left-0 top-0 h-full bg-dark-900 border-r border-dark-700/50 flex flex-col z-50 transition-all duration-300 ${
          sidebarOpen ? 'w-64 translate-x-0' : 'w-64 -translate-x-full lg:w-20 lg:translate-x-0'
        }`}
      >
        {/* Logo */}
        <div className="h-16 flex items-center justify-between px-5 border-b border-dark-700/50">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-zap-500 to-brand-600 flex items-center justify-center shadow-lg shadow-zap-500/20">
              <Zap className="w-5 h-5 text-white" />
            </div>
            {(sidebarOpen || typeof window !== 'undefined') && (
              <h1 className="text-lg font-display font-bold text-white tracking-tight hidden lg:block">
                Zap<span className="text-zap-400">Flow</span>
              </h1>
            )}
          </div>
          <button
            onClick={() => setSidebarOpen(false)}
            className="lg:hidden p-1 rounded-lg hover:bg-dark-700 text-dark-400"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 py-4 px-3 space-y-1 overflow-y-auto">
          {navItems.map((item) => {
            const isActive =
              item.to === '/' ? location.pathname === '/' : location.pathname.startsWith(item.to);
            return (
              <NavLink
                key={item.to}
                to={item.to}
                onClick={() => { if (window.innerWidth < 1024) setSidebarOpen(false); }}
                className={`sidebar-item group relative ${isActive ? 'active' : ''}`}
                title={!sidebarOpen ? item.label : undefined}
              >
                <item.icon
                  className={`w-5 h-5 flex-shrink-0 ${isActive ? 'text-zap-400' : 'text-dark-400 group-hover:text-dark-200'}`}
                />
                {sidebarOpen && <span className="animate-fade-in whitespace-nowrap">{item.label}</span>}
                {isActive && <div className="absolute left-0 w-0.5 h-6 bg-zap-500 rounded-r-full" />}
              </NavLink>
            );
          })}
        </nav>

        {/* AI Badge */}
        {sidebarOpen && (
          <div className="mx-3 mb-3 p-3 rounded-xl bg-gradient-to-r from-brand-500/10 to-zap-500/10 border border-brand-500/20">
            <div className="flex items-center gap-2">
              <Bot className="w-5 h-5 text-brand-400" />
              <div>
                <p className="text-xs font-semibold text-dark-200">Assistente IA</p>
                <p className="text-[10px] text-dark-400">Ativo • Pronto</p>
              </div>
            </div>
          </div>
        )}

        {/* User + Collapse */}
        <div className="border-t border-dark-700/50 p-3">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-full bg-gradient-to-br from-zap-500 to-brand-600 flex items-center justify-center text-white text-sm font-bold flex-shrink-0">
              {user?.name?.charAt(0) || 'U'}
            </div>
            {sidebarOpen && (
              <div className="flex-1 min-w-0 animate-fade-in">
                <p className="text-sm font-medium text-dark-100 truncate">{user?.name}</p>
                <p className="text-xs text-dark-400 truncate">{user?.role}</p>
              </div>
            )}
            <div className="flex gap-1">
              <button
                onClick={toggleSidebar}
                className="p-1.5 rounded-lg hover:bg-dark-700/50 text-dark-400 hover:text-dark-200 transition-colors hidden lg:flex"
              >
                {sidebarOpen ? <ChevronLeft className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
              </button>
              {sidebarOpen && (
                <button onClick={logout} className="p-1.5 rounded-lg hover:bg-red-500/10 text-dark-400 hover:text-red-400 transition-colors">
                  <LogOut className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>
        </div>
      </aside>
    </>
  );
}
