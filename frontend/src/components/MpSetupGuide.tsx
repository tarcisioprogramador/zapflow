import { useState, useCallback, useEffect } from 'react';
import { paymentsApi } from '../api';
import {
  ExternalLink, CheckCircle2, AlertCircle, Loader2, Copy, Check,
  UserPlus, Key, Globe, Shield, CreditCard, Zap, Sparkles,
} from 'lucide-react';

interface MpSetupGuideProps {
  /** Called after MP is configured successfully (for parent to refresh data) */
  onConfigChange?: () => void;
  /** If true, shows a more compact layout (for use in Settings) */
  compact?: boolean;
}

type SetupStep = 'account' | 'keys' | 'env' | 'webhook' | 'test';

const STEPS: { id: SetupStep; icon: React.ElementType; title: string; description: string }[] = [
  { id: 'account', icon: UserPlus, title: 'Criar Conta', description: 'Conta gratuita no Mercado Pago' },
  { id: 'keys', icon: Key, title: 'Copiar Chaves', description: 'Access Token + Public Key' },
  { id: 'env', icon: Globe, title: 'Configurar .env', description: 'Variáveis de ambiente' },
  { id: 'webhook', icon: Shield, title: 'Webhook', description: 'Notificações automáticas' },
  { id: 'test', icon: CreditCard, title: 'Ativo!', description: 'PIX, cartão e boleto' },
];

function StepConnector({ active, completed }: { active: boolean; completed: boolean }) {
  return (
    <div className={`hidden md:block absolute top-0 left-6 w-px h-full -z-10 ${
      completed ? 'bg-emerald-500/40' : active ? 'bg-zap-500/30' : 'bg-dark-600'
    }`} />
  );
}

