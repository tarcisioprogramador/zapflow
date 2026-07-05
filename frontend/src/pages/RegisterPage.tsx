import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store';
import { authApi } from '../api';
import { Zap, Eye, EyeOff, ArrowRight, Bot, MessageSquare, GitBranch, BarChart3, Check } from 'lucide-react';
import toast from 'react-hot-toast';

export default function RegisterPage() {
  const [form, setForm] = useState({ name: '', email: '', password: '', organizationName: '' });
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const setAuth = useAuthStore((s) => s.setAuth);
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const { data } = await authApi.register(form);
      setAuth(data.user, data.token, data.refreshToken);
      toast.success('Conta criada com sucesso!');
      navigate('/');
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Erro ao criar conta');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex bg-dark-950">
      {/* Left - Register Form */}
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
            Comece gratuitamente
          </h2>
          <p className="text-dark-400 mb-8">
            Crie sua conta e comece a automatizar agora
          </p>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label htmlFor="reg-name" className="block text-sm font-medium text-dark-300 mb-2">Nome completo</label>
              <input
                id="reg-name"
                name="name"
                type="text"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="Seu nome"
                className="input-field w-full"
                required
                autoComplete="name"
              />
            </div>
            <div>
              <label htmlFor="reg-email" className="block text-sm font-medium text-dark-300 mb-2">Email</label>
              <input
                id="reg-email"
                name="email"
                type="email"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                placeholder="seu@email.com"
                className="input-field w-full"
                required
                autoComplete="email"
              />
            </div>
            <div>
              <label htmlFor="reg-company" className="block text-sm font-medium text-dark-300 mb-2">Nome da empresa</label>
              <input
                id="reg-company"
                name="organization"
                type="text"
                value={form.organizationName}
                onChange={(e) => setForm({ ...form, organizationName: e.target.value })}
                placeholder="Sua empresa (opcional)"
                className="input-field w-full"
                autoComplete="organization"
              />
            </div>
            <div>
              <label htmlFor="reg-password" className="block text-sm font-medium text-dark-300 mb-2">Senha</label>
              <div className="relative">
                <input
                  id="reg-password"
                  name="password"
                  type={showPassword ? 'text' : 'password'}
                  value={form.password}
                  onChange={(e) => setForm({ ...form, password: e.target.value })}
                  placeholder="Mínimo 6 caracteres"
                  className="input-field w-full pr-12"
                  required
                  minLength={6}
                  autoComplete="new-password"
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
                  Criar conta
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>

          <p className="text-center text-dark-400 text-sm mt-6">
            Já tem conta?{' '}
            <Link to="/login" className="text-zap-400 hover:text-zap-300 font-medium transition-colors">
              Fazer login
            </Link>
          </p>

          {/* Benefits */}
          <div className="mt-8 p-4 glass-card">
            <p className="text-xs font-medium text-zap-400 mb-3">🎉 Ao criar sua conta você ganha:</p>
            <div className="space-y-2">
              {[
                '7 dias de teste grátis',
                'Setup em menos de 5 minutos',
                'Suporte via chat ao vivo',
                'Cancele quando quiser, sem multa',
              ].map((item) => (
                <div key={item} className="flex items-center gap-2 text-xs text-dark-300">
                  <Check className="w-3.5 h-3.5 text-zap-400 flex-shrink-0" />
                  {item}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Right - Hero */}
      <div className="hidden lg:flex flex-1 items-center justify-center bg-dark-900/40 border-l border-dark-700/30 p-12">
        <div className="max-w-lg animate-slide-in">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-zap-500/10 border border-zap-500/20 mb-6">
            <Zap className="w-4 h-4 text-zap-400" />
            <span className="text-xs font-medium text-zap-400">Nunca foi tão fácil</span>
          </div>

          <h3 className="text-2xl font-heading font-bold text-white mb-4">
            Automatize seu WhatsApp{' '}
            <span className="text-zap-400">em minutos</span>
          </h3>

          <p className="text-sm text-dark-400 mb-8 leading-relaxed">
            Conecte seu WhatsApp, configure sua IA e comece a vender 24 horas por dia. 
            Sem precisar de programação ou conhecimentos técnicos.
          </p>

          <div className="grid grid-cols-2 gap-3 mb-8">
            {[
              { icon: MessageSquare, label: 'WhatsApp', desc: 'Multi-número' },
              { icon: Bot, label: 'IA Megan', desc: 'Vende por você' },
              { icon: GitBranch, label: 'Fluxos', desc: 'Arrastar e soltar' },
              { icon: BarChart3, label: 'Dashboard', desc: 'Métricas reais' },
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

          <div className="space-y-2">
            {[
              'IA treinada que entende do seu negócio',
              'CRM Kanban com pipeline automático',
              'Disparos em massa com texto, áudio e vídeo',
              'Remarketing inteligente sem programação',
            ].map((item) => (
              <div key={item} className="flex items-center gap-3 text-sm text-dark-300">
                <Check className="w-4 h-4 text-zap-400 flex-shrink-0" />
                {item}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
