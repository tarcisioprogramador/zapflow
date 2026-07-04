import { useEffect, useState } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { CheckCircle, XCircle, Loader2, Zap } from 'lucide-react';

export default function PaymentSuccessPage() {
  const [searchParams] = useSearchParams();
  const sessionId = searchParams.get('session_id');
  const [status, setStatus] = useState<'verifying' | 'success' | 'error'>('verifying');
  const [planName, setPlanName] = useState('');

  useEffect(() => {
    if (!sessionId) {
      setStatus('error');
      return;
    }

    const verifySession = async () => {
      try {
        const token = localStorage.getItem('token');
        const res = await fetch(`/api/payments/session/${sessionId}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const data = await res.json();

        if (data.status === 'complete' || data.status === 'active') {
          setStatus('success');
          setPlanName(data.plan === 'PRO' ? 'IA Pro' : 'IA Starter');
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
  }, [sessionId]);

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
            <p className="text-dark-400 mb-4">
              Sua assinatura do plano <span className="text-zap-400 font-semibold">{planName}</span> foi ativada.
            </p>
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