export default function MpSetupGuide({ onConfigChange, compact }: MpSetupGuideProps) {
  const [mpStatus, setMpStatus] = useState<any>(null);
  const [checking, setChecking] = useState(false);
  const [copiedItem, setCopiedItem] = useState<string | null>(null);
  const [activeStep, setActiveStep] = useState<number>(0);

  const checkStatus = useCallback(async () => {
    setChecking(true);
    try {
      const { data } = await paymentsApi.getStatus();
      setMpStatus(data);
      // Notify parent when configuration changes
      if (data.configured) {
        onConfigChange?.();
      }
      // Compute which step the user is at
      if (data.configured) {
        setActiveStep(4); // All done
      } else if (data.keys?.accessToken && data.keys?.publicKey) {
        setActiveStep(3); // Needs webhook
      } else if (data.keys?.accessToken) {
        setActiveStep(2); // Needs public key
      } else if (!data.keys?.accessToken) {
        setActiveStep(0); // Needs account
      }
    } catch {
      setMpStatus({ configured: false, keys: {}, missingKeys: [], nextStep: 'Erro ao verificar' });
    } finally {
      setChecking(false);
    }
  }, [onConfigChange]);

  // Auto-check on mount
  useEffect(() => { checkStatus(); }, [checkStatus]);

  const copyToClipboard = async (text: string, id: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedItem(id);
      setTimeout(() => setCopiedItem(null), 2000);
    } catch {
      // Fallback
      const textarea = document.createElement('textarea');
      textarea.value = text;
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand('copy');
      document.body.removeChild(textarea);
      setCopiedItem(id);
      setTimeout(() => setCopiedItem(null), 2000);
    }
  };

  const isConfigured = mpStatus?.configured === true;
  const origin = typeof window !== 'undefined' ? window.location.origin : 'https://SEU-DOMINIO';

  return (
    <div className={`${compact ? '' : 'glass-card overflow-hidden'}`}>
      {/* ─── Header ────────────────────────────── */}
      {!compact && (
        <div className="p-6 border-b border-dark-700/30">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-zap-500/10 border border-zap-500/20 flex items-center justify-center">
                <Zap className="w-5 h-5 text-zap-400" />
              </div>
              <div>
                <h3 className="text-lg font-heading font-bold text-white">Configuração de Pagamentos</h3>
                <p className="text-sm text-dark-400">Mercado Pago — PIX, cartão e boleto</p>
              </div>
            </div>
            <button
              onClick={checkStatus}
              disabled={checking}
              className="btn-ghost text-xs flex items-center gap-1.5 px-3 py-2 rounded-lg border border-dark-600 hover:border-dark-500 transition-all"
            >
              {checking ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <AlertCircle className="w-3.5 h-3.5" />
              )}
              Verificar
            </button>
          </div>

          {/* Status Banner */}
          {mpStatus && (
            <div className={`mt-4 p-4 rounded-xl ${
              isConfigured
                ? 'bg-emerald-500/5 border border-emerald-500/20'
                : 'bg-amber-500/5 border border-amber-500/20'
            }`}>
              {isConfigured ? (
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-emerald-500/10 flex items-center justify-center flex-shrink-0">
                    <CheckCircle2 className="w-6 h-6 text-emerald-400" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-emerald-400">Mercado Pago configurado!</p>
                    <p className="text-xs text-dark-300 mt-0.5">
                      PIX, cartão de crédito e boleto ativos. Assinaturas funcionando.
                    </p>
                  </div>
                </div>
              ) : (
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-full bg-amber-500/10 flex items-center justify-center flex-shrink-0">
                    <AlertCircle className="w-6 h-6 text-amber-400" />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-semibold text-amber-400">Configuração pendente</p>
                    <p className="text-xs text-dark-300 mt-0.5">
                      Siga os passos abaixo para ativar pagamentos automáticos.
                    </p>
                    {mpStatus.missingKeys?.length > 0 && (
                      <div className="flex flex-wrap gap-2 mt-2">
                        {mpStatus.missingKeys.map((key: string) => (
                          <span key={key} className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-dark-800/50 border border-dark-700/50 text-[10px] font-mono text-dark-400">
                            {key}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}

          {!mpStatus && !checking && (
            <div className="mt-4 p-4 rounded-xl bg-dark-800/50 border border-dark-700/30 text-center">
              <p className="text-sm text-dark-400">Clique em "Verificar" para checar o status da configuração</p>
            </div>
          )}

          {checking && !mpStatus && (
            <div className="mt-4 p-4 rounded-xl bg-dark-800/50 border border-dark-700/30 flex items-center justify-center gap-2">
              <Loader2 className="w-4 h-4 animate-spin text-zap-400" />
              <span className="text-sm text-dark-400">Verificando...</span>
            </div>
          )}
        </div>
      )}

      {/* ─── Steps ─────────────────────────────── */}
      <div className={compact ? 'space-y-3' : 'p-6 space-y-0'}>
        {/* CTA principal */}
        {!isConfigured && !compact && (
          <div className="mb-6 text-center">
            <a
              href="https://www.mercadopago.com.br/registration-mp"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 bg-zap-500 hover:bg-zap-600 text-white font-bold px-8 py-3.5 rounded-xl transition-all shadow-lg shadow-zap-500/20 active:scale-[0.98] btn-glow"
            >
              <Sparkles className="w-5 h-5" />
              Criar Conta no Mercado Pago
            </a>
            <p className="text-xs text-dark-500 mt-2">Pode criar como Pessoa Física (CPF) — não precisa de CNPJ!</p>
          </div>
        )}

        {/* Step 1: Account */}
        {!isConfigured && (
          <>
            <StepRow
              number={1}
              icon={UserPlus}
              title="Criar conta no Mercado Pago"
              description="Acesse o site do Mercado Pago e crie sua conta. Pode ser Pessoa Física (CPF)."
              active={activeStep === 0}
              completed={activeStep > 0}
              url="https://www.mercadopago.com.br/registration-mp"
              urlLabel="Abrir Mercado Pago"
            />

            {/* Step 2: API Keys */}
            <StepRow
              number={2}
              icon={Key}
              title="Copiar as chaves de API"
              description="No Mercado Pago, vá em Seu negócio &gt; Configurações &gt; Credenciais."
              active={activeStep === 1}
              completed={activeStep > 1}
              compact={compact}
            >
              <div className="mt-3 space-y-2">
                <CodeBlock
                  label="Access Token"
                  value="MP_ACCESS_TOKEN=APP_USR-..."
                  copiedId={copiedItem}
                  onCopy={copyToClipboard}
                />
                <CodeBlock
                  label="Public Key"
                  value="MP_PUBLIC_KEY=APP_USR-..."
                  copiedId={copiedItem}
                  onCopy={copyToClipboard}
                />
              </div>
            </StepRow>

            {/* Step 3: Environment Variables */}
            <StepRow
              number={3}
              icon={Globe}
              title="Adicionar no ambiente (Railway / .env)"
              description="Configure as chaves como variáveis de ambiente no Railway ou no arquivo .env."
              active={activeStep === 2}
              completed={activeStep > 2}
              compact={compact}
            >
              <div className="mt-3">
                <CodeBlock
                  label="Comando Railway"
                  value={`railway variables set MP_ACCESS_TOKEN=APP_USR-... MP_PUBLIC_KEY=APP_USR-...`}
                  copiedId={copiedItem}
                  onCopy={copyToClipboard}
                  mono
                />
              </div>
            </StepRow>

            {/* Step 4: Webhook */}
            <StepRow
              number={4}
              icon={Shield}
              title="Configurar Webhook"
              description="No painel do Mercado Pago, adicione um webhook para receber notificações."
              active={activeStep === 3}
              completed={activeStep > 3}
              url="https://www.mercadopago.com.br/developers/panel/app"
              urlLabel="Painel do Mercado Pago"
              compact={compact}
            >
              <div className="mt-3 space-y-3">
                <div>
                  <p className="text-xs text-dark-400 mb-1.5">URL do Webhook:</p>
                  <CodeBlock
                    label="Webhook URL"
                    value={`${origin}/api/webhook/mercadopago`}
                    copiedId={copiedItem}
                    onCopy={copyToClipboard}
                  />
                </div>
                <div>
                  <p className="text-xs text-dark-400 mb-1.5">Eventos necessários:</p>
                  <div className="flex flex-wrap gap-2">
                    {['payment', 'subscription_preapproval'].map((ev) => (
                      <span
                        key={ev}
                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-zap-500/10 border border-zap-500/20 text-xs font-mono text-zap-400"
                      >
                        <CheckCircle2 className="w-3 h-3" />
                        {ev}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            </StepRow>
          </>
        )}

        {/* Step 5: Done */}
        <div className={`relative pl-14 ${compact ? 'py-3' : 'py-5'}`}>
          {!isConfigured && <StepConnector active={activeStep === 4} completed={false} />}
          <div className={`absolute left-0 top-1/2 -translate-y-1/2 w-12 h-12 rounded-xl flex items-center justify-center transition-all ${
            isConfigured
              ? 'bg-emerald-500/15 border-2 border-emerald-500/30 shadow-lg shadow-emerald-500/10'
              : 'bg-dark-700/50 border border-dark-600'
          }`}>
            {isConfigured ? (
              <CheckCircle2 className="w-6 h-6 text-emerald-400" />
            ) : (
              <CreditCard className="w-5 h-5 text-dark-400" />
            )}
          </div>
          <div>
            <h4 className={`text-sm font-semibold ${isConfigured ? 'text-emerald-400' : 'text-dark-400'}`}>
              {isConfigured ? 'Pagamentos ativos!' : 'Tudo pronto para vender!'}
            </h4>
            <p className={`text-xs mt-0.5 ${isConfigured ? 'text-dark-300' : 'text-dark-500'}`}>
              {isConfigured
                ? 'PIX, cartão e boleto funcionando. Clientes já podem pagar.'
                : 'Após configurar as chaves acima, volte aqui e clique em "Verificar".'}
            </p>
          </div>
        </div>

        {/* PIX Info */}
        {!isConfigured && !compact && (
          <div className="mt-6 p-4 rounded-xl bg-gradient-to-r from-emerald-500/5 to-zap-500/5 border border-emerald-500/20">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-lg bg-emerald-500/10 flex items-center justify-center flex-shrink-0">
                <svg className="w-5 h-5 text-emerald-400" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12 0C5.383 0 0 5.383 0 12s5.383 12 12 12 12-5.383 12-12S18.617 0 12 0zm-1.004 16.125l-3.234-3.234 1.145-1.145 2.089 2.089 4.357-4.357 1.145 1.145-5.502 5.502z"/>
                </svg>
              </div>
              <div>
                <p className="text-sm font-semibold text-emerald-400">PIX nativo — sem taxa extra!</p>
                <p className="text-xs text-dark-300 mt-1">
                  O Mercado Pago já suporta <strong className="text-white">PIX</strong> (instantâneo), 
                  cartão de crédito e boleto bancário nativamente — 
                  tudo funciona assim que as credenciais são adicionadas!
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Signature Validation info */}
        {isConfigured && !compact && (
          <div className="mt-4 p-4 rounded-xl bg-dark-800/50 border border-dark-700/30">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-lg bg-zap-500/10 flex items-center justify-center flex-shrink-0">
                <Shield className="w-5 h-5 text-zap-400" />
              </div>
              <div>
                <p className="text-sm font-semibold text-white">
                  Segurança: validação de assinatura 
                  <span className={`ml-2 inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium ${
                    mpStatus?.keys?.webhookSecret
                      ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                      : 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                  }`}>
                    {mpStatus?.keys?.webhookSecret ? 'Ativa ✓' : 'Opcional'}
                  </span>
                </p>
                <p className="text-xs text-dark-400 mt-1">
                  {mpStatus?.keys?.webhookSecret
                    ? 'Webhooks validados com HMAC-SHA256. Nenhuma notificação falsa passa.'
                    : 'Adicione MP_WEBHOOK_SECRET no .env para ativar a validação criptográfica dos webhooks.'}
                </p>
                {!mpStatus?.keys?.webhookSecret && (
                  <CodeBlock
                    label=""
                    value="MP_WEBHOOK_SECRET=seu-secret-aqui"
                    copiedId={copiedItem}
                    onCopy={copyToClipboard}
                    className="mt-2"
                  />
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Sub-components ──────────────────────────────

function StepRow({
  number, icon: Icon, title, description, active, completed, children, url, urlLabel, compact,
}: {
  number: number;
  icon: React.ElementType;
  title: string;
  description: string;
  active: boolean;
  completed: boolean;
  children?: React.ReactNode;
  url?: string;
  urlLabel?: string;
  compact?: boolean;
}) {
  const bgClass = active
    ? 'bg-zap-500/15 border-2 border-zap-500/30 shadow-lg shadow-zap-500/10'
    : completed
      ? 'bg-emerald-500/15 border-2 border-emerald-500/30'
      : 'bg-dark-700/50 border border-dark-600';
  const iconClass = active
    ? 'text-zap-400'
    : completed
      ? 'text-emerald-400'
      : 'text-dark-400';

  return (
    <div className={`relative ${compact ? 'py-2' : 'py-5'}`}>
      <StepConnector active={active} completed={completed} />
      <div className="flex items-start gap-4">
        {/* Number / Icon */}
        <div className={`relative z-10 flex-shrink-0 w-12 h-12 rounded-xl flex items-center justify-center transition-all duration-300 ${bgClass}`}>
          {completed ? (
            <CheckCircle2 className={`w-6 h-6 ${iconClass}`} />
          ) : (
            <Icon className={`w-5 h-5 ${iconClass}`} />
          )}
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0 pt-0.5">
          <div className="flex items-center gap-2 flex-wrap">
            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
              completed
                ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                : active
                  ? 'bg-zap-500/10 text-zap-400 border border-zap-500/20'
                  : 'bg-dark-700 text-dark-400 border border-dark-600'
            }`}>
              {completed ? 'CONCLUÍDO' : active ? 'ATUAL' : `PASSO ${number}`}
            </span>
          </div>
          <h4 className={`text-sm font-semibold mt-1 ${active ? 'text-white' : completed ? 'text-emerald-300' : 'text-dark-300'}`}>
            {title}
          </h4>
          <p className="text-xs text-dark-400 mt-0.5">{description}</p>
          {children}
          {url && (
            <a
              href={url}
              target="_blank"
              rel="noopener noreferrer"
              className={`inline-flex items-center gap-1.5 mt-3 text-xs font-medium px-3 py-1.5 rounded-lg border transition-all ${
                active
                  ? 'bg-zap-500/10 text-zap-400 border-zap-500/20 hover:bg-zap-500/20'
                  : 'bg-dark-700/50 text-dark-300 border-dark-600 hover:border-dark-500'
              }`}
            >
              <ExternalLink className="w-3.5 h-3.5" />
              {urlLabel || 'Abrir'}
            </a>
          )}
        </div>
      </div>
    </div>
  );
}

function CodeBlock({
  label, value, copiedId, onCopy, className, mono = false,
}: {
  label: string;
  value: string;
  copiedId: string | null;
  onCopy: (text: string, id: string) => void;
  className?: string;
  mono?: boolean;
}) {
  const id = `code-${value.slice(0, 20)}`;
  const copied = copiedId === id;

  return (
    <div className={`flex items-center gap-2 ${className || ''}`}>
      {label && <span className="text-xs text-dark-400 flex-shrink-0">{label}:</span>}
      <div className="flex-1 flex items-center gap-1.5 bg-dark-950/50 border border-dark-700/50 rounded-lg px-3 py-2 min-w-0">
        <code className={`text-xs truncate flex-1 ${mono ? 'text-zap-400' : 'text-zap-400'}`}>
          {value}
        </code>
        <button
          onClick={() => onCopy(value, id)}
          className="flex-shrink-0 p-1 rounded-md hover:bg-dark-700/50 transition-colors text-dark-400 hover:text-white"
          title="Copiar"
        >
          {copied ? (
            <Check className="w-3.5 h-3.5 text-emerald-400" />
          ) : (
            <Copy className="w-3.5 h-3.5" />
          )}
        </button>
      </div>
    </div>
  );
}
