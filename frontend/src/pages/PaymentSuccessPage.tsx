import { useEffect, useState } from 'react';
import { useSearchParams, Link, useNavigate } from 'react-router-dom';
import { CheckCircle, XCircle, Loader2, Zap, Mail, Lock, User, ArrowRight } from 'lucide-react';
import { authApi } from '../api';
import { useAuthStore } from '../store';

export default function PaymentSuccessPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  // Mercado Pago redirects with:
  // - preapproval_id (subscription/PreApproval)
  // - payment_id (one-time PIX/Checkout Pro payment)
  // Legacy Stripe support uses session_id
  const preapprovalId = searchParams.get('preapproval_id');
  const paymentIdParam = searchParams.get('payment_id');
  const sessionId = searchParams.get('session_id');
  const paymentId = preapprovalId || paymentIdParam || sessionId;
  const [status, setStatus] = useState<'verifying' | 'success' | 'error'>('verifying');
  const [planName, setPlanName] = useState('');

  // Registration form state
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [registerLoading, setRegisterLoading] = useState(false);
  const [registerError, setRegisterError] = useState('');

  useEffect(() => {
    if (!paymentId) {
      setStatus('error');
      return;
    }

    const verifySession = async () => {
      try {
        const token = localStorage.getItem('token');
        const res = await fetch(`/api/payments/session/${paymentId}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const data = await res.json();

        if (data.status === 'complete' || data.status === 'active' || data.status === 'approved') {
          const plan = data.plan === 'PRO' ? 'IA Pro'
            : data.plan === 'ENTERPRISE' ? 'Enterprise'
            : 'IA Starter';
          setPlanName(plan);
          setStatus('success');
        } else {
          setStatus('error');
        }
      } catch {
        // If session verification fails, show success anyway
        // The webhook will process the subscription
        setStatus('success');
      }
    };

    verifySession();
  }, [paymentId]);

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setRegisterLoading(true);
    setRegisterError('');

    try {
      const { data } = await authApi.register({
        name,
        email,
        password,
        ...(paymentId ? { paymentId } : {}),
      });
      useAuthStore.getState().setAuth(data.user, data.token, data.refreshToken);
      navigate('/');
    } catch (err: any) {
      setRegisterError(err?.response?.data?.error || 'Erro ao criar conta. Tente novamente.');
    } finally {
      setRegisterLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-dark-950 flex items-center justify-center p-6">
      <div className="max-w-md w-full text-center">
        {status === 'verifying' && (
          <div>
            <Loader2 className="w-16 h-16 text-zap-400 mx-auto mb-6 animate-spin" />
            <h1 className="text-2xl font-heading font-bold text-white mb-2">Verificando pagamento...</h1>
            <p className="text-dark-400">Aguarde um momento enquanto confirmamos sua assinatura.</p>
          </div>
        )}

        {status === 'success' && (
          <div className="animate-fade-in">
            <div className="w-20 h-20 rounded-full bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center mx-auto mb-6">
              <CheckCircle className="w-10 h-10 text-emerald-400" />
            </div>
            <h1 className="text-2xl font-heading font-bold text-white mb-2">Pagamento confirmado!</h1>
            <p className="text-dark-400 mb-6">
              Sua assinatura do plano <span className="text-zap-400 font-semibold">{planName}</span> foi ativada.
            </p>

            {!isAuthenticated ? (
              <>
                <div className="bg-dark-800/50 border border-dark-700/30 rounded-xl p-6 mb-4 text-left">
                  <p className="text-sm text-dark-300 mb-4">
                    Agora crie sua conta para acessar o painel e começar a usar o ZapFlow!
                    Use o mesmo <strong>email</strong> que você pagou no Mercado Pago.
                  </p>

                  <form onSubmit={handleRegister} className="space-y-3">
                    <div>
                      <div className="flex items-center gap-2 bg-dark-800 border border-dark-700/50 rounded-lg px-3 py-2.5 focus-within:border-zap-500/50 transition-colors">
                        <User className="w-4 h-4 text-dark-400 flex-shrink-0" />
                        <input
                          type="text"
                          placeholder="Seu nome"
                          value={name}
                          onChange={(e) => setName(e.target.value)}
                          required
                          className="bg-transparent text-white text-sm w-full outline-none placeholder:text-dark-500"
                        />
                      </div>
                    </div>
                    <div>
                      <div className="flex items-center gap-2 bg-dark-800 border border-dark-700/50 rounded-lg px-3 py-2.5 focus-within:border-zap-500/50 transition-colors">
                        <Mail className="w-4 h-4 text-dark-400 flex-shrink-0" />
                        <input
                          type="email"
                          placeholder="Seu email (usado no pagamento)"
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                          required
                          className="bg-transparent text-white text-sm w-full outline-none placeholder:text-dark-500"
                        />
                      </div>
                    </div>
                    <div>
                      <div className="flex items-center gap-2 bg-dark-800 border border-dark-700/50 rounded-lg px-3 py-2.5 focus-within:border-zap-500/50 transition-colors">
                        <Lock className="w-4 h-4 text-dark-400 flex-shrink-0" />
                        <input
                          type="password"
                          placeholder="Crie uma senha"
                          value={password}
                          onChange={(e) => setPassword(e.target.value)}
                          required
                          minLength={6}
                          className="bg-transparent text-white text-sm w-full outline-none placeholder:text-dark-500"
                        />
                      </div>
                    </div>

                    {registerError && (
                      <p className="text-xs text-red-400 text-center">{registerError}</p>
                    )}

                    <button
                      type="submit"
                      disabled={registerLoading}
                      className="w-full bg-zap-500 hover:bg-zap-600 text-white font-bold px-6 py-3 rounded-lg transition-all flex items-center justify-center gap-2 disabled:opacity-50 shadow-lg shadow-zap-500/20"
                    >
                      {registerLoading ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <><ArrowRight className="w-4 h-4" /> Criar conta e acessar</>
                      )}
                    </button>
                  </form>
                </div>

                <Link
                  to="/login"
                  className="text-sm text-zap-400 hover:text-zap-300 transition-colors"
                >
                  Já tem conta? Faça login
                </Link>
              </>
            ) : (
              <>
                <p className="text-sm text-dark-500 mb-8">
                  Você já pode acessar todos os recursos do seu plano. Boas vendas! 🚀
                </p>
                <Link
                  to="/"
                  className="inline-flex items-center gap-2 bg-zap-500 hover:bg-zap-600 text-white font-bold px-8 py-4 rounded-lg transition-all shadow-lg shadow-zap-500/30"
                >
                  <Zap className="w-5 h-5" />
                  Ir para o Dashboard
                </Link>
              </>
            )}
          </div>
        )}

        {status === 'error' && (
          <div className="animate-fade-in">
            <div className="w-20 h-20 rounded-full bg-red-500/10 border border-red-500/20 flex items-center justify-center mx-auto mb-6">
              <XCircle className="w-10 h-10 text-red-400" />
            </div>
            <h1 className="text-2xl font-heading font-bold text-white mb-2">Algo deu errado</h1>
            <p className="text-dark-400 mb-8">
              Não foi possível verificar seu pagamento. Se o valor foi cobrado, entre em contato com nosso suporte.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link
                to="/"
                className="inline-flex items-center gap-2 bg-dark-700 hover:bg-dark-600 text-white font-medium px-6 py-3 rounded-lg transition-all border border-dark-600"
              >
                Voltar ao Início
              </Link>
              <a
                href="mailto:contato@zapflow.com"
                className="inline-flex items-center gap-2 bg-zap-500 hover:bg-zap-600 text-white font-medium px-6 py-3 rounded-lg transition-all"
              >
                Falar com Suporte
              </a>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
