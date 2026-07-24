import { useState, useMemo } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useAuthStore } from '../store';
import { authApi, paymentsApi } from '../api';
import { Zap, Eye, EyeOff, ArrowRight, Bot, MessageSquare, GitBranch, BarChart3, Check } from 'lucide-react';
import toast from 'react-hot-toast';

function getPasswordStrength(password: string): { score: number; label: string; color: string } {
  if (!password) return { score: 0, label: '', color: '' };
  let score = 0;
  if (password.length >= 6) score++;
  if (password.length >= 8) score++;
  if (/[A-Z]/.test(password)) score++;
  if (/[0-9]/.test(password)) score++;
  if (/[^A-Za-z0-9]/.test(password)) score++;

  if (score <= 1) return { score, label: 'Fraca', color: 'bg-red-500' };
  if (score <= 2) return { score, label: 'Media', color: 'bg-yellow-500' };
  if (score <= 3) return { score, label: 'Boa', color: 'bg-blue-500' };
  return { score, label: 'Forte', color: 'bg-green-500' };
}

export default function RegisterPage() {
  const [form, setForm] = useState({ name: '', email: '', password: '', organizationName: '' });
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const setAuth = useAuthStore((s) => s.setAuth);
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const selectedPlan = searchParams.get('plan');

  const strength = useMemo(() => getPasswordStrength(form.password), [form.password]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!form.name.trim() || !form.email.trim() || !form.password) {
      toast.error('Preencha todos os campos obrigatorios');
      return;
    }

    if (form.name.trim().length < 2) {
      toast.error('Nome deve ter no minimo 2 caracteres');
      return;
    }

    if (form.password.length < 6) {
      toast.error('Senha deve ter no minimo 6 caracteres');
      return;
    }

    setLoading(true);
    try {
      const { data } = await authApi.register({
        name: form.name.trim(),
        email: form.email.trim(),
        password: form.password,
        organizationName: form.organizationName.trim() || undefined,
      });
      setAuth(data.user, data.token, data.refreshToken);

      if (selectedPlan && ['STARTER', 'PRO', 'ENTERPRISE'].includes(selectedPlan.toUpperCase())) {
        try {
          const checkout = await paymentsApi.createCheckout({ plan: selectedPlan.toUpperCase() });
          if (checkout.data.url) {
            window.location.href = checkout.data.url;
            return;
          }
        } catch {
          // Fallback: go to onboarding
        }
      }

      toast.success('Conta criada com sucesso!');
      navigate('/onboarding');
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
                disabled={loading}
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
                disabled={loading}
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
                disabled={loading}
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
                  placeholder="Minimo 6 caracteres"
                  className="input-field w-full pr-12"
                  required
                  minLength={6}
                  autoComplete="new-password"
                  disabled={loading}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-dark-500 hover:text-dark-300 transition-colors"
                  tabIndex={-1}
                >
                  {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
              {/* Password strength indicator */}
              {form.password && (
                <div className="mt-2">
                  <div className="flex gap-1 mb-1">
                    {[1, 2, 3, 4, 5].map((i) => (
                      <div
                        key={i}
                        className={`h-1 flex-1 rounded-full transition-all ${
                          i <= strength.score ? strength.color : 'bg-dark-700'
                        }`}
                      />
                    ))}
                  </div>
                  <p className={`text-xs ${
                    strength.score <= 1 ? 'text-red-400' :
                    strength.score <= 2 ? 'text-yellow-400' :
                    strength.score <= 3 ? 'text-blue-400' :
                    'text-green-400'
                  }`}>
                    {strength.label}
                  </p>
                </div>
              )}
            </div>
            <button
              type="submit"
              disabled={loading}
              className="btn-primary w-full flex items-center justify-center gap-2 py-3 text-base disabled:opacity-50 disabled:cursor-not-allowed"
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
            Ja tem conta?{' '}
            <Link to="/login" className="text-zap-400 hover:text-zap-300 font-medium transition-colors">
              Fazer login
            </Link>
          </p>

          {/* Benefits */}
          <div className="mt-8 p-4 glass-card">
            <p className="text-xs font-medium text-zap-400 mb-3">Ao criar sua conta voce ganha:</p>
            <div className="space-y-2">
              {[
                '7 dias de teste gratis',
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
            <span className="text-xs font-medium text-zap-400">Nunca foi tao facil</span>
          </div>

          <h3 className="text-2xl font-heading font-bold text-white mb-4">
            Automatize seu WhatsApp{' '}
            <span className="text-zap-400">em minutos</span>
          </h3>

          <p className="text-sm text-dark-400 mb-8 leading-relaxed">
            Conecte seu WhatsApp, configure sua IA e comece a vender 24 horas por dia.
            Sem precisar de programacao ou conhecimentos tecnicos.
          </p>

          <div className="grid grid-cols-2 gap-3 mb-8">
            {[
              { icon: MessageSquare, label: 'WhatsApp', desc: 'Multi-numero' },
              { icon: Bot, label: 'IA Megan', desc: 'Vende por voce' },
              { icon: GitBranch, label: 'Fluxos', desc: 'Arrastar e soltar' },
              { icon: BarChart3, label: 'Dashboard', desc: 'Metricas reais' },
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
              'IA treinada que entende do seu negocio',
              'CRM Kanban com pipeline automatico',
              'Disparos em massa com texto, audio e video',
              'Remarketing inteligente sem programacao',
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
