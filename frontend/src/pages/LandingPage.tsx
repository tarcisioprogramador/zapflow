import { Link } from 'react-router-dom';
import { useState } from 'react';
import {
  Zap, MessageSquare, Bot, GitBranch, Columns3, Send, BarChart3,
  Webhook, Shield, Users, Check, ArrowRight, Star, ChevronRight,
  Sparkles, Clock, Globe, Smartphone, Play, ChevronDown,
} from 'lucide-react';

const features = [
  {
    icon: MessageSquare,
    title: 'Multi-Número WhatsApp',
    description: 'Conecte múltiplos números e gerencie tudo em um só lugar. Atendimento profissional sem limites.',
    color: 'text-zap-400',
    bg: 'bg-zap-500/10',
  },
  {
    icon: Bot,
    title: 'IA Inteligente',
    description: 'Assistente virtual que entende contexto, qualifica leads e vende 24/7 de forma humanizada.',
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
    description: 'Envie campanhas para milhares de contatos com personalização e agendamento inteligente.',
    color: 'text-emerald-400',
    bg: 'bg-emerald-500/10',
  },
  {
    icon: BarChart3,
    title: 'Analytics Completo',
    description: 'Métricas de mensagens, conversões, performance da IA e ROI das suas campanhas.',
    color: 'text-red-400',
    bg: 'bg-red-500/10',
  },
  {
    icon: Webhook,
    title: 'Integrações & API',
    description: 'Webhooks, API pública e integração com suas ferramentas favoritas.',
    color: 'text-cyan-400',
    bg: 'bg-cyan-500/10',
  },
  {
    icon: Globe,
    title: 'Remarketing',
    description: 'Sequências automáticas de follow-up para reengajar leads e aumentar o LTV.',
    color: 'text-pink-400',
    bg: 'bg-pink-500/10',
  },
];

const plans = [
  {
    name: 'Starter',
    price: '97',
    period: '/mês',
    description: 'Perfeito para começar a automatizar',
    features: [
      '1 número WhatsApp',
      '5 atendentes',
      'CRM Kanban (2 quadros)',
      'Automações básicas',
      'Disparos (500/mês)',
      'Suporte por email',
    ],
    cta: 'Começar Grátis',
    popular: false,
  },
  {
    name: 'Pro',
    price: '197',
    period: '/mês',
    description: 'Para negócios que querem escalar',
    features: [
      '3 números WhatsApp',
      'Atendentes ilimitados',
      'CRM Kanban ilimitado',
      'IA Integrada (GPT-4)',
      'Disparos ilimitados',
      'Webhooks & API',
      'Remarketing automático',
      'Suporte prioritário',
    ],
    cta: 'Assinar Pro',
    popular: true,
  },
  {
    name: 'Enterprise',
    price: '497',
    period: '/mês',
    description: 'Solução completa para grandes operações',
    features: [
      'Números ilimitados',
      'Tudo do Pro',
      'Suporte 24/7',
      'Integrações custom',
      'Onboarding dedicado',
      'SLA garantido',
      'White label disponível',
    ],
    cta: 'Falar com Vendas',
    popular: false,
  },
];

