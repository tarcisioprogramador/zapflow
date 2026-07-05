import { useState, useEffect } from 'react';
import { Check, User, Phone, Mail, ArrowRight } from 'lucide-react';
import toast from 'react-hot-toast';

interface UTMParams {
  utmSource?: string;
  utmMedium?: string;
  utmCampaign?: string;
  utmContent?: string;
  utmTerm?: string;
  adId?: string;
  adTitle?: string;
}

interface LeadCaptureFormProps {
  title?: string;
  subtitle?: string;
  onSuccess?: () => void;
}

export default function LeadCaptureForm({
  title = 'Comece Agora',
  subtitle = 'Preencha seus dados e comece gratuitamente',
  onSuccess,
}: LeadCaptureFormProps) {
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [utmParams, setUtms] = useState<UTMParams>({});

  // Capture UTM parameters from URL on mount
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const utms: UTMParams = {};

    if (params.get('utm_source')) utms.utmSource = params.get('utm_source') || undefined;
    if (params.get('utm_medium')) utms.utmMedium = params.get('utm_medium') || undefined;
    if (params.get('utm_campaign')) utms.utmCampaign = params.get('utm_campaign') || undefined;
    if (params.get('utm_content')) utms.utmContent = params.get('utm_content') || undefined;
    if (params.get('utm_term')) utms.utmTerm = params.get('utm_term') || undefined;
    if (params.get('ad_id')) utms.adId = params.get('ad_id') || undefined;
    if (params.get('ad_title')) utms.adTitle = params.get('ad_title') || undefined;

    if (Object.keys(utms).length > 0) {
      setUtms(utms);
      // Store in sessionStorage for attribution
      sessionStorage.setItem('zapflow_utms', JSON.stringify(utms));
    } else {
      // Try to restore from sessionStorage
      const stored = sessionStorage.getItem('zapflow_utms');
      if (stored) {
        setUtms(JSON.parse(stored));
      }
    }
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!phone && !email) {
      toast.error('Informe telefone ou email');
      return;
    }

    setLoading(true);
    try {
      // Always use relative path (same-origin) — VITE_API_URL is only for dev proxy
      const response = await fetch('/api/tracking/lead', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name,
          phone,
          email,
          ...utmParams,
        }),
      });

      const data = await response.json();

      if (response.ok) {
        setSubmitted(true);
        toast.success('Lead capturado com sucesso!');
        onSuccess?.();
      } else {
        toast.error(data.error || 'Erro ao capturar lead');
      }
    } catch (error) {
      toast.error('Erro de conexão');
    } finally {
      setLoading(false);
    }
  };

  if (submitted) {
    return (
      <div className="glass-card p-8 text-center animate-fade-in">
        <div className="w-16 h-16 rounded-full bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center mx-auto mb-4">
          <Check className="w-8 h-8 text-emerald-400" />
        </div>
        <h3 className="text-xl font-heading font-bold text-white mb-2">Obrigado!</h3>
        <p className="text-dark-400">Seus dados foram capturados. Entraremos em contato em breve!</p>
      </div>
    );
  }

  return (
    <div className="glass-card p-8">
      <div className="text-center mb-6">
        <h3 className="text-2xl font-heading font-bold text-white mb-2">{title}</h3>
        <p className="text-dark-400">{subtitle}</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-dark-300 mb-2">
            <User className="w-4 h-4 inline mr-2" />
            Nome
          </label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Seu nome completo"
            className="input-field w-full"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-dark-300 mb-2">
            <Phone className="w-4 h-4 inline mr-2" />
            WhatsApp *
          </label>
          <input
            type="tel"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="(11) 99999-9999"
            className="input-field w-full"
            required={!email}
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-dark-300 mb-2">
            <Mail className="w-4 h-4 inline mr-2" />
            Email *
          </label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="seu@email.com"
            className="input-field w-full"
            required={!phone}
          />
        </div>



        <button
          type="submit"
          disabled={loading}
          className="btn-primary w-full flex items-center justify-center gap-2 py-3 text-lg"
        >
          {loading ? (
            <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
          ) : (
            <>
              Começar Agora
              <ArrowRight className="w-5 h-5" />
            </>
          )}
        </button>

        <p className="text-center text-xs text-dark-500">
          Teste grátis por 7 dias • Sem cartão de crédito
        </p>
      </form>
    </div>
  );
}
