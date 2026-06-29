import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store';
import { authApi } from '../api';
import { Zap, Eye, EyeOff, ArrowRight } from 'lucide-react';
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
      setAuth(data.user, data.token);
      toast.success('Conta criada com sucesso!');
      navigate('/');
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Erro ao criar conta');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-8 bg-dark-950">
      <div className="w-full max-w-md animate-fade-in">
        <div className="flex items-center gap-3 mb-10 justify-center">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-zap-500 to-brand-600 flex items-center justify-center shadow-lg shadow-zap-500/30">
            <Zap className="w-7 h-7 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-display font-bold text-white">
              Zap<span className="text-zap-400">Flow</span>
            </h1>
          </div>
        </div>

        <h2 className="text-3xl font-display font-bold text-white mb-2 text-center">
          Comece gratuitamente
        </h2>
        <p className="text-dark-400 mb-8 text-center">
          Crie sua conta e comece a automatizar agora
        </p>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="block text-sm font-medium text-dark-300 mb-2">Nome completo</label>
            <input
              type="text"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              placeholder="Seu nome"
              className="input-field w-full"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-dark-300 mb-2">Email</label>
            <input
              type="email"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              placeholder="seu@email.com"
              className="input-field w-full"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-dark-300 mb-2">Nome da empresa</label>
            <input
              type="text"
              value={form.organizationName}
              onChange={(e) => setForm({ ...form, organizationName: e.target.value })}
              placeholder="Sua empresa (opcional)"
              className="input-field w-full"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-dark-300 mb-2">Senha</label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
                placeholder="Mínimo 6 caracteres"
                className="input-field w-full pr-12"
                required
                minLength={6}
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
      </div>
    </div>
  );
}
