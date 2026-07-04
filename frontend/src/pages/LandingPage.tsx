import { Link } from 'react-router-dom';
import { useEffect, useRef, useState } from 'react';
import {
  Zap, MessageSquare, Bot, GitBranch, Columns3, Send,
  Webhook, Users, Check, ChevronDown, Star,
  Smartphone, Play, Brain, Repeat, BotMessageSquare,
  Target, Clock, TrendingUp, X, Phone,
  ShoppingCart, ThumbsUp, HelpCircle, Sparkles, ArrowRight,
  Radio,
} from 'lucide-react';

// ─── Scroll Reveal Hook ─────────────────────────────────
function useReveal(threshold = 0.15) {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) { setVisible(true); observer.unobserve(el); } },
      { threshold }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [threshold]);

  return { ref, visible };
}

function RevealSection({ children, delay = 0, className = '' }: { children: React.ReactNode; delay?: number; className?: string }) {
  const { ref, visible } = useReveal();
  return (
    <div
      ref={ref}
      className={`transition-all duration-700 ease-out ${visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'} ${className}`}
      style={{ transitionDelay: `${delay}ms` }}
    >
      {children}
    </div>
  );
}

// ─── Hero Particles ─────────────────────────────────────
function HeroParticles() {
  const particles = [
    { size: 4, x: '15%', y: '20%', delay: 0, color: 'zap' },
    { size: 3, x: '80%', y: '30%', delay: 1, color: 'brand' },
    { size: 5, x: '25%', y: '70%', delay: 2, color: 'zap' },
    { size: 3, x: '70%', y: '65%', delay: 0.5, color: 'brand' },
    { size: 4, x: '50%', y: '15%', delay: 1.5, color: 'zap' },
    { size: 6, x: '10%', y: '50%', delay: 0.8, color: 'brand' },
    { size: 3, x: '90%', y: '55%', delay: 1.2, color: 'zap' },
  ];

  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      {particles.map((p, i) => (
        <div
          key={i}
          className={`absolute rounded-full animate-float opacity-20 ${p.color === 'zap' ? 'bg-zap-400' : 'bg-brand-400'}`}
          style={{
            width: p.size * 4,
            height: p.size * 4,
            left: p.x,
            top: p.y,
            animationDelay: `${p.delay}s`,
            animationDuration: `${3 + Math.random() * 2}s`,
          }}
        />
      ))}
      {/* Gradient orbs */}
      <div className="absolute top-1/3 -left-32 w-96 h-96 bg-zap-500/10 rounded-full blur-3xl animate-float" style={{ animationDuration: '6s' }} />
      <div className="absolute bottom-1/4 -right-32 w-80 h-80 bg-brand-500/8 rounded-full blur-3xl animate-float" style={{ animationDuration: '8s', animationDelay: '1s' }} />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-gradient-to-r from-zap-500/3 to-brand-500/3 rounded-full blur-3xl" />
    </div>
  );
}

// ─── Chat Bubble ────────────────────────────────────────
function ChatBubble({ message, isBot = true, delay = 0 }: { message: string; isBot?: boolean; delay?: number }) {
  return (
    <div
      className={`flex ${isBot ? 'justify-start' : 'justify-end'} chat-bubble`}
      style={{ animationDelay: `${delay}s` }}
    >
      <div
        className={`max-w-[85%] px-4 py-2.5 rounded-2xl text-sm leading-relaxed ${
          isBot
            ? 'bg-zap-500/15 text-zap-100 rounded-bl-md border border-zap-500/10'
            : 'bg-brand-500/15 text-brand-100 rounded-br-md border border-brand-500/10'
        }`}
      >
        {message}
      </div>
    </div>
  );
}

// ─── Typing Indicator ───────────────────────────────────
function TypingIndicator() {
  return (
    <div className="flex justify-start chat-bubble" style={{ animationDelay: '1.4s' }}>
      <div className="bg-dark-700/60 rounded-2xl rounded-bl-md px-4 py-3 border border-dark-600/30">
        <div className="flex gap-1.5">
          <div className="w-2 h-2 rounded-full bg-zap-400/60 typing-dot" />
          <div className="w-2 h-2 rounded-full bg-zap-400/60 typing-dot" />
          <div className="w-2 h-2 rounded-full bg-zap-400/60 typing-dot" />
        </div>
      </div>
    </div>
  );
}

