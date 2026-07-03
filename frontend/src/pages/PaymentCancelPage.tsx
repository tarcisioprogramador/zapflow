import { Link } from 'react-router-dom';
import { XCircle, Zap } from 'lucide-react';

export default function PaymentCancelPage() {
  return (
    <div className="min-h-screen bg-dark-950 flex items-center justify-center p-6">
      <div className="max-w-md w-full text-center animate-fade-in">
        <div className="w-20 h-20 rounded-full bg-yellow-500/10 border border-yellow-500/20 flex items-center justify-center mx-auto mb-6">
          <XCircle className="w-10 h-10 text-yellow-400" />
        </div>
        <h1 className="text-2xl font-heading font-bold text-white mb-2">Pagamento cancelado</h1>
        <p className="text-dark-400 mb-4">
          O processo de assinatura foi cancelado. Seu plano não foi alterado.
        </p>
        <p className="text-sm text-dark-500 mb-8">
          Se ficou com alguma dúvida sobre os planos, estamos à disposição para ajudar!
        </p>
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Link
            to="/#pricing"
            className="inline-flex items-center gap-2 bg-zap-500 hover:bg-zap-600 text-white font-bold px-8 py-4 rounded-lg transition-all shadow-lg shadow-zap-500/30"
          >
            <Zap className="w-5 h-5" />
            Ver Planos Novamente
          </Link>
          <Link
            to="/"
            className="inline-flex items-center gap-2 bg-dark-700 hover:bg-dark-600 text-white font-medium px-6 py-3 rounded-lg transition-all border border-dark-600"
          >
            Ir para o Início
          </Link>
        </div>
      </div>
    </div>
  );
}
