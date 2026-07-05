import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store';
import { authApi } from '../api';
import { Zap, Eye, EyeOff, ArrowRight, Bot, MessageSquare, GitBranch, BarChart3, Check } from 'lucide-react';
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
      setAuth(data.user, data.token, data.refreshToken);
      toast.success('Bem-vindo de volta!');
      navigate('/');
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Erro ao fazer login');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex bg-dark-950">
      {/* Left - Login Form */}
      <div className="flex-1 flex items-center justify-center p-8">
        <div className="w-full max-w-md animate-fade-in">
          {/* Logo */}
          <div className="flex items-center gap-3 mb-10">
            <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-zap-500 to-brand-600 flex items-center justify-center shadow-lg shadow-zap-500/20">
              <Zap className="w-6 h-6 text-white" />
            </div>
            <h1 className="text-xl font-heading font-bold text-white">
              Zap<span className="text-zap-400">Flow</span>
            </h1>
          </div>

          <h2 className="text-3xl font-heading font-bold text-white mb-2">
            Bem-vindo de volta
          </h2>
          <p className="text-dark-400 mb-8">
            Entre na sua conta para gerenciar suas automações
          </p>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label htmlFor="login-email" className="block text-sm font-medium text-dark-300 mb-2">Email</label>
              <input
                id="login-email"
                name="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="seu@email.com"
                className="input-field w-full"
                required
                autoComplete="email"
              />
            </div>
            <div>
              <label htmlFor="login-password" className="block text-sm font-medium text-dark-300 mb-2">Senha</label>
              <div className="relative">
                <input
                  id="login-password"
                  name="password"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="input-field w-full pr-12"
                  required
                  autoComplete="current-password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-dark-500 hover:text-dark-300 transition-colors"
                >
                  {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
            </div>
            <button
              type="submit"
              disabled={loading}
              className="btn-primary w-full flex items-center justify-center gap-2 py-3 text-base"
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


        </div>
      </div>

      {/* Right - Hero */}
      <div className="hidden lg:flex flex-1 items-center justify-center bg-dark-900/40 border-l border-dark-700/30 p-12">
        <div className="max-w-lg animate-slide-in">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-zap-500/10 border border-zap-500/20 mb-6">
            <Zap className="w-4 h-4 text-zap-400" />
            <span className="text-xs font-medium text-zap-400">Automação com IA</span>
          </div>

          <h3 className="text-2xl font-heading font-bold text-white mb-4">
            Tudo que você precisa em{' '}
            <span className="text-zap-400">um lugar</span>
          </h3>

          <div className="grid grid-cols-2 gap-3 mb-8">
            {[
              { icon: MessageSquare, label: 'Multi-WhatsApp', desc: 'Vários números' },
              { icon: Bot, label: 'IA Atendente', desc: '24 horas por dia' },
              { icon: GitBranch, label: 'Fluxos Visuais', desc: 'Drag & drop' },
              { icon: BarChart3, label: 'CRM + Analytics', desc: 'Pipeline completo' },
            ].map((feature) => (
              <div
                key={feature.label}
                className="glass-card p-4 hover:border-dark-600/60 transition-all duration-300"
              >
                <div className="w-9 h-9 rounded-lg bg-zap-500/10 flex items-center justify-center mb-2">
                  <feature.icon className="w-5 h-5 text-zap-400" />
                </div>
                <h4 className="text-sm font-heading font-bold text-white mb-0.5">{feature.label}</h4>
                <p className="text-xs text-dark-400">{feature.desc}</p>
              </div>
            ))}
          </div>

          <div className="space-y-2 mb-6">
            {[
              'IA que atende, qualifica e vende 24/7',
              'Construtor de fluxos sem programação',
              'Campanhas em massa com texto, imagem e vídeo',
              'Remarketing inteligente automatizado',
            ].map((item) => (
              <div key={item} className="flex items-center gap-3 text-sm text-dark-300">
                <Check className="w-4 h-4 text-zap-400 flex-shrink-0" />
                {item}
              </div>
            ))}
          </div>

          <blockquote className="border-l-2 border-zap-500 pl-4">
            <p className="text-dark-400 italic text-sm leading-relaxed">
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