// ─── Data ───────────────────────────────────────────────
const features = [
  { icon: MessageSquare, title: 'Multi-WhatsApp e Multi-Acessos', description: 'Tenha vários números operando na mesma conta — cada um com seu fluxo, seus leads, seus webhooks, ou se preferir tudo centralizado tenha também. Você decide seu time trabalhando junto ou separado.' },
  { icon: Send, title: 'Disparos em massa', description: 'Nada de "campanha controlada" ou com firula. Crie campanhas e envie fluxos com texto, imagem, vídeo, áudio e até GIF. Sua lista inteira em ação com 1 clique.' },
  { icon: GitBranch, title: 'Construtor de Fluxos Inteligente', description: 'Crie fluxos automatizados com gatilhos, respostas condicionais e entregas programadas, com uma interface simples e poderosa. Seu funil no WhatsApp do jeito certo.' },
  { icon: Brain, title: 'IA Treinada Para Vender no Seu Lugar', description: 'A "Megan", nossa IA de atendimento, trabalha 24h por dia, 7 dias por semana, sem salário, sem 13º, sem desculpa. Você configura uma vez e ela nunca mais para. Converte curiosos em compradores — no automático.' },
  { icon: Target, title: 'Rastreamento de Anúncio', description: 'Capture automaticamente o ID, thumbnail, título e texto de conversão dos seus anúncios. Entenda exatamente de onde vem cada lead. Você sabe o que está funcionando — com dados.' },
  { icon: Columns3, title: 'Dashboard e CRM com Kanban', description: 'Acompanhe suas vendas em tempo real. Cada cliente é rotulado automaticamente e avança no seu funil sem esforço manual, visualize o pipeline, otimize e venda mais.' },
  { icon: Smartphone, title: '100% em nuvem + App mobile', description: 'Use no PC, no celular, onde quiser. Seu time inteiro, sua operação toda, em qualquer lugar, liberdade e velocidade no atendimento.' },
  { icon: Webhook, title: 'Integrações com as principais plataformas', description: 'Troque informações com nossa ferramenta e consiga mais sucesso ao converter suas vendas através do WhatsApp.' },
];

const targetAudience = [
  'É infoprodutor e quer aumentar a conversão no 1-a-1',
  'É vendedor e quer atender + pessoas com + velocidade',
  'É afiliado e precisa de estrutura pra escalar',
  'É microempresário e quer atendimento profissional',
  'É agência e quer centralizar a operação dos clientes',
  'É empreendedor digital e cansou de soluções mequetrefes',
];

const plans = [
  { name: 'IA Starter', price: '97', period: '/mês', popular: false, features: [
      '1 Número conectado', 'Acesso ao painel de controle simples e completo',
      'Chat integrado com 5 atendentes inclusos', 'Envie mensagens em massa com campanhas ilimitadas',
      'Chatbots ilimitados para automatizar conversas', 'Gerencie até 1 grupo com bate-papo exclusivo',
      'CRM Kanban automatizado (com até 2 quadros)', 'Sempre online – sua operação 24h no ar',
      'Até 15.000 Webhooks pra integrar com outras ferramentas', 'Trackeamento de anúncio',
      '5 Milhões de Tokens de IA',
    ], cta: 'Escolher Starter' },
  { name: 'IA Pro', price: '197', period: '/mês', popular: true, features: [
      '1 Número conectado', 'Acesso ao painel de controle simples e completo',
      'Atendentes ilimitados no bate-papo', 'Envie mensagens em massa com campanhas ilimitadas',
      'Chatbots ilimitados para automatizar conversas', 'Gerencie até 3 grupos com bate-papo exclusivo',
      'CRM Kanban automatizado (com até 5 quadros)', 'Sempre online – sua operação 24h no ar',
      'Até 30.000 Webhooks pra integrar com outras ferramentas', 'Trackeamento de anúncio',
      '10 Milhões de Tokens de IA', 'Conecte com sistemas externos via integração (Post, Put, Get)',
    ], cta: 'Escolher Pro' },
];

const faqs = [
  { q: 'Não sou bom com tecnologia. Como vou saber o que fazer?', a: 'A ferramenta do ZapFlow é a mais fácil do mercado para construção de conversas automáticas. Você simplesmente arrasta um bloco de conversa para conectar com outro e seu robô fica pronto em minutos. Você tem acesso a todo um treinamento em vídeo aulas que te mostram como criar o robô que quiser. E nosso time de suporte está sempre disponível para tirar dúvidas.' },
  { q: 'Como consigo conectar meu WhatsApp ao ZapFlow?', a: 'A conexão com o ZapFlow é a mesma realizada com o WhatsApp web. Basta escanear o QR Code da plataforma e seu WhatsApp estará conectado.' },
  { q: 'Quantos números de WhatsApp consigo conectar na plataforma?', a: 'Você pode conectar um número de WhatsApp por conta. E você pode ter quantas contas quiser no mesmo painel. Não existe limite de compra de contas.' },
  { q: 'Meu computador precisa ficar ligado para o robô funcionar?', a: 'Não. Após escanear o QR Code do ZapFlow o seu WhatsApp estará conectado e não será necessário manter nada aberto. A automação vai funcionar até mesmo com seu celular desligado.' },
  { q: 'O que é um robô?', a: 'Um robô nada mais é do que um fluxo de conversa pré-definido. Pensa na conversa que precisa acontecer para você realizar um agendamento do cliente pelo WhatsApp. Toda essa conversa pode ser pré definida e automatizada. Esse fluxo de conversa pré definido é o que chamamos de robô.' },
  { q: 'Quantos robôs posso criar?', a: 'Você pode criar quantos robôs ou fluxos de conversas você quiser. Você pode literalmente automatizar todo tipo de conversa que acontece no seu WhatsApp.' },
  { q: 'O que são palavras chaves?', a: 'São palavras ou frases que acionam os seus robôs. Você pode, por exemplo, criar a palavra chave "preço" para acionar o robô de cardápio/menu toda vez que um cliente enviar uma mensagem que contenha essa palavra.' },
  { q: 'Se eu não gostar, como cancelo?', a: 'Você tem 7 dias para testar toda a ferramenta do ZapFlow e caso deseje cancelar é só enviar um email para cancelamento@zapflow.com dentro do prazo dos 7 dias. Seu dinheiro será 100% devolvido sem perguntas.' },
];

