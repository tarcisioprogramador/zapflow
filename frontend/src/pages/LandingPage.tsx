import { Link } from 'react-router-dom';
import { useState } from 'react';
import {
  Zap, MessageSquare, Bot, GitBranch, Columns3, Send, BarChart3,
  Webhook, Shield, Users, Check, ArrowRight, Star, ChevronRight,
  Sparkles, Globe, Smartphone, Play, ChevronDown, Brain,
  Repeat, BotMessageSquare,
} from 'lucide-react';
import LeadCaptureForm from '../components/LeadCaptureForm';

const features = [
  {
    icon: MessageSquare,
    title: 'Multi-Número WhatsApp',
    description: 'Conecte múltiplos números e gerencie tudo em um só lugar. Atendimento profissional sem limites.',
    color: 'text-zap-400',
    bg: 'bg-zap-500/10',
  },
  {
    icon: BotMessageSquare,
    title: 'IA Atendente 24/7',
    description: 'Assistente virtual treinada com sua base de conhecimento que atende, qualifica e vende automaticamente.',
    color: 'text-brand-400',
    bg: 'bg-brand-500/10',
  },
  {
    icon: GitBranch,
    title: 'Construtor de Fluxos',
    description: 'Crie automações visuais com drag & drop. Gatilhos, respostas condicionais e ações inteligentes.',
    color: 'text-purple-400',
    bg: 'bg-purple-500/10',
  },
  {
    icon: Columns3,
    title: 'CRM Kanban',
    description: 'Pipeline de vendas completo com movimentação automática de leads e tracking em tempo real.',
    color: 'text-orange-400',
    bg: 'bg-orange-500/10',
  },
  {
    icon: Send,
    title: 'Disparos em Massa',
    description: 'Envie campanhas com texto, imagem, vídeo, áudio e GIF para milhares de contatos.',
    color: 'text-emerald-400',
    bg: 'bg-emerald-500/10',
  },
  {
    icon: BarChart3,
    title: 'Rastreamento de Anúncios',
    description: 'Capture dados de onde vêm seus leads com UTM tracking automático para otimizar investimento.',
    color: 'text-red-400',
    bg: 'bg-red-500/10',
  },
  {
    icon: Repeat,
    title: 'Remarketing Inteligente',
    description: 'Sequências automáticas de follow-up com delays, condições e mensagens personalizadas.',
    color: 'text-pink-400',
    bg: 'bg-pink-500/10',
  },
  {
    icon: Users,
    title: 'Multi-Atendente',
    description: 'Gerencie sua equipe com múltiplos atendentes, roteamento automático e controle de acesso.',
    color: 'text-cyan-400',
    bg: 'bg-cyan-500/10',
  },
];

const plans = [
  {
    name: 'Starter',
    price: '147',
    period: '/mês',
    description: 'Perfeito para começar a automatizar',
    features: [
      '1 número WhatsApp',
      '5 atendentes',
      '15.000 mensagens',
      'CRM Kanban (2 quadros)',
      'Automações ilimitadas',
      'Rastreamento de anúncios',
      'Suporte por email',
    ],
    cta: 'Começar Grátis',
    popular: false,
    trial: true,
  },
  {
    name: 'Pro',
    price: '197',
    period: '/mês',
    description: 'Para negócios que querem escalar',
    features: [
      '1 número WhatsApp',
      'Atendentes ilimitados',
      '30.000 mensagens',
      'CRM Kanban (5 quadros)',
      'Automações ilimitadas',
      'Rastreamento de anúncios',
      'Webhooks & API (POST, PUT, GET)',
      'Remarketing automático',
      'Suporte prioritário',
    ],
    cta: 'Assinar Pro',
    popular: true,
    trial: true,
  },
  {
    name: 'IA Starter',
    price: '277',
    period: '/mês',
    description: 'IA para atendimento automatizado',
    features: [
      '1 número WhatsApp',
      '5 atendentes',
      '15.000 mensagens',
      'IA Atendente 24/7 (5 Mi tokens)',
      'CRM Kanban (2 quadros)',
      'Automações + IA',
      'Base de conhecimento para IA',
      'Suporte por email',
    ],
    cta: 'Começar com IA',
    popular: false,
    trial: false,
  },
  {
    name: 'IA Pro',
    price: '357',
    period: '/mês',
    description: 'IA completa para grandes operações',
    features: [
      '1 número WhatsApp',
      'Atendentes ilimitados',
      '30.000 mensagens',
      'IA Atendente 24/7 (10 Mi tokens)',
      'CRM Kanban (5 quadros)',
      'Automações + IA avançada',
      'Base de conhecimento para IA',
      'Webhooks & API completos',
      'Remarketing com IA',
      'Suporte prioritário',
    ],
    cta: 'Assinar IA Pro',
    popular: false,
    trial: false,
  },
];

