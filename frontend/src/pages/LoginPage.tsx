import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store';
import { authApi } from '../api';
import { Zap, Eye, EyeOff, ArrowRight, Bot, MessageSquare, GitBranch, BarChart3 } from 'lucide-react';
import toast from 'react-hot-toast';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const setAuth = useAuthStore((s) => s.setAuth);
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const { data } = await authApi.login({ email, password });
      setAuth(data.user, data.token);
      toast.success('Bem-vindo de volta!');
      navigate('/');
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Erro ao fazer login');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex">
      {/* Left - Login Form */}
      <div className="flex-1 flex items-center justify-center p-8 bg-dark-950">
        <div className="w-full max-w-md animate-fade-in">
          {/* Logo */}
          <div className="flex items-center gap-3 mb-10">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-zap-500 to-brand-600 flex items-center justify-center shadow-lg shadow-zap-500/30">
              <Zap className="w-7 h-7 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-display font-bold text-white">
                Zap<span className="text-zap-400">Flow</span>
              </h1>
              <p className="text-xs text-dark-400">Automação Inteligente</p>
            </div>
          </div>

          <h2 className="text-3xl font-display font-bold text-white mb-2">
            Bem-vindo de volta
          </h2>
          <p className="text-dark-400 mb-8">
            Entre na sua conta para gerenciar suas automações
          </p>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block text-sm font-medium text-dark-300 mb-2">Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="seu@email.com"
                className="input-field w-full"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-dark-300 mb-2">Senha</label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="input-field w-full pr-12"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-dark-500 hover:text-dark-300"
                >
                  {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
            </div>
            <button
              type="submit"
              disabled={loading}
              className="btn-primary w-full flex items-center justify-center gap-2 py-3"
            >
              {loading ? (
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <>
                  Entrar
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>

          <p className="text-center text-dark-400 text-sm mt-6">
            Não tem conta?{' '}
            <Link to="/register" className="text-zap-400 hover:text-zap-300 font-medium transition-colors">
              Criar gratuitamente
            </Link>
          </p>

          {/* Demo credentials */}
          <div className="mt-8 p-4 rounded-xl bg-dark-800/50 border border-dark-700/50">
            <p className="text-xs font-medium text-dark-400 mb-2">🧪 Conta de demonstração:</p>
            <p className="text-xs text-dark-300 font-mono">admin@zapflow.com / 123456</p>
          </div>
        </div>
      </div>

      {/* Right - Hero */}
      <div className="hidden lg:flex flex-1 items-center justify-center bg-gradient-to-br from-dark-900 via-dark-800 to-dark-900 border-l border-dark-700/30 p-12">
        <div className="max-w-lg animate-slide-in">
          <div className="grid grid-cols-2 gap-4 mb-8">
            {[
              { icon: MessageSquare, label: 'WhatsApp', desc: 'Multi-número', color: 'text-zap-400', bg: 'bg-zap-500/10' },
              { icon: Bot, label: 'IA Avançada', desc: 'Respostas inteligentes', color: 'text-brand-400', bg: 'bg-brand-500/10' },
              { icon: GitBranch, label: 'Automações', desc: 'Fluxos visuais', color: 'text-purple-400', bg: 'bg-purple-500/10' },
              { icon: BarChart3, label: 'Analytics', desc: 'Métricas reais', color: 'text-orange-400', bg: 'bg-orange-500/10' },
            ].map((feature) => (
              <div
                key={feature.label}
                className="glass-card p-4 hover:border-dark-600/60 transition-all duration-300 group"
              >
                <div className={`w-10 h-10 rounded-xl ${feature.bg} flex items-center justify-center mb-3`}>
                  <feature.icon className={`w-5 h-5 ${feature.color}`} />
                </div>
                <h3 className="text-sm font-semibold text-white mb-1">{feature.label}</h3>
                <p className="text-xs text-dark-400">{feature.desc}</p>
              </div>
            ))}
          </div>

          <blockquote className="border-l-2 border-zap-500 pl-4">
            <p className="text-dark-300 italic text-sm leading-relaxed">
              "Aumentamos a conversão em 340% depois que automatizamos o atendimento com ZapFlow."
            </p>
            <cite className="text-xs text-dark-500 mt-2 block not-italic">
              — Carlos Mendes, CEO da TechVendas
            </cite>
          </blockquote>
        </div>
      </div>
    </div>
  );
}