function FaqItem({ q, a }: { q: string; a: string }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="border border-dark-700/30 rounded-xl overflow-hidden bg-dark-800/30 transition-all duration-300 hover:border-dark-600/50">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between p-5 text-left hover:bg-dark-800/50 transition-colors gap-4"
      >
        <span className="text-sm font-medium text-white pr-4">{q}</span>
        <div className={`w-8 h-8 rounded-lg bg-dark-700/50 flex items-center justify-center flex-shrink-0 transition-all duration-300 ${open ? 'bg-zap-500/20 rotate-180' : ''}`}>
          <ChevronDown className={`w-4 h-4 text-dark-400 transition-colors duration-300 ${open ? 'text-zap-400' : ''}`} />
        </div>
      </button>
      <div className={`grid transition-all duration-300 ${open ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0'}`}>
        <div className="overflow-hidden">
          <div className="px-5 pb-5 border-t border-dark-700/20 pt-4">
            <p className="text-sm text-dark-400 leading-relaxed">{a}</p>
          </div>
        </div>
      </div>
    </div>
  );
}

const testimonials = [
  { name: 'Carlos Mendes', role: 'CEO, TechVendas', text: 'Aumentamos a conversão em 340% depois que automatizamos o atendimento. A IA responde como um humano e nunca perde um lead!', rating: 5, avatar: 'CM' },
  { name: 'Fernanda Silva', role: 'Diretora Comercial, InnovaGroup', text: 'Em 3 meses triplicamos nossos leads qualificados. O CRM Kanban e os fluxos automáticos são incríveis.', rating: 5, avatar: 'FS' },
  { name: 'Ricardo Santos', role: 'Fundador, DigitalPro', text: 'O rastreamento de anúncios mudou nosso jogo. Agora sabemos exatamente de onde vêm nossos clientes e otimizamos cada real investido.', rating: 5, avatar: 'RS' },
  { name: 'Ana Paula Costa', role: 'Empreendedora, ModaFitness', text: 'Nunca foi tão fácil criar automações milionárias! A IA Megan atende 24/7 e eu durmo tranquila sabendo que nenhum lead é perdido.', rating: 5, avatar: 'AC' },
];

const challenges = [
  { icon: Clock, text: 'Atendimento lento e ineficiente' },
  { icon: X, text: 'Perda de clientes por falta de respostas' },
  { icon: Phone, text: 'Vários números de WhatsApp' },
  { icon: ThumbsUp, text: 'Time de atendimento desmotivado' },
  { icon: Target, text: 'Problemas para bater metas' },
  { icon: Users, text: 'Confusão no time comercial' },
  { icon: MessageSquare, text: 'Cliente com péssimas experiências' },
  { icon: ShoppingCart, text: 'Custo elevado com funcionários' },
  { icon: TrendingUp, text: 'Dificuldade em escalar' },
];