const testimonials = [
  {
    name: 'Carlos Mendes',
    role: 'CEO, TechVendas',
    text: 'Aumentamos a conversão em 340% depois que automatizamos o atendimento. A IA responde como um humano e nunca perde um lead!',
    rating: 5,
    avatar: 'CM',
  },
  {
    name: 'Fernanda Silva',
    role: 'Diretora Comercial, InnovaGroup',
    text: 'Em 3 meses triplicamos nossos leads qualificados. O CRM Kanban e os fluxos automáticos são incríveis.',
    rating: 5,
    avatar: 'FS',
  },
  {
    name: 'Ricardo Santos',
    role: 'Fundador, DigitalPro',
    text: 'O rastreamento de anúncios mudou nosso jogo. Agora sabemos exatamente de onde vêm nossos clientes e otimizamos cada real investido.',
    rating: 5,
    avatar: 'RS',
  },
  {
    name: 'Ana Paula Costa',
    role: 'Empreendedora, ModaFitness',
    text: 'Nunca foi tão fácil criar automações milionárias! A IA Megan atende 24/7 e eu durmo tranquila sabendo que nenhum lead é perdido.',
    rating: 5,
    avatar: 'AC',
  },
];

const stats = [
  { value: '10.000+', label: 'Empresas ativas' },
  { value: '50M+', label: 'Mensagens enviadas' },
  { value: '340%', label: 'Aumento médio conversão' },
  { value: '99.9%', label: 'Uptime garantido' },
];

const faqs = [
  {
    q: 'Preciso saber programar para usar?',
    a: 'Não! A plataforma foi feita para ser usada por qualquer pessoa. O construtor de fluxos é visual (arrastar e soltar) e a IA faz o trabalho pesado por você.',
  },
  {
    q: 'Como funciona a conexão com o WhatsApp?',
    a: 'Basta escanear um QR Code com seu WhatsApp, igual ao WhatsApp Web. Conectamos via API oficial, sem precisar de extensões de navegador. Após a conexão, tudo funciona na nuvem.',
  },
  {
    q: 'A IA realmente funciona ou é só um chatbot básico?',
    a: 'A IA é treinada com sua base de conhecimento e utiliza modelos avançados para entender contexto, qualificar leads e responder de forma humanizada como um atendente real.',
  },
  {
    q: 'O teste grátis de 7 dias funciona em todos os planos?',
    a: 'O teste grátis de 7 dias é válido para os planos Starter e Pro (sem IA). Os planos com IA (IA Starter e IA Pro) começam a partir do primeiro dia sem período gratuito.',
  },
  {
    q: 'Posso cancelar a qualquer momento?',
    a: 'Sim! Sem multa, sem burocracia. Cancele quando quiser pelo painel de configurações. Seu acesso continua até o final do período pago.',
  },
  {
    q: 'Posso adicionar números extras de WhatsApp?',
    a: 'Sim! O plano base permite 1 número. Você pode adicionar números extras por R$ 97,00 cada. Nos planos personalizados, é possível ter mais de 3 números.',
  },
  {
    q: 'Vocês oferecem suporte e treinamento?',
    a: 'Sim! Além do painel, oferecemos treinamento em vídeo, documentação completa e suporte via email (Starter) ou prioritário (Pro). No Discord temos uma comunidade ativa.',
  },
];

