import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Zap, ArrowLeft, Mail, CheckCircle } from 'lucide-react';
import { authApi } from '../api';
import toast from 'react-hot-toast';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!email.trim()) {
      toast.error('Informe seu email');
      return;
    }

    setLoading(true);
    try {
      await authApi.forgotPassword(email.trim());
      setSent(true);
    } catch {
      // Always show success to prevent email enumeration
      setSent(true);
    } finally {
      setLoading(false);
    }
  };

  if (sent) {
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
            Email enviado
          </h2>
          <p className="text-dark-400 mb-8 leading-relaxed">
            Se <span className="text-dark-200 font-medium">{email}</span> estiver cadastrado, voce recebera um link para redefinir sua senha.
          </p>

          <Link
            to="/login"
            className="btn-primary inline-flex items-center gap-2 py-3 px-6"
          >
            <ArrowLeft className="w-4 h-4" />
            Voltar ao login
          </Link>
        </div>
      </div>
    );
  }

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

        <div className="w-14 h-14 rounded-full bg-zap-500/10 flex items-center justify-center mb-6">
          <Mail className="w-7 h-7 text-zap-400" />
        </div>

        <h2 className="text-2xl font-heading font-bold text-white mb-2">
          Esqueceu sua senha?
        </h2>
        <p className="text-dark-400 mb-8">
          Informe seu email e enviaremos um link para redefinir sua senha.
        </p>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label htmlFor="forgot-email" className="block text-sm font-medium text-dark-300 mb-2">
              Email cadastrado
            </label>
            <input
              id="forgot-email"
              name="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="seu@email.com"
              className="input-field w-full"
              required
              autoComplete="email"
              disabled={loading}
              autoFocus
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="btn-primary w-full flex items-center justify-center gap-2 py-3 text-base disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? (
              <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : (
              'Enviar link de redefinicao'
            )}
          </button>
        </form>

        <p className="text-center text-dark-400 text-sm mt-6">
          Lembrou sua senha?{' '}
          <Link to="/login" className="text-zap-400 hover:text-zap-300 font-medium transition-colors">
            Fazer login
          </Link>
        </p>
      </div>
    </div>
  );
}