const whyReasons = [
  { icon: TrendingUp, title: 'Aumento na conversão de vendas', desc: 'Atendimentos mais rápidos, personalizados e no tempo certo — feitos por uma IA que entende de resultado.' },
  { icon: ShoppingCart, title: 'Diminue os custos operacionais', desc: 'Reduza seu time de atendimento sem perder performance. Automatize o que ninguém consegue escalar no braço.' },
  { icon: Bot, title: 'Atendimentos resolvidos automaticamente', desc: 'Enquanto você dorme, nossa IA está vendendo, tirando dúvidas e aquecendo leads. E o melhor: sem salário, sem férias, sem desculpas.' },
];

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-dark-950 text-white overflow-hidden">
      {/* ─── Navigation ─────────────────────────────── */}
      <nav className="fixed top-0 w-full z-50 bg-dark-950/80 backdrop-blur-xl border-b border-dark-700/30">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-3 group">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-zap-500 to-brand-600 flex items-center justify-center shadow-lg shadow-zap-500/20 group-hover:shadow-zap-500/30 transition-shadow">
              <Zap className="w-5 h-5 text-white" />
            </div>
            <span className="text-lg font-heading font-bold">
              Zap<span className="text-zap-400">Flow</span>
            </span>
          </Link>
          <div className="hidden md:flex items-center gap-6">
            <a href="#hero" className="text-sm text-dark-400 hover:text-white transition-colors">Inicio</a>
            <a href="#features" className="text-sm text-dark-400 hover:text-white transition-colors">Funções</a>
            <a href="#pricing" className="text-sm text-dark-400 hover:text-white transition-colors">Planos</a>
            <a href="#testimonials" className="text-sm text-dark-400 hover:text-white transition-colors">Depoimentos</a>
            <a href="#faq" className="text-sm text-dark-400 hover:text-white transition-colors">FAQ</a>
          </div>
          <Link
            to="/login"
            className="bg-zap-500 hover:bg-zap-600 text-white font-semibold px-5 py-2.5 rounded-lg transition-all duration-200 shadow-lg shadow-zap-500/20 hover:shadow-zap-500/30 active:scale-[0.98] text-sm btn-glow"
          >
            Conecte-se
          </Link>
        </div>
      </nav>

      {/* ─── Hero Section ──────────────────────────── */}
      <section id="hero" className="relative min-h-screen flex items-center pt-24 pb-20 px-6 overflow-hidden">
        <HeroParticles />

        <div className="max-w-7xl mx-auto relative w-full">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            {/* Left: Text */}
            <div className="text-center lg:text-left">
              <RevealSection>
                <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-zap-500/10 border border-zap-500/20 mb-6">
                  <Sparkles className="w-4 h-4 text-zap-400" />
                  <span className="text-xs font-semibold text-zap-400 tracking-wide">AUTOMAÇÃO COM IA</span>
                </div>
              </RevealSection>

              <RevealSection delay={100}>
                <h1 className="text-4xl md:text-6xl lg:text-7xl font-heading font-extrabold leading-[1.1] mb-6">
                  Automação de verdade com{' '}
                  <span className="bg-clip-text text-transparent bg-gradient-to-r from-zap-400 via-zap-300 to-brand-400 bg-[length:200%] animate-gradient-shift">
                    IA no WhatsApp
                  </span>
                </h1>
              </RevealSection>

              <RevealSection delay={200}>
                <p className="text-lg md:text-xl text-dark-400 max-w-xl mx-auto lg:mx-0 mb-4 leading-relaxed font-heading font-semibold">
                  Nunca foi tão fácil criar automações milionárias, e agora, sua IA também vende por você.
                </p>
                <p className="text-base text-dark-500 max-w-xl mx-auto lg:mx-0 mb-10 leading-relaxed">
                  Esqueça o atendimento manual. Com o ZapFlow, você cria fluxos em minutos e deixa sua IA fechar negócios sozinha.
                </p>
              </RevealSection>

              <RevealSection delay={300}>
                <div className="flex flex-col sm:flex-row items-center lg:items-start gap-4 mb-12">
                  <Link
                    to="/register"
                    className="group bg-zap-500 hover:bg-zap-600 text-white font-bold text-lg px-8 py-4 rounded-lg transition-all duration-200 shadow-lg shadow-zap-500/30 hover:shadow-zap-500/40 active:scale-[0.98] flex items-center gap-2 btn-glow"
                  >
                    Contratar Plano!
                    <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                  </Link>
                  <Link
                    to="/register"
                    className="bg-dark-800/80 hover:bg-dark-700/80 text-dark-200 font-medium text-lg px-8 py-4 rounded-lg transition-all duration-200 border border-dark-600 hover:border-zap-500/30 active:scale-[0.98] flex items-center gap-2"
                  >
                    <Play className="w-5 h-5" />
                    Teste grátis
                  </Link>
                </div>
              </RevealSection>

              <RevealSection delay={400}>
                <div className="flex flex-wrap items-center justify-center lg:justify-start gap-3">
                  {[
                    { icon: Bot, label: 'Automação' },
                    { icon: GitBranch, label: 'Fluxo de conversas' },
                    { icon: Repeat, label: 'Remarketing' },
                    { icon: BotMessageSquare, label: 'IA Megan' },
                    { icon: Columns3, label: 'CRM Kanban' },
                  ].map((badge) => (
                    <div key={badge.label} className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-dark-800/50 border border-dark-700/40 text-xs text-dark-300 hover:border-zap-500/30 hover:text-zap-300 transition-all duration-300">
                      <badge.icon className="w-3.5 h-3.5 text-zap-400" />
                      <span>{badge.label}</span>
                    </div>
                  ))}
                </div>
              </RevealSection>
            </div>

            {/* Right: Chat Preview */}
            <RevealSection delay={200} className="hidden lg:block">
              <div className="relative">
                {/* Phone frame */}
                <div className="relative mx-auto w-[340px]">
                  {/* Phone body */}
                  <div className="bg-dark-800/60 backdrop-blur-xl rounded-[40px] border border-dark-600/40 p-4 shadow-2xl shadow-zap-500/5">
                    {/* Phone notch */}
                    <div className="flex items-center justify-between mb-4 px-2">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-zap-500 to-brand-600 flex items-center justify-center">
                          <Zap className="w-4 h-4 text-white" />
                        </div>
                        <div>
                          <p className="text-xs font-semibold text-white">ZapFlow IA</p>
                          <p className="text-[10px] text-zap-400">Online</p>
                        </div>
                      </div>
                      <div className="flex gap-1">
                        <Radio className="w-3.5 h-3.5 text-zap-400 animate-pulse" />
                      </div>
                    </div>

                    {/* Chat messages */}
                    <div className="space-y-3 min-h-[320px]">
                      <ChatBubble message="Olá! 👋 Como posso ajudar sua empresa hoje?" isBot delay={0.2} />
                      <ChatBubble message="Quero saber mais sobre os planos!" isBot={false} delay={0.6} />
                      <ChatBubble message="Claro! Temos planos a partir de R$97/mês. Com nossa IA Megan, você automatiza atendimento 24h. Quer ver os detalhes? 🚀" isBot delay={1.0} />
                      <TypingIndicator />
                    </div>

                    {/* Input field */}
                    <div className="mt-3 flex items-center gap-2 bg-dark-700/50 rounded-2xl px-4 py-3 border border-dark-600/30">
                      <MessageSquare className="w-4 h-4 text-dark-400" />
                      <span className="text-xs text-dark-500 flex-1">Digite sua mensagem...</span>
                      <div className="w-7 h-7 rounded-full bg-zap-500/20 flex items-center justify-center">
                        <Send className="w-3.5 h-3.5 text-zap-400" />
                      </div>
                    </div>
                  </div>

                  {/* Glow effect behind phone */}
                  <div className="absolute -inset-8 bg-gradient-to-br from-zap-500/10 to-brand-500/10 rounded-[48px] blur-2xl -z-10" />
                </div>
              </div>
            </RevealSection>
          </div>
        </div>
      </section>

      {/* ─── Section Divider ───────────────────────── */}
      <div className="section-divider" />

      {/* ─── Challenges Section ────────────────────── */}
      <section className="py-20 px-6">
        <div className="max-w-5xl mx-auto">
          <RevealSection>
            <h2 className="text-3xl md:text-4xl font-heading font-bold text-center mb-4">
              Você tem algum desses desafios na sua empresa?
            </h2>
            <p className="text-dark-400 text-center mb-12 max-w-2xl mx-auto">
              Se você reconhece algum desses problemas, o ZapFlow foi feito para você.
            </p>
          </RevealSection>

          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
            {challenges.map((challenge, i) => (
              <RevealSection key={challenge.text} delay={i * 50}>
                <div className="flex items-center gap-3 p-4 glass-card hover:border-zap-500/20 hover:bg-zap-500/5 transition-all duration-300 group">
                  <challenge.icon className="w-5 h-5 text-zap-400 flex-shrink-0 group-hover:scale-110 transition-transform" />
                  <span className="text-sm text-dark-300">{challenge.text}</span>
                </div>
              </RevealSection>
            ))}
            <RevealSection delay={challenges.length * 50}>
              <div className="flex items-center gap-3 p-4 glass-card border-dashed border-zap-500/20">
                <HelpCircle className="w-5 h-5 text-zap-400 flex-shrink-0" />
                <span className="text-sm text-dark-300">Entre outros...</span>
              </div>
            </RevealSection>
          </div>
        </div>
      </section>

      {/* ─── Section Divider ───────────────────────── */}
      <div className="section-divider" />

      {/* ─── Value Proposition ─────────────────────── */}
      <section className="py-20 px-6">
        <div className="max-w-5xl mx-auto text-center">
          <RevealSection>
            <h2 className="text-3xl md:text-4xl font-heading font-bold mb-6">
              O futuro das vendas começa com o <span className="text-zap-400">ZapFlow</span>
            </h2>
            <p className="text-lg text-dark-400 max-w-4xl mx-auto leading-relaxed mb-8">
              Dê adeus às extensões instáveis e plataformas limitadas, com o ZapFlow, você cria fluxos inteligentes,
              envia áudios e mídias com facilidade, e ainda tem uma IA vendendo por você todos os dias,
              a escolha ideal para escalar o atendimento e multiplicar suas vendas.
            </p>
            <p className="text-base text-dark-500 font-semibold">
              Não é só mais uma "ferramenta de WhatsApp". É o fim das limitações.
            </p>
            <div className="mt-8">
              <Link to="/register" className="group bg-zap-500 hover:bg-zap-600 text-white font-bold px-8 py-4 rounded-lg transition-all inline-flex items-center gap-2 shadow-lg shadow-zap-500/30 btn-glow">
                Contratar Agora!
                <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
              </Link>
            </div>
          </RevealSection>
        </div>
      </section>

      {/* ─── Section Divider ───────────────────────── */}
      <div className="section-divider" />

      {/* ─── Features Section ──────────────────────── */}
      <section id="features" className="py-20 px-6">
        <div className="max-w-6xl mx-auto">
          <RevealSection>
            <h2 className="text-3xl md:text-4xl font-heading font-bold text-center mb-4">
              Tudo que você precisa para escalar
            </h2>
            <p className="text-dark-400 text-center mb-12 max-w-2xl mx-auto">
              Uma plataforma completa para automatizar seu atendimento no WhatsApp.
            </p>
          </RevealSection>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {features.map((feature, i) => (
              <RevealSection key={feature.title} delay={i * 80}>
                <div className="feature-card glass-card p-6 hover:border-zap-500/30 hover:bg-zap-500/3 transition-all duration-300 group">
                  <div className="feature-icon w-12 h-12 rounded-xl bg-zap-500/10 flex items-center justify-center mb-4 group-hover:bg-zap-500/20 transition-all">
                    <feature.icon className="w-6 h-6 text-zap-400" />
                  </div>
                  <h3 className="text-lg font-heading font-bold text-white mb-2">{feature.title}</h3>
                  <p className="text-sm text-dark-400 leading-relaxed">{feature.description}</p>
                </div>
              </RevealSection>
            ))}
          </div>
        </div>
      </section>

      {/* ─── Section Divider ───────────────────────── */}
      <div className="section-divider" />

      {/* ─── Target Audience ───────────────────────── */}
      <section className="py-20 px-6">
        <div className="max-w-4xl mx-auto">
          <RevealSection>
            <h2 className="text-3xl md:text-4xl font-heading font-bold text-center mb-4">
              ZapFlow é para você se:
            </h2>
          </RevealSection>
          <div className="mt-10 space-y-3">
            {targetAudience.map((item, i) => (
              <RevealSection key={item} delay={i * 80}>
                <div className="flex items-start gap-4 p-4 rounded-xl hover:bg-dark-800/30 transition-colors group">
                  <div className="w-8 h-8 rounded-full bg-zap-500/15 flex items-center justify-center flex-shrink-0 mt-0.5 group-hover:bg-zap-500/25 transition-colors">
                    <Check className="w-4 h-4 text-zap-400" />
                  </div>
                  <p className="text-base text-dark-200">{item}</p>
                </div>
              </RevealSection>
            ))}
          </div>
        </div>
      </section>

      {/* ─── Section Divider ───────────────────────── */}
      <div className="section-divider" />

      {/* ─── Remarketing Section ───────────────────── */}
      <section className="py-20 px-6">
        <div className="max-w-5xl mx-auto text-center">
          <RevealSection>
            <div className="w-16 h-16 rounded-2xl bg-zap-500/10 flex items-center justify-center mx-auto mb-6">
              <Repeat className="w-8 h-8 text-zap-400" />
            </div>
            <h2 className="text-3xl md:text-4xl font-heading font-bold mb-4">
              Remarketing inteligente
            </h2>
            <p className="text-lg text-dark-400 max-w-3xl mx-auto leading-relaxed">
              Crie uma sequência de ofertas estratégicas para seu cliente e fature muito mais,
              sem precisar de mais anúncios. Aumentando seu LTV faturando mais com o mesmo cliente.
            </p>
          </RevealSection>
        </div>
      </section>

      {/* ─── Section Divider ───────────────────────── */}
      <div className="section-divider" />

      {/* ─── Why ZapFlow ───────────────────────────── */}
      <section className="py-20 px-6">
        <div className="max-w-6xl mx-auto">
          <RevealSection>
            <h2 className="text-3xl md:text-4xl font-heading font-bold text-center mb-4">
              Por que o <span className="text-zap-400">ZapFlow</span> é a escolha definitiva?
            </h2>
            <p className="text-base text-dark-400 text-center max-w-4xl mx-auto mb-12 leading-relaxed">
              Somos a ferramenta mais fácil em criar automação com IA e atendimento inteligente via WhatsApp.
              Criamos um sistema que automatiza de verdade, sem gambiarra, sem extensão.
            </p>
          </RevealSection>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
            {whyReasons.map((reason, i) => (
              <RevealSection key={reason.title} delay={i * 100}>
                <div className="gradient-border-card rounded-xl p-6 text-center h-full">
                  <div className="w-14 h-14 rounded-xl bg-zap-500/10 flex items-center justify-center mx-auto mb-4">
                    <reason.icon className="w-7 h-7 text-zap-400" />
                  </div>
                  <h3 className="text-lg font-heading font-bold text-white mb-3">{reason.title}</h3>
                  <p className="text-sm text-dark-400 leading-relaxed">{reason.desc}</p>
                </div>
              </RevealSection>
            ))}
          </div>
        </div>
      </section>

      {/* ─── Section Divider ───────────────────────── */}
      <div className="section-divider" />

      {/* ─── AI Megan Section ──────────────────────── */}
      <section className="py-20 px-6">
        <div className="max-w-5xl mx-auto">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            {/* Left: Megan info */}
            <RevealSection>
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-brand-500/10 border border-brand-500/20 mb-6">
                <Bot className="w-4 h-4 text-brand-400" />
                <span className="text-sm font-medium text-brand-400">Atendente IA</span>
              </div>
              <h2 className="text-4xl md:text-5xl font-heading font-extrabold mb-4">
                Conheça a <span className="bg-clip-text text-transparent bg-gradient-to-r from-brand-400 to-zap-400">Megan</span>
              </h2>
              <p className="text-sm text-dark-400 mb-6 max-w-md">
                Nossa Inteligência Artificial super treinada que transforma curiosos em compradores.
              </p>
              <ul className="space-y-3 mb-8">
                <li className="flex items-start gap-3 text-sm text-dark-300">
                  <Check className="w-4 h-4 text-zap-400 flex-shrink-0 mt-0.5" />
                  <span>Trabalha 24h por dia, 7 dias por semana</span>
                </li>
                <li className="flex items-start gap-3 text-sm text-dark-300">
                  <Check className="w-4 h-4 text-zap-400 flex-shrink-0 mt-0.5" />
                  <span>Não cobra salário, décimo terceiro ou férias</span>
                </li>
                <li className="flex items-start gap-3 text-sm text-dark-300">
                  <Check className="w-4 h-4 text-zap-400 flex-shrink-0 mt-0.5" />
                  <span>Rendimento 11x melhor que um atendente humano</span>
                </li>
                <li className="flex items-start gap-3 text-sm text-dark-300">
                  <Check className="w-4 h-4 text-zap-400 flex-shrink-0 mt-0.5" />
                  <span>Configuração rápida — em menos de 48h</span>
                </li>
              </ul>
              <Link to="/register" className="group bg-zap-500 hover:bg-zap-600 text-white font-bold px-8 py-4 rounded-lg transition-all inline-flex items-center gap-2 shadow-lg shadow-zap-500/30 btn-glow">
                Contratar Agora!
                <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
              </Link>
            </RevealSection>

            {/* Right: Megan Chat UI */}
            <RevealSection delay={100} className="hidden lg:block">
              <div className="relative">
                <div className="bg-dark-800/40 backdrop-blur-sm rounded-3xl border border-dark-600/30 p-6">
                  <div className="flex items-center gap-3 mb-6">
                    <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-brand-500/30 to-zap-500/30 border border-brand-500/30 flex items-center justify-center">
                      <BotMessageSquare className="w-6 h-6 text-brand-400" />
                    </div>
                    <div>
                      <p className="text-sm font-bold text-white">Megan <span className="text-[10px] font-normal text-zap-400">● Online</span></p>
                      <p className="text-xs text-dark-400">Assistente IA ZapFlow</p>
                    </div>
                  </div>
                  <div className="space-y-3">
                    <ChatBubble message="Olá! 👋 Me chamo Megan, sua assistente virtual!" isBot delay={0.2} />
                    <ChatBubble message="Quero aumentar minhas vendas pelo WhatsApp 🚀" isBot={false} delay={0.6} />
                    <ChatBubble message="Perfeito! Posso ajudar você a automatizar todo o atendimento, qualificar leads e fechar mais vendas. Vamos começar? 💪" isBot delay={1.0} />
                    <TypingIndicator />
                  </div>
                </div>
                {/* Glow */}
                <div className="absolute -inset-6 bg-gradient-to-br from-brand-500/8 to-zap-500/8 rounded-[40px] blur-2xl -z-10" />
              </div>
            </RevealSection>
          </div>
        </div>
      </section>

      {/* ─── Section Divider ───────────────────────── */}
      <div className="section-divider" />

      {/* ─── Pricing Section ───────────────────────── */}
      <section id="pricing" className="py-20 px-6">
        <div className="max-w-6xl mx-auto">
          <RevealSection>
            <h2 className="text-3xl md:text-4xl font-heading font-bold text-center mb-4">
              Planos e preços
            </h2>
            <p className="text-sm text-dark-500 text-center mb-4 max-w-3xl mx-auto">
              Não importa se suas necessidades são grandes ou pequenas, estamos aqui para ajudar você a escalar.
            </p>
          </RevealSection>

          {/* Trial notice */}
          <RevealSection delay={50}>
            <div className="max-w-4xl mx-auto mb-6">
              <div className="p-4 rounded-xl bg-gradient-to-r from-yellow-500/5 to-yellow-600/5 border border-yellow-500/20 text-center">
                <p className="text-sm text-yellow-400/90">
                  ⚠️ <strong>OBS:</strong> O Teste Gratuito de 7 dias é válido apenas nos planos <strong>SEM INTELIGÊNCIA ARTIFICIAL</strong>.
                </p>
              </div>
            </div>
          </RevealSection>

          {/* Number selector */}
          <RevealSection delay={100}>
            <div className="max-w-4xl mx-auto mb-8">
              <div className="p-5 rounded-xl bg-dark-800/30 border border-dark-700/30">
                <p className="text-sm font-medium text-white mb-3 text-center">
                  Quantos números de Whatsapp você precisa conectar?
                </p>
                <div className="flex items-center justify-center gap-4">
                  <span className="text-sm text-dark-400">Até 3 números</span>
                  <span className="text-dark-600">|</span>
                  <span className="text-sm text-dark-400">
                    Número adicional: <span className="text-zap-400 font-bold">R$ 97,00</span>
                  </span>
                </div>
              </div>
            </div>
          </RevealSection>

          {/* Plans Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-4xl mx-auto mb-12">
            {plans.map((plan, i) => (
              <RevealSection key={plan.name} delay={i * 100}>
                <div
                  className={`rounded-xl p-6 border relative transition-all duration-300 hover:translate-y-[-2px] ${
                    plan.popular
                      ? 'pricing-card-popular border-zap-500/40 shadow-xl shadow-zap-500/10 bg-gradient-to-b from-zap-500/8 to-dark-800/50'
                      : 'border-dark-700/40 bg-dark-800/30 hover:border-dark-600/60'
                  }`}
                >
                  {plan.popular && (
                    <div className="absolute -top-3 left-1/2 -translate-x-1/2 z-10">
                      <span className="bg-gradient-to-r from-zap-500 to-zap-400 text-white text-xs font-bold px-4 py-1 rounded-full shadow-lg shadow-zap-500/20">
                        Mais Popular
                      </span>
                    </div>
                  )}
                  <h3 className="text-xl font-heading font-bold text-white mb-1">{plan.name}</h3>
                  <div className="flex items-baseline gap-1 mb-6">
                    <span className="text-sm text-dark-400">R$</span>
                    <span className="text-4xl font-heading font-bold text-white">{plan.price}</span>
                    <span className="text-dark-400">{plan.period}</span>
                  </div>
                  <ul className="space-y-3 mb-8">
                    {plan.features.map((f) => (
                      <li key={f} className="flex items-start gap-3 text-sm text-dark-300">
                        <Check className="w-4 h-4 text-zap-400 flex-shrink-0 mt-0.5" />
                        <span>{f}</span>
                      </li>
                    ))}
                  </ul>
                  <Link
                    to="/register"
                    className={`w-full block text-center font-semibold px-5 py-3.5 rounded-lg transition-all duration-200 ${
                      plan.popular
                        ? 'bg-zap-500 hover:bg-zap-600 text-white shadow-lg shadow-zap-500/20 btn-glow'
                        : 'bg-dark-700 hover:bg-dark-600 text-white border border-dark-600 hover:border-zap-500/30'
                    }`}
                  >
                    {plan.cta}
                  </Link>
                </div>
              </RevealSection>
            ))}
          </div>

          {/* Custom Plan */}
          <RevealSection delay={200}>
            <div className="max-w-4xl mx-auto">
              <div className="gradient-border-card rounded-xl p-8 text-center">
                <h3 className="text-2xl font-heading font-bold text-white mb-3">PLANO PERSONALIZADO</h3>
                <p className="text-lg font-heading font-bold text-zap-400 mb-4">ZapFlow</p>
                <div className="flex items-baseline justify-center gap-1 mb-6">
                  <span className="text-sm text-dark-400">R$</span>
                  <span className="text-4xl font-heading font-bold text-white">399</span>
                  <span className="text-dark-400">/mês</span>
                </div>
                <p className="text-base text-dark-300 mb-6 max-w-lg mx-auto">
                  Para quem precisa de ainda mais desempenho, mais conexões e mais automação
                </p>
                <a
                  href="mailto:contato@zapflow.com"
                  className="inline-block bg-zap-500 hover:bg-zap-600 text-white font-bold px-8 py-4 rounded-lg transition-all shadow-lg shadow-zap-500/30 btn-glow"
                >
                  ENTRAR EM CONTATO
                </a>
              </div>
            </div>
          </RevealSection>

          <p className="text-center text-xs text-dark-500 mt-8">
            Cancele quando quiser • sem multa • sem burocracia
          </p>
        </div>
      </section>

      {/* ─── Section Divider ───────────────────────── */}
      <div className="section-divider" />

      {/* ─── Testimonials Section ──────────────────── */}
      <section id="testimonials" className="py-20 px-6">
        <div className="max-w-6xl mx-auto">
          <RevealSection>
            <h2 className="text-3xl md:text-4xl font-heading font-bold text-center mb-4">
              O que nossos clientes <span className="text-zap-400">dizem</span>
            </h2>
            <p className="text-dark-400 text-center mb-12 max-w-xl mx-auto">
              Empresas que já transformaram seus resultados com o ZapFlow.
            </p>
          </RevealSection>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
            {testimonials.map((t, i) => (
              <RevealSection key={t.name} delay={i * 80}>
                <div className="glass-card p-6 hover:border-zap-500/20 hover:bg-zap-500/3 transition-all duration-300 h-full flex flex-col">
                  <div className="flex gap-1 mb-4">
                    {Array.from({ length: t.rating }).map((_, j) => (
                      <Star key={j} className="w-4 h-4 text-yellow-400 fill-yellow-400" />
                    ))}
                  </div>
                  <p className="text-dark-300 mb-6 leading-relaxed text-sm flex-1">"{t.text}"</p>
                  <div className="flex items-center gap-3 pt-4 border-t border-dark-700/30">
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-zap-500/20 to-brand-500/20 flex items-center justify-center text-sm font-bold text-zap-400">
                      {t.avatar}
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-white">{t.name}</p>
                      <p className="text-xs text-dark-400">{t.role}</p>
                    </div>
                  </div>
                </div>
              </RevealSection>
            ))}
          </div>
        </div>
      </section>

      {/* ─── Section Divider ───────────────────────── */}
      <div className="section-divider" />

      {/* ─── FAQ Section ───────────────────────────── */}
      <section id="faq" className="py-20 px-6">
        <div className="max-w-3xl mx-auto">
          <RevealSection>
            <h2 className="text-3xl md:text-4xl font-heading font-bold text-center mb-4">
              Perguntas Frequentes
            </h2>
            <p className="text-dark-400 text-center mb-10 max-w-xl mx-auto">
              Tire suas dúvidas sobre o ZapFlow.
            </p>
          </RevealSection>
          <div className="space-y-3">
            {faqs.map((faq, i) => (
              <RevealSection key={faq.q} delay={i * 50}>
                <FaqItem q={faq.q} a={faq.a} />
              </RevealSection>
            ))}
          </div>
        </div>
      </section>

      {/* ─── Footer ────────────────────────────────── */}
      <footer className="border-t border-dark-700/30 py-12 px-6">
        <div className="max-w-5xl mx-auto text-center">
          <div className="flex items-center justify-center gap-3 mb-6">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-zap-500 to-brand-600 flex items-center justify-center shadow-lg shadow-zap-500/20">
              <Zap className="w-4 h-4 text-white" />
            </div>
            <span className="font-heading font-bold text-white">
              Zap<span className="text-zap-400">Flow</span>
            </span>
          </div>
          <p className="text-sm text-dark-500 mb-2">
            ZapFlow ©2026 - Todos os direitos reservados
          </p>
          <p className="text-xs text-dark-600 mb-1">contato@zapflow.com</p>
          <p className="text-xs text-dark-600">
            CNPJ: 00.000.000/0001-00 - ZAPFLOW LTDA
          </p>
        </div>
      </footer>
    </div>
  );
}