const testimonials = [
  {
    name: 'Carlos Mendes',
    role: 'CEO, TechVendas',
    text: 'Aumentamos a conversão em 340% depois que automatizamos o atendimento com ZapFlow. A IA responde como um humano!',
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
    text: 'Finalmente uma plataforma brasileira que funciona de verdade. Suporte excelente e produto top.',
    rating: 5,
    avatar: 'RS',
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
    q: 'Preciso saber programar para usar o ZapFlow?',
    a: 'Não! O ZapFlow foi feito para ser usado por qualquer pessoa. O construtor de fluxos é visual (arrastar e soltar) e a IA faz o trabalho pesado por você.',
  },
  {
    q: 'Como funciona a conexão com o WhatsApp?',
    a: 'Basta escanear um QR Code com seu WhatsApp, igual ao WhatsApp Web. Conectamos via API oficial, sem precisar de extensões de navegador.',
  },
  {
    a: 'A IA utiliza GPT-4 para entender contexto e responder de forma humanizada. Você treina ela com sua base de conhecimento e ela responde como um atendente real.',
    q: 'A IA realmente funciona ou é só um chatbot básico?',
  },
  {
    q: 'Posso cancelar a qualquer momento?',
    a: 'Sim! Sem multa, sem burocracia. Cancele quando quiser pelo painel de configurações. Seu acesso continua até o final do período pago.',
  },
  {
    q: 'Quantos atendentes posso ter?',
    a: 'No plano Starter, até 5 atendentes. Nos planos Pro e Enterprise, atendentes ilimitados. Cada um com seu próprio acesso ao sistema.',
  },
  {
    q: 'Vocês oferecem suporte?',
    a: 'Sim! Plano Starter tem suporte por email. Plano Pro tem suporte prioritário. Plano Enterprise tem suporte 24/7 com SLA garantido.',
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
        {/* Background Effects */}
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-zap-500/10 rounded-full blur-3xl" />
          <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-brand-500/10 rounded-full blur-3xl" />
        </div>

        <div className="max-w-7xl mx-auto relative">
          <div className="text-center max-w-4xl mx-auto">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-zap-500/10 border border-zap-500/20 mb-8 animate-fade-in">
              <Sparkles className="w-4 h-4 text-zap-400" />
              <span className="text-sm font-medium text-zap-400">Novo: IA que vende e qualifica leads automaticamente</span>
            </div>

            <h1 className="text-5xl md:text-7xl font-display font-extrabold leading-tight mb-6 animate-slide-up">
              Automação{' '}
              <span className="gradient-text">inteligente</span>
              <br />
              via WhatsApp
            </h1>

            <p className="text-xl text-dark-400 max-w-2xl mx-auto mb-10 leading-relaxed">
              Atenda, venda e faça marketing no WhatsApp com IA, fluxos automáticos e CRM integrado.
              Tudo em uma única plataforma.
            </p>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-16">
              <Link to="/register" className="btn-primary text-lg px-8 py-4 flex items-center gap-2 group">
                Começar Grátis
                <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
              </Link>
              <Link to="/login" className="btn-secondary text-lg px-8 py-4 flex items-center gap-2">
                <Play className="w-5 h-5" />
                Ver Demo
              </Link>
            </div>

            {/* Stats */}
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
                title: 'Crie seus fluxos',
                description: 'Monte automações visuais com drag & drop. Defina gatilhos, respostas e ações.',
                icon: GitBranch,
              },
              {
                step: '03',
                title: 'Atenda e converta',
                description: 'A IA responde automaticamente, qualifica leads e move para o CRM. Acompanhe tudo no dashboard.',
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

      {/* Pricing Section */}
      <section id="pricing" className="py-20 px-6">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-display font-bold mb-4">
              Planos que <span className="gradient-text">crescem com você</span>
            </h2>
            <p className="text-lg text-dark-400">Comece grátis, escale quando precisar</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {plans.map((plan) => (
              <div
                key={plan.name}
                className={`glass-card p-8 relative ${
                  plan.popular
                    ? 'border-zap-500/50 shadow-glow scale-105'
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
      </section>

      {/* Testimonials */}
      <section id="testimonials" className="py-20 px-6 bg-dark-900/30">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-display font-bold mb-4">
              O que nossos clientes <span className="gradient-text">dizem</span>
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {testimonials.map((t) => (
              <div key={t.name} className="glass-card p-6">
                <div className="flex gap-1 mb-4">
                  {Array.from({ length: t.rating }).map((_, i) => (
                    <Star key={i} className="w-4 h-4 text-yellow-400 fill-yellow-400" />
                  ))}
                </div>
                <p className="text-dark-300 mb-6 leading-relaxed">"{t.text}"</p>
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
      <section id="faq" className="py-20 px-6">
        <div className="max-w-3xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-display font-bold mb-4">
              Perguntas <span className="gradient-text">frequentes</span>
            </h2>
            <p className="text-lg text-dark-400">Tire suas dúvidas sobre o ZapFlow</p>
          </div>
          <div className="space-y-3">
            {faqs.map((faq) => (
              <FaqItem key={faq.q} q={faq.q} a={faq.a} />
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 px-6">
        <div className="max-w-4xl mx-auto text-center">
          <div className="glass-card p-12 relative overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-r from-zap-500/10 to-brand-500/10" />
            <div className="relative">
              <h2 className="text-4xl font-display font-bold mb-4">
                Pronto para automatizar?
              </h2>
              <p className="text-lg text-dark-400 mb-8 max-w-2xl mx-auto">
                Comece gratuitamente e descubra como o ZapFlow pode transformar seu atendimento no WhatsApp.
              </p>
              <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                <Link to="/register" className="btn-primary text-lg px-8 py-4 flex items-center gap-2 group">
                  Criar Conta Grátis
                  <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                </Link>
                <span className="text-sm text-dark-500">Sem cartão de crédito • Cancele quando quiser</span>
              </div>
            </div>
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