function FaqItem({ q, a }: { q: string; a: string }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="glass-card overflow-hidden">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between p-5 text-left hover:bg-dark-800/30 transition-colors"
      >
        <span className="text-sm font-semibold text-white pr-4">{q}</span>
        <ChevronDown className={`w-5 h-5 text-dark-400 flex-shrink-0 transition-transform duration-200 ${open ? 'rotate-180' : ''}`} />
      </button>
      {open && (
        <div className="px-5 pb-5 animate-slide-up">
          <p className="text-sm text-dark-400 leading-relaxed">{a}</p>
        </div>
      )}
    </div>
  );
}

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-dark-950 text-white overflow-hidden">
      {/* Navigation */}
      <nav className="fixed top-0 w-full z-50 bg-dark-950/80 backdrop-blur-xl border-b border-dark-700/30">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-zap-500 to-brand-600 flex items-center justify-center shadow-lg shadow-zap-500/20">
              <Zap className="w-5 h-5 text-white" />
            </div>
            <span className="text-lg font-display font-bold">
              Zap<span className="text-zap-400">Flow</span>
            </span>
          </div>
          <div className="hidden md:flex items-center gap-8">
            <a href="#features" className="text-sm text-dark-400 hover:text-white transition-colors">Funcionalidades</a>
            <a href="#pricing" className="text-sm text-dark-400 hover:text-white transition-colors">Planos</a>
            <a href="#testimonials" className="text-sm text-dark-400 hover:text-white transition-colors">Depoimentos</a>
            <a href="#faq" className="text-sm text-dark-400 hover:text-white transition-colors">FAQ</a>
          </div>
          <div className="flex items-center gap-3">
            <Link to="/login" className="btn-ghost text-sm">Entrar</Link>
            <Link to="/register" className="btn-primary text-sm">
              Começar Grátis
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative pt-32 pb-20 px-6">
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-zap-500/10 rounded-full blur-3xl" />
          <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-brand-500/10 rounded-full blur-3xl" />
        </div>

        <div className="max-w-7xl mx-auto relative">
          <div className="text-center max-w-4xl mx-auto">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-zap-500/10 border border-zap-500/20 mb-8 animate-fade-in">
              <Sparkles className="w-4 h-4 text-zap-400" />
              <span className="text-sm font-medium text-zap-400">Nunca foi tão fácil criar automações milionárias</span>
            </div>

            <h1 className="text-5xl md:text-7xl font-display font-extrabold leading-tight mb-6 animate-slide-up">
              Atenda, Venda e Faça{' '}
              <span className="gradient-text">Marketing</span>
              <br />
              no WhatsApp com IA
            </h1>

            <p className="text-xl text-dark-400 max-w-2xl mx-auto mb-10 leading-relaxed">
              Plataforma completa de automação com IA que atende 24/7, qualifica leads,
              envia campanhas e gerencia sua equipe. Tudo em um só lugar.
            </p>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-16">
              <Link to="/register" className="btn-primary text-lg px-8 py-4 flex items-center gap-2 group">
                Teste Grátis por 7 Dias
                <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
              </Link>
              <Link to="/login" className="btn-secondary text-lg px-8 py-4 flex items-center gap-2">
                <Play className="w-5 h-5" />
                Ver Demo
              </Link>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-8 max-w-3xl mx-auto">
              {stats.map((stat) => (
                <div key={stat.label} className="text-center">
                  <p className="text-3xl font-display font-bold text-white mb-1">{stat.value}</p>
                  <p className="text-sm text-dark-400">{stat.label}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-20 px-6">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-display font-bold mb-4">
              Tudo que você precisa em{' '}
              <span className="gradient-text">uma plataforma</span>
            </h2>
            <p className="text-lg text-dark-400 max-w-2xl mx-auto">
              Do atendimento à conversão, automatize cada etapa da jornada do cliente
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {features.map((feature) => (
              <div
                key={feature.title}
                className="glass-card p-6 hover:border-dark-600/60 transition-all duration-300 group hover:-translate-y-1"
              >
                <div className={`w-12 h-12 rounded-xl ${feature.bg} flex items-center justify-center mb-4 group-hover:scale-110 transition-transform`}>
                  <feature.icon className={`w-6 h-6 ${feature.color}`} />
                </div>
                <h3 className="text-lg font-display font-bold text-white mb-2">{feature.title}</h3>
                <p className="text-sm text-dark-400 leading-relaxed">{feature.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How it Works */}
      <section className="py-20 px-6 bg-dark-900/30">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-display font-bold mb-4">
              Como <span className="gradient-text">funciona</span>
            </h2>
            <p className="text-lg text-dark-400">Comece a automatizar em 3 passos simples</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {[
              {
                step: '01',
                title: 'Conecte seu WhatsApp',
                description: 'Escaneie o QR Code e conecte seu número em segundos. Suporte a múltiplos números.',
                icon: Smartphone,
              },
              {
                step: '02',
                title: 'Configure a IA e fluxos',
                description: 'Treine a IA com sua base de conhecimento. Monte automações visuais com drag & drop.',
                icon: GitBranch,
              },
              {
                step: '03',
                title: 'Atenda e converta',
                description: 'A IA responde 24/7, qualifica leads e move para o CRM. Acompanhe tudo no dashboard.',
                icon: BarChart3,
              },
            ].map((item) => (
              <div key={item.step} className="text-center">
                <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-zap-500/20 to-brand-500/20 border border-zap-500/20 flex items-center justify-center mx-auto mb-6">
                  <item.icon className="w-8 h-8 text-zap-400" />
                </div>
                <div className="text-sm font-bold text-zap-400 mb-2">Passo {item.step}</div>
                <h3 className="text-xl font-display font-bold text-white mb-3">{item.title}</h3>
                <p className="text-dark-400">{item.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* AI Feature Highlight */}
      <section className="py-20 px-6">
        <div className="max-w-6xl mx-auto">
          <div className="glass-card p-10 relative overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-r from-brand-500/5 to-zap-500/5" />
            <div className="relative grid grid-cols-1 md:grid-cols-2 gap-10 items-center">
              <div>
                <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-brand-500/10 border border-brand-500/20 mb-4">
                  <Brain className="w-4 h-4 text-brand-400" />
                  <span className="text-xs font-medium text-brand-400">IA Avançada</span>
                </div>
                <h2 className="text-3xl font-display font-bold mb-4">
                  IA Atendente que <span className="gradient-text">vende e qualifica</span> leads
                </h2>
                <p className="text-dark-400 mb-6 leading-relaxed">
                  Treine a IA com sua base de conhecimento e ela atende seus clientes 24/7,
                  tira dúvidas, qualifica leads e direciona para o atendente humano quando necessário.
                  Nunca mais perca um lead por falta de resposta.
                </p>
                <ul className="space-y-3 mb-8">
                  {[
                    'Respostas humanizadas com contexto da conversa',
                    'Integração com base de conhecimento da empresa',
                    'Encaminhamento automático para atendente humano',
                    'Análise de intenção e sentimento em tempo real',
                  ].map((item) => (
                    <li key={item} className="flex items-center gap-3 text-sm text-dark-300">
                      <Check className="w-4 h-4 text-zap-400 flex-shrink-0" />
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
              <div className="bg-dark-800/50 rounded-2xl border border-dark-700/30 p-6">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-8 h-8 rounded-full bg-brand-500/20 flex items-center justify-center">
                    <BotMessageSquare className="w-4 h-4 text-brand-400" />
                  </div>
                  <span className="text-sm font-semibold text-white">Megan - IA Atendente</span>
                  <span className="badge badge-green text-[10px] ml-auto">Online</span>
                </div>
                <div className="space-y-3">
                  <div className="flex gap-3">
                    <div className="w-8 h-8 rounded-full bg-dark-700 flex items-center justify-center text-xs font-bold text-dark-300">JC</div>
                    <div className="bg-dark-700/50 rounded-xl rounded-tl-none p-3 max-w-[80%]">
                      <p className="text-sm text-dark-200">Olá, tenho interesse no plano Pro</p>
                    </div>
                  </div>
                  <div className="flex gap-3 flex-row-reverse">
                    <div className="w-8 h-8 rounded-full bg-brand-500/20 flex items-center justify-center">
                      <BotMessageSquare className="w-4 h-4 text-brand-400" />
                    </div>
                    <div className="bg-brand-500/10 border border-brand-500/20 rounded-xl rounded-tr-none p-3 max-w-[80%]">
                      <p className="text-sm text-dark-200">Olá João! 😊 Claro, o plano Pro inclui 30.000 mensagens, atendentes ilimitados e webhooks. Quer que eu te mostre as funcionalidades?</p>
                    </div>
                  </div>
                  <div className="flex gap-3">
                    <div className="w-8 h-8 rounded-full bg-dark-700 flex items-center justify-center text-xs font-bold text-dark-300">JC</div>
                    <div className="bg-dark-700/50 rounded-xl rounded-tl-none p-3 max-w-[80%]">
                      <p className="text-sm text-dark-200">Sim, por favor!</p>
                    </div>
                  </div>
                  <div className="flex gap-3 flex-row-reverse">
                    <div className="w-8 h-8 rounded-full bg-brand-500/20 flex items-center justify-center">
                      <BotMessageSquare className="w-4 h-4 text-brand-400" />
                    </div>
                    <div className="bg-brand-500/10 border border-brand-500/20 rounded-xl rounded-tr-none p-3 max-w-[80%]">
                      <p className="text-sm text-dark-200">Perfeito! O plano Pro oferece CRM Kanban ilimitado, automações visuais, disparos em massa e rastreamento de anúncios. Posso direcionar para um especialista que vai te mostrar na prática?</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section id="pricing" className="py-20 px-6 bg-dark-900/30">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-display font-bold mb-4">
              Planos que <span className="gradient-text">crescem com você</span>
            </h2>
            <p className="text-lg text-dark-400">Escolha o plano ideal para o seu negócio</p>
          </div>

          {/* Plans without AI */}
          <div className="mb-8">
            <h3 className="text-center text-lg font-display font-bold text-dark-300 mb-6">Planos Sem IA</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-4xl mx-auto">
              {plans.filter(p => !p.name.includes('IA')).map((plan) => (
                <div
                  key={plan.name}
                  className={`glass-card p-8 relative ${
                    plan.popular
                      ? 'border-zap-500/50 shadow-glow'
                      : ''
                  }`}
                >
                  {plan.popular && (
                    <div className="absolute -top-4 left-1/2 -translate-x-1/2">
                      <span className="badge badge-green px-4 py-1.5 text-sm">
                        Mais Popular
                      </span>
                    </div>
                  )}
                  <h3 className="text-xl font-display font-bold text-white">{plan.name}</h3>
                  <p className="text-sm text-dark-400 mt-1 mb-4">{plan.description}</p>
                  <div className="flex items-baseline gap-1 mb-6">
                    <span className="text-sm text-dark-400">R$</span>
                    <span className="text-5xl font-display font-bold text-white">{plan.price}</span>
                    <span className="text-dark-400">{plan.period}</span>
                  </div>
                  {plan.trial && (
                    <div className="mb-4 px-3 py-2 rounded-lg bg-emerald-500/10 border border-emerald-500/20">
                      <span className="text-sm font-semibold text-emerald-400">🎉 Teste grátis por 7 dias</span>
                    </div>
                  )}
                  <ul className="space-y-3 mb-8">
                    {plan.features.map((f) => (
                      <li key={f} className="flex items-center gap-3 text-sm text-dark-300">
                        <Check className="w-4 h-4 text-zap-400 flex-shrink-0" />
                        {f}
                      </li>
                    ))}
                  </ul>
                  <Link
                    to="/register"
                    className={`w-full ${plan.popular ? 'btn-primary' : 'btn-secondary'} text-center block`}
                  >
                    {plan.cta}
                  </Link>
                </div>
              ))}
            </div>
          </div>

          {/* Plans with AI */}
          <div>
            <h3 className="text-center text-lg font-display font-bold text-dark-300 mb-6">Planos Com IA</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-4xl mx-auto">
              {plans.filter(p => p.name.includes('IA')).map((plan) => (
                <div
                  key={plan.name}
                  className="glass-card p-8 relative border-brand-500/30"
                >
                  <div className="absolute -top-4 left-1/2 -translate-x-1/2">
                    <span className="badge px-4 py-1.5 text-sm" style={{ background: 'linear-gradient(135deg, #6366f1, #a855f7)', color: 'white' }}>
                      <Brain className="w-3 h-3 inline mr-1" /> Com IA
                    </span>
                  </div>
                  <h3 className="text-xl font-display font-bold text-white">{plan.name}</h3>
                  <p className="text-sm text-dark-400 mt-1 mb-4">{plan.description}</p>
                  <div className="flex items-baseline gap-1 mb-6">
                    <span className="text-sm text-dark-400">R$</span>
                    <span className="text-5xl font-display font-bold text-white">{plan.price}</span>
                    <span className="text-dark-400">{plan.period}</span>
                  </div>
                  <ul className="space-y-3 mb-8">
                    {plan.features.map((f) => (
                      <li key={f} className="flex items-center gap-3 text-sm text-dark-300">
                        <Check className="w-4 h-4 text-brand-400 flex-shrink-0" />
                        {f}
                      </li>
                    ))}
                  </ul>
                  <Link
                    to="/register"
                    className="w-full btn-primary text-center block"
                    style={{ background: 'linear-gradient(135deg, #6366f1, #a855f7)' }}
                  >
                    {plan.cta}
                  </Link>
                </div>
              ))}
            </div>
          </div>

          <p className="text-center text-sm text-dark-500 mt-8">
            Número adicional: R$ 97,00/mês • Sem multa, cancele quando quiser
          </p>
        </div>
      </section>

      {/* Testimonials */}
      <section id="testimonials" className="py-20 px-6">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-display font-bold mb-4">
              O que nossos clientes <span className="gradient-text">dizem</span>
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {testimonials.map((t) => (
              <div key={t.name} className="glass-card p-6">
                <div className="flex gap-1 mb-4">
                  {Array.from({ length: t.rating }).map((_, i) => (
                    <Star key={i} className="w-4 h-4 text-yellow-400 fill-yellow-400" />
                  ))}
                </div>
                <p className="text-dark-300 mb-6 leading-relaxed text-sm">"{t.text}"</p>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-zap-500/20 to-brand-500/20 flex items-center justify-center text-sm font-bold text-zap-400">
                    {t.avatar}
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-white">{t.name}</p>
                    <p className="text-xs text-dark-400">{t.role}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ Section */}
      <section id="faq" className="py-20 px-6 bg-dark-900/30">
        <div className="max-w-3xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-display font-bold mb-4">
              Perguntas <span className="gradient-text">frequentes</span>
            </h2>
            <p className="text-lg text-dark-400">Tire suas dúvidas sobre a plataforma</p>
          </div>
          <div className="space-y-3">
            {faqs.map((faq) => (
              <FaqItem key={faq.q} q={faq.q} a={faq.a} />
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section with Lead Capture Form */}
      <section className="py-20 px-6">
        <div className="max-w-4xl mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-center">
            <div>
              <h2 className="text-4xl font-display font-bold mb-4">
                Pronto para automatizar?
              </h2>
              <p className="text-lg text-dark-400 mb-6">
                Comece com 7 dias grátis e descubra como o ZapFlow pode transformar seu atendimento no WhatsApp.
              </p>
              <ul className="space-y-3 mb-8">
                {[
                  'Setup em menos de 5 minutos',
                  'Suporte via chat ao vivo',
                  'Sem necessidade de cartão de crédito',
                  'Cancele quando quiser',
                ].map((item) => (
                  <li key={item} className="flex items-center gap-3 text-dark-300">
                    <Check className="w-5 h-5 text-zap-400 flex-shrink-0" />
                    {item}
                  </li>
                ))}
              </ul>
            </div>
            <LeadCaptureForm
              title="Teste Grátis por 7 Dias"
              subtitle="Preencha e comece agora mesmo"
            />
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-dark-700/30 py-12 px-6">
        <div className="max-w-7xl mx-auto">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-zap-500 to-brand-600 flex items-center justify-center">
                <Zap className="w-4 h-4 text-white" />
              </div>
              <span className="font-display font-bold">
                Zap<span className="text-zap-400">Flow</span>
              </span>
            </div>
            <p className="text-sm text-dark-500">
              © 2024 ZapFlow. Todos os direitos reservados.
            </p>
            <div className="flex gap-6">
              <a href="#" className="text-sm text-dark-400 hover:text-white transition-colors">Termos</a>
              <a href="#" className="text-sm text-dark-400 hover:text-white transition-colors">Privacidade</a>
              <a href="#" className="text-sm text-dark-400 hover:text-white transition-colors">Suporte</a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
