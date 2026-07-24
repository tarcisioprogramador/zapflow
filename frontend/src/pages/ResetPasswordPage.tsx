import { useState } from 'react';
import { Link, useSearchParams, useNavigate } from 'react-router-dom';
import { Zap, Eye, EyeOff, CheckCircle, ArrowRight } from 'lucide-react';
import { authApi } from '../api';
import toast from 'react-hot-toast';

export default function ResetPasswordPage() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');
  const navigate = useNavigate();

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  if (!token) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-dark-950 p-8">
        <div className="w-full max-w-md animate-fade-in text-center">
          <div className="flex items-center justify-center gap-3 mb-10">
            <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-zap-500 to-brand-600 flex items-center justify-center shadow-lg shadow-zap-500/20">
              <Zap className="w-6 h-6 text-white" />
            </div>
            <h1 className="text-xl font-heading font-bold text-white">
              Zap<span className="text-zap-400">Flow</span>
            </h1>
          </div>
          <h2 className="text-2xl font-heading font-bold text-white mb-3">
            Link invalido
          </h2>
          <p className="text-dark-400 mb-8">
            O link de redefinicao de senha e invalido ou esta faltando. Solicite um novo link.
          </p>
          <Link to="/forgot-password" className="btn-primary inline-flex items-center gap-2 py-3 px-6">
            Solicitar novo link
          </Link>
        </div>
      </div>
    );
  }

  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-dark-950 p-8">
        <div className="w-full max-w-md animate-fade-in text-center">
          <div className="flex items-center justify-center gap-3 mb-10">
            <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-zap-500 to-brand-600 flex items-center justify-center shadow-lg shadow-zap-500/20">
              <Zap className="w-6 h-6 text-white" />
            </div>
            <h1 className="text-xl font-heading font-bold text-white">
              Zap<span className="text-zap-400">Flow</span>
            </h1>
          </div>

          <div className="w-16 h-16 rounded-full bg-zap-500/10 flex items-center justify-center mx-auto mb-6">
            <CheckCircle className="w-8 h-8 text-zap-400" />
          </div>

          <h2 className="text-2xl font-heading font-bold text-white mb-3">
            Senha redefinida!
          </h2>
          <p className="text-dark-400 mb-8">
            Sua senha foi alterada com sucesso. Faca login com sua nova senha.
          </p>

          <button
            onClick={() => navigate('/login')}
            className="btn-primary inline-flex items-center gap-2 py-3 px-6"
          >
            Ir para o login
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    );
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (password.length < 6) {
      toast.error('A senha deve ter no minimo 6 caracteres');
      return;
    }

    if (password !== confirmPassword) {
      toast.error('As senhas nao coincidem');
      return;
    }

    setLoading(true);
    try {
      await authApi.resetPassword(token, password);
      setSuccess(true);
    } catch (err: any) {
      const message = err.response?.data?.error;
      toast.error(message || 'Erro ao redefinir senha');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-dark-950 p-8">
      <div className="w-full max-w-md animate-fade-in">
        <div className="flex items-center gap-3 mb-10">
          <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-zap-500 to-brand-600 flex items-center justify-center shadow-lg shadow-zap-500/20">
            <Zap className="w-6 h-6 text-white" />
          </div>
          <h1 className="text-xl font-heading font-bold text-white">
            Zap<span className="text-zap-400">Flow</span>
          </h1>
        </div>

        <h2 className="text-2xl font-heading font-bold text-white mb-2">
          Redefinir senha
        </h2>
        <p className="text-dark-400 mb-8">
          Digite sua nova senha abaixo.
        </p>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label htmlFor="reset-password" className="block text-sm font-medium text-dark-300 mb-2">
              Nova senha
            </label>
            <div className="relative">
              <input
                id="reset-password"
                name="password"
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Minimo 6 caracteres"
                className="input-field w-full pr-12"
                required
                minLength={6}
                autoComplete="new-password"
                disabled={loading}
                autoFocus
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
          </div>

          <div>
            <label htmlFor="reset-confirm" className="block text-sm font-medium text-dark-300 mb-2">
              Confirmar senha
            </label>
            <input
              id="reset-confirm"
              name="confirmPassword"
              type={showPassword ? 'text' : 'password'}
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="Repita a senha"
              className="input-field w-full"
              required
              minLength={6}
              autoComplete="new-password"
              disabled={loading}
            />
            {confirmPassword && password !== confirmPassword && (
              <p className="text-red-400 text-xs mt-1">As senhas nao coincidem</p>
            )}
          </div>

          <button
            type="submit"
            disabled={loading || !password || !confirmPassword || password !== confirmPassword}
            className="btn-primary w-full flex items-center justify-center gap-2 py-3 text-base disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? (
              <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : (
              'Redefinir senha'
            )}
          </button>
        </form>

        <p className="text-center text-dark-400 text-sm mt-6">
          <Link to="/login" className="text-zap-400 hover:text-zap-300 font-medium transition-colors">
            Voltar ao login
          </Link>
        </p>
      </div>
    </div>
  );
}
