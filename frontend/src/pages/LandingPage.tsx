import { Link } from 'react-router-dom';
import { useState } from 'react';
import {
  Zap, MessageSquare, Bot, GitBranch, Columns3, Send, BarChart3,
  Webhook, Users, Check, ChevronDown, Star,
  Smartphone, Play, Brain, Repeat, BotMessageSquare,
  Target, Clock, TrendingUp, X, Phone,
  ShoppingCart, ThumbsUp, HelpCircle,
} from 'lucide-react';

const features = [
  {
    icon: MessageSquare,
    title: 'Multi-WhatsApp e Multi-Acessos',
    description: 'Tenha vários números operando na mesma conta — cada um com seu fluxo, seus leads, seus webhooks, ou se preferir tudo centralizado tenha também. Você decide seu time trabalhando junto ou separado.',
  },
  {
    icon: Send,
    title: 'Disparos em massa',
    description: 'Nada de "campanha controlada" ou com firula. Crie campanhas e envie fluxos com texto, imagem, vídeo, áudio e até GIF. Sua lista inteira em ação com 1 clique.',
  },
  {
    icon: GitBranch,
    title: 'Construtor de Fluxos Inteligente',
    description: 'Crie fluxos automatizados com gatilhos, respostas condicionais e entregas programadas, com uma interface simples e poderosa. Seu funil no WhatsApp do jeito certo.',
  },
  {
    icon: Brain,
    title: 'IA Treinada Para Vender no Seu Lugar',
    description: 'A "Megan", nossa IA de atendimento, trabalha 24h por dia, 7 dias por semana, sem salário, sem 13º, sem desculpa. Você configura uma vez e ela nunca mais para. Converte curiosos em compradores — no automático.',
  },
  {
    icon: Target,
    title: 'Rastreamento de Anúncio',
    description: 'Capture automaticamente o ID, thumbnail, título e texto de conversão dos seus anúncios. Entenda exatamente de onde vem cada lead. Você sabe o que está funcionando — com dados.',
  },
  {
    icon: Columns3,
    title: 'Dashboard e CRM com Kanban',
    description: 'Acompanhe suas vendas em tempo real. Cada cliente é rotulado automaticamente e avança no seu funil sem esforço manual, visualize o pipeline, otimize e venda mais.',
  },
  {
    icon: Smartphone,
    title: '100% em nuvem + App mobile',
    description: 'Use no PC, no celular, onde quiser. Seu time inteiro, sua operação toda, em qualquer lugar, liberdade e velocidade no atendimento.',
  },
  {
    icon: Webhook,
    title: 'Integrações com as principais plataformas',
    description: 'Troque informações com nossa ferramenta e consiga mais sucesso ao converter suas vendas através do WhatsApp.',
  },
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
  {
    name: 'IA Starter',
    price: '97',
    period: '/mês',
    features: [
      '1 Número conectado',
      'Acesso ao painel de controle simples e completo',
      'Chat integrado com 5 atendentes inclusos',
      'Envie mensagens em massa com campanhas ilimitadas',
      'Chatbots ilimitados para automatizar conversas',
      'Gerencie até 1 grupo com bate-papo exclusivo',
      'CRM Kanban automatizado (com até 2 quadros)',
      'Sempre online – sua operação 24h no ar',
      'Até 15.000 Webhooks pra integrar com outras ferramentas',
      'Trackeamento de anúncio',
      '5 Milhões de Tokens de IA',
    ],
    cta: 'Escolha o plano',
  },
  {
    name: 'IA Pro',
    price: '197',
    period: '/mês',
    popular: true,
    features: [
      '1 Número conectado',
      'Acesso ao painel de controle simples e completo',
      'Atendentes ilimitados no bate-papo',
      'Envie mensagens em massa com campanhas ilimitadas',
      'Chatbots ilimitados para automatizar conversas',
      'Gerencie até 3 grupos com bate-papo exclusivo',
      'CRM Kanban automatizado (com até 5 quadros)',
      'Sempre online – sua operação 24h no ar',
      'Até 30.000 Webhooks pra integrar com outras ferramentas',
      'Trackeamento de anúncio',
      '10 Milhões de Tokens de IA',
      'Conecte com sistemas externos via integração (Post, Put, Get)',
    ],
    cta: 'Escolha o plano',
  },
];

const faqs = [
  {
    q: 'Não sou bom com tecnologia. Como vou saber o que fazer?',
    a: 'A ferramenta do Frontzapp é a mais fácil do mercado para construção de conversas automáticas. Você simplesmente arrasta um bloco de conversa para conectar com outro e seu robô fica pronto em minutos. Você tem acesso a todo um treinamento em vídeo aulas que te mostram como criar o robô que quiser. E nosso time de suporte está sempre disponível para tirar dúvidas.',
  },
  {
    q: 'Como consigo conectar meu WhatsApp ao Frontzapp?',
    a: 'A conexão com o Frontzapp é a mesma realizada com o WhatsApp web. Basta escanear o QR Code da plataforma e seu WhatsApp estará conectado.',
  },
  {
    q: 'Quantos números de WhatsApp consigo conectar na plataforma?',
    a: 'Você pode conectar um número de WhatsApp por conta. E você pode ter quantas contas quiser no mesmo painel. Não existe limite de compra de contas.',
  },
  {
    q: 'Meu computador precisa ficar ligado ou com o navegador aberto para o robô funcionar?',
    a: 'Não. Após escanear o QR Code do Frontzapp o seu WhatsApp estará conectado e não será necessário manter nada aberto. A automação vai funcionar até mesmo com seu celular desligado.',
  },
  {
    q: 'O que é um robô?',
    a: 'Um robô nada mais é do que um fluxo de conversa pré-definido. Pensa na conversa que precisa acontecer para você realizar um agendamento do cliente pelo WhatsApp. Toda essa conversa pode ser pré definida e automatizada. Esse fluxo de conversa pré definido é o que chamamos de robô.',
  },
  {
    q: 'Quantos robôs ou fluxos de conversas posso criar?',
    a: 'Você pode criar quantos robôs ou fluxos de conversas você quiser. Você pode literalmente automatizar todo tipo de conversa que acontece no seu WhatsApp.',
  },
  {
    q: 'Posso atender quantas pessoas com meus robôs?',
    a: 'No plano PRO você pode conversar com quantas pessoas quiser.',
  },
  {
    q: 'O que são palavras chaves?',
    a: 'São palavras ou frases que acionam os seus robôs. Você pode, por exemplo, criar a palavra chave "preço" para acionar o robô de cardápio/menu toda vez que um cliente enviar uma mensagem que contenha essa palavra.',
  },
  {
    q: 'Quantas pessoas podem atender no mesmo número pelo bate papo do Frontzapp?',
    a: 'No plano PRO você pode colocar atendentes ilimitados na sua conta.',
  },
  {
    q: 'Como terei acesso a biblioteca de robôs?',
    a: 'Assim que você adquirir o seu acesso, os robôs estarão disponíveis na sua conta do Frontzapp e também na nossa comunidade do Discord.',
  },
  {
    q: 'Se eu não gostar, como eu cancelo?',
    a: 'Você tem 7 dias para testar toda a ferramenta do Frontzapp e caso deseje cancelar é só enviar um email para cancelamento@frontzapp.com dentro do prazo dos 7 dias. Seu dinheiro será 100% devolvido sem perguntas.',
  },
];

function FaqItem({ q, a }: { q: string; a: string }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="border border-dark-700/30 rounded-xl overflow-hidden bg-dark-800/30">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between p-5 text-left hover:bg-dark-800/50 transition-colors"
      >
        <span className="text-sm font-medium text-white pr-4">{q}</span>
        <ChevronDown className={`w-5 h-5 text-dark-400 flex-shrink-0 transition-transform duration-200 ${open ? 'rotate-180' : ''}`} />
      </button>
      {open && (
        <div className="px-5 pb-5 border-t border-dark-700/20 pt-4">
          <p className="text-sm text-dark-400 leading-relaxed">{a}</p>
        </div>
      )}
    </div>
  );
}

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
  {
    icon: TrendingUp,
    title: 'Aumento na conversão de vendas',
    desc: 'Atendimentos mais rápidos, personalizados e no tempo certo — feitos por uma IA que entende de resultado.',
  },
  {
    icon: ShoppingCart,
    title: 'Diminue os custos operacionais',
    desc: 'Reduza seu time de atendimento sem perder performance. Automatize o que ninguém consegue escalar no braço.',
  },
  {
    icon: Bot,
    title: 'Atendimentos resolvidos automaticamente',
    desc: 'Enquanto você dorme, nossa IA está vendendo, tirando dúvidas e aquecendo leads. E o melhor: sem salário, sem férias, sem desculpas.',
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

export default function LandingPage() {


  return (
    <div className="min-h-screen bg-dark-950 text-white overflow-hidden">
      {/* Navigation */}
      <nav className="fixed top-0 w-full z-50 bg-dark-950/90 backdrop-blur-xl border-b border-dark-700/30">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-zap-500 to-brand-600 flex items-center justify-center shadow-lg shadow-zap-500/20">
              <Zap className="w-5 h-5 text-white" />
            </div>
            <span className="text-lg font-heading font-bold">
              Front<span className="text-zap-400">zapp</span>
            </span>
          </div>
          <div className="hidden md:flex items-center gap-6">
            <a href="#hero" className="text-sm text-dark-400 hover:text-white transition-colors">Inicio</a>
            <a href="#pricing" className="text-sm text-dark-400 hover:text-white transition-colors">Planos</a>
            <a href="#features" className="text-sm text-dark-400 hover:text-white transition-colors">Funções</a>
            <a href="#features" className="text-sm text-dark-400 hover:text-white transition-colors">Integrações</a>
            <a href="#faq" className="text-sm text-dark-400 hover:text-white transition-colors">Perguntas Frequentes</a>
          </div>
          <Link
            to="/login"
            className="bg-zap-500 hover:bg-zap-600 text-white font-semibold px-5 py-2.5 rounded-lg transition-all duration-200 shadow-lg shadow-zap-500/20 active:scale-[0.98] text-sm"
          >
            Conecte-se
          </Link>
        </div>
      </nav>

      {/* Hero Section */}
      <section id="hero" className="relative pt-32 pb-20 px-6">
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-zap-500/10 rounded-full blur-3xl" />
          <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-brand-500/10 rounded-full blur-3xl" />
        </div>

        <div className="max-w-6xl mx-auto relative">
          <div className="text-center max-w-4xl mx-auto">
            <h1 className="text-4xl md:text-6xl font-heading font-extrabold leading-tight mb-6">
              Automação de verdade com{' '}
              <span className="bg-clip-text text-transparent bg-gradient-to-r from-zap-400 to-brand-400">IA no WhatsApp</span>
            </h1>

            <p className="text-xl text-dark-400 max-w-3xl mx-auto mb-4 leading-relaxed font-heading font-semibold">
              Nunca foi tão fácil criar automações milionárias, e agora, sua IA também vende por você.
            </p>

            <p className="text-base text-dark-500 max-w-3xl mx-auto mb-10 leading-relaxed">
              Esqueça o atendimento manual. Com o Frontzapp, você cria fluxos em minutos e deixa sua IA fechar negócios sozinha.
            </p>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-16">
              <Link to="/register" className="bg-zap-500 hover:bg-zap-600 text-white font-bold text-lg px-8 py-4 rounded-lg transition-all duration-200 shadow-lg shadow-zap-500/30 hover:shadow-zap-500/40 active:scale-[0.98] flex items-center gap-2">
                Contratar Plano!
              </Link>
              <Link to="/register" className="bg-dark-800 hover:bg-dark-700 text-dark-200 font-medium text-lg px-8 py-4 rounded-lg transition-all duration-200 border border-dark-600 hover:border-dark-500 active:scale-[0.98] flex items-center gap-2">
                Teste grátis
              </Link>
            </div>

            {/* Feature badges */}
            <div className="flex flex-wrap items-center justify-center gap-3 max-w-3xl mx-auto">
              {[
                { icon: Bot, label: 'Automação' },
                { icon: GitBranch, label: 'Fluxo de conversas' },
                { icon: Repeat, label: 'Remarketing Inteligente' },
                { icon: BotMessageSquare, label: 'Atendente ia' },
                { icon: Users, label: 'Gerente de grupos' },
                { icon: Columns3, label: 'CRM Kanban' },
              ].map((badge) => (
                <div key={badge.label} className="flex items-center gap-2 px-4 py-2 rounded-full bg-dark-800/60 border border-dark-700/40 text-sm text-dark-300">
                  <badge.icon className="w-4 h-4 text-zap-400" />
                  <span>{badge.label}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Challenges Section */}
      <section className="py-20 px-6 bg-dark-900/40">
        <div className="max-w-5xl mx-auto">
          <h2 className="text-3xl md:text-4xl font-heading font-bold text-center mb-12">
            Você tem algum desses desafios na sua empresa?
          </h2>

          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
            {challenges.map((challenge) => (
              <div
                key={challenge.text}
                className="flex items-center gap-3 p-4 glass-card hover:border-dark-600/60 transition-all"
              >
                <challenge.icon className="w-5 h-5 text-zap-400 flex-shrink-0" />
                <span className="text-sm text-dark-300">{challenge.text}</span>
              </div>
            ))}
            <div className="flex items-center gap-3 p-4 glass-card">
              <HelpCircle className="w-5 h-5 text-zap-400 flex-shrink-0" />
              <span className="text-sm text-dark-300">Entre outros...</span>
            </div>
          </div>
        </div>
      </section>

      {/* Value Proposition */}
      <section className="py-20 px-6">
        <div className="max-w-5xl mx-auto text-center">
          <h2 className="text-3xl md:text-4xl font-heading font-bold mb-6">
            O futuro das vendas começa com o <span className="text-zap-400">Frontzapp</span>
          </h2>
          <p className="text-lg text-dark-400 max-w-4xl mx-auto leading-relaxed mb-8">
            Dê adeus às extensões instáveis e plataformas limitadas, com o Frontzapp, você cria fluxos inteligentes,
            envia áudios e mídias com facilidade, e ainda tem uma IA vendendo por você todos os dias,
            a escolha ideal para escalar o atendimento e multiplicar suas vendas.
          </p>
          <p className="text-base text-dark-500 font-semibold">
            Não é só mais uma "ferramenta de WhatsApp". É o fim das limitações.
          </p>
          <p className="text-base text-dark-500 mt-2">
            Vamos te entregar a ferramenta de automações com WhatsApp mais completa do mercado, com uma facilidade de uso incrível.
          </p>
          <div className="mt-8">
            <Link to="/register" className="bg-zap-500 hover:bg-zap-600 text-white font-bold px-8 py-4 rounded-lg transition-all inline-flex items-center gap-2 shadow-lg shadow-zap-500/30">
              Contratar Agora!
            </Link>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-20 px-6 bg-dark-900/40">
        <div className="max-w-6xl mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {features.map((feature) => (
              <div
                key={feature.title}
                className="glass-card p-6 hover:border-dark-600/60 transition-all duration-300"
              >
                <div className="w-12 h-12 rounded-xl bg-zap-500/10 flex items-center justify-center mb-4">
                  <feature.icon className="w-6 h-6 text-zap-400" />
                </div>
                <h3 className="text-lg font-heading font-bold text-white mb-2">{feature.title}</h3>
                <p className="text-sm text-dark-400 leading-relaxed">{feature.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Target Audience */}
      <section className="py-20 px-6">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-3xl md:text-4xl font-heading font-bold text-center mb-4">
            Frontzapp é para você se:
          </h2>
          <div className="mt-10 space-y-4">
            {targetAudience.map((item) => (
              <div key={item} className="flex items-start gap-4">
                <div className="w-7 h-7 rounded-full bg-zap-500/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                  <Check className="w-4 h-4 text-zap-400" />
                </div>
                <p className="text-base text-dark-200">{item}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Remarketing Section */}
      <section className="py-20 px-6 bg-dark-900/40">
        <div className="max-w-5xl mx-auto text-center">
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
        </div>
      </section>

      {/* Why Frontzapp */}
      <section className="py-20 px-6">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-3xl md:text-4xl font-heading font-bold text-center mb-4">
            Por que o <span className="text-zap-400">Frontzapp</span> é a escolha definitiva para quem vende no WhatsApp?
          </h2>
          <p className="text-base text-dark-400 text-center max-w-4xl mx-auto mb-12 leading-relaxed">
            Somos a ferramenta mais fácil em criar automação com IA e atendimento inteligente via WhatsApp.
            Criamos um sistema que automatiza de verdade, sem gambiarra, sem extensão, e o melhor sem você precisar criar fluxos complicados.
            Você tem uma equipe especialista configurando tudo pra você em tempo recorde em menos de 48h seu WhatsApp vira uma máquina de conversão — pronta pra vender 24h por dia.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
            {whyReasons.map((reason) => (
              <div key={reason.title} className="glass-card p-6 text-center">
                <div className="w-14 h-14 rounded-xl bg-zap-500/10 flex items-center justify-center mx-auto mb-4">
                  <reason.icon className="w-7 h-7 text-zap-400" />
                </div>
                <h3 className="text-lg font-heading font-bold text-white mb-3">{reason.title}</h3>
                <p className="text-sm text-dark-400 leading-relaxed">{reason.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* AI Megan Section */}
      <section className="py-20 px-6 bg-dark-900/40">
        <div className="max-w-5xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-brand-500/10 border border-brand-500/20 mb-6">
            <Bot className="w-4 h-4 text-brand-400" />
            <span className="text-sm font-medium text-brand-400">Atendente IA</span>
          </div>
          <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-brand-500/20 to-zap-500/20 border border-brand-500/30 flex items-center justify-center mx-auto mb-6">
            <BotMessageSquare className="w-10 h-10 text-brand-400" />
          </div>
          <h2 className="text-4xl md:text-5xl font-heading font-extrabold mb-4">
            Megan
          </h2>
          <p className="text-sm text-dark-400 mb-8 max-w-2xl mx-auto">
            Nossa Inteligência Artificial super treinada que transforma curiosos em compradores.
          </p>
          <p className="text-base text-dark-300 max-w-3xl mx-auto mb-4 leading-relaxed">
            Com a Megan você transforma clientes curiosos em clientes compradores.
          </p>
          <p className="text-base text-dark-300 max-w-3xl mx-auto mb-8 leading-relaxed">
            Megan irá trabalhar todos os dias da semana a qualquer hora sem te cobrar salário ou décimo terceiro.
          </p>
          <p className="text-base text-dark-400 font-semibold max-w-2xl mx-auto mb-8">
            Com poucas informações, Megan consegue ter um rendimento 11x melhor do que um atendente humano.
          </p>
          <Link to="/register" className="bg-zap-500 hover:bg-zap-600 text-white font-bold px-8 py-4 rounded-lg transition-all inline-flex items-center gap-2 shadow-lg shadow-zap-500/30">
            Contratar Agora!
          </Link>
        </div>
      </section>

      {/* Pricing Section */}
      <section id="pricing" className="py-20 px-6">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-3xl md:text-4xl font-heading font-bold text-center mb-4">
            Planos e preços
          </h2>
          <p className="text-sm text-dark-500 text-center mb-4 max-w-3xl mx-auto">
            Não importa se suas necessidades são grandes ou pequenas, estamos aqui para ajudar você a escalar.
          </p>

          {/* Trial notice */}
          <div className="max-w-4xl mx-auto mb-6">
            <div className="p-4 rounded-xl bg-yellow-500/5 border border-yellow-500/20 text-center">
              <p className="text-sm text-yellow-400/90">
                ⚠️ <strong>OBS:</strong> O Teste Gratuito de 7 dias é válido apenas nos planos <strong>SEM INTELIGÊNCIA ARTIFICIAL</strong>.
              </p>
            </div>
          </div>

          {/* Number selector */}
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

          {/* Plans Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-4xl mx-auto mb-12">
            {plans.map((plan) => (
              <div
                key={plan.name}
                className={`rounded-xl p-6 border relative ${
                  plan.popular
                    ? 'border-zap-500/50 shadow-lg shadow-zap-500/10 bg-dark-800/50'
                    : 'border-dark-700/40 bg-dark-800/30'
                }`}
              >
                {plan.popular && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                    <span className="bg-zap-500 text-white text-xs font-bold px-4 py-1 rounded-full">Mais Popular</span>
                  </div>
                )}
                <h3 className="text-xl font-heading font-bold text-white mb-1">{plan.name}</h3>
                <div className="flex items-baseline gap-1 mb-4">
                  <span className="text-sm text-dark-400">R$</span>
                  <span className="text-4xl font-heading font-bold text-white">{plan.price}</span>
                  <span className="text-dark-400">{plan.period}</span>
                </div>
                <ul className="space-y-3 mb-6">
                  {plan.features.map((f) => (
                    <li key={f} className="flex items-start gap-3 text-sm text-dark-300">
                      <Check className="w-4 h-4 text-zap-400 flex-shrink-0 mt-0.5" />
                      <span>{f}</span>
                    </li>
                  ))}
                </ul>
                <Link
                  to="/register"
                  className={`w-full block text-center font-semibold px-5 py-3 rounded-lg transition-all ${
                    plan.popular
                      ? 'bg-zap-500 hover:bg-zap-600 text-white shadow-lg shadow-zap-500/20'
                      : 'bg-dark-700 hover:bg-dark-600 text-white border border-dark-600'
                  }`}
                >
                  {plan.cta}
                </Link>
              </div>
            ))}
          </div>

          {/* Custom Plan */}
          <div className="max-w-4xl mx-auto mb-8">
            <div className="rounded-xl p-8 border border-brand-500/30 bg-gradient-to-r from-brand-500/5 to-zap-500/5 text-center">
              <h3 className="text-2xl font-heading font-bold text-white mb-3">PLANO PERSONALIZADO</h3>
              <p className="text-lg font-heading font-bold text-zap-400 mb-4">Frontzapp</p>
              <div className="flex items-baseline justify-center gap-1 mb-6">
                <span className="text-sm text-dark-400">R$</span>
                <span className="text-4xl font-heading font-bold text-white">399</span>
                <span className="text-dark-400">/mês</span>
              </div>
              <p className="text-base text-dark-300 mb-2">Para quem precisa de ainda mais desempenho, mais conexões e mais automação</p>
              <div className="space-y-1 text-sm text-dark-400 mb-6">
                <p>Precisa conectar mais de 3 números ao mesmo tempo?</p>
                <p>Quer recursos exclusivos que não estão nos outros planos?</p>
                <p>Necessita de um ambiente mais robusto, com mais Webhooks, mais Kanbans e mais usuários simultâneos?</p>
                <p>Seu negócio exige automação personalizada, regras avançadas ou integrações específicas?</p>
                <p>Quer que nossa equipe configure tudo para você, do zero, sem dor de cabeça?</p>
              </div>
              <p className="text-sm font-semibold text-white mb-6">Feito para operações sérias<br />Você escolhe o que precisa.<br />A gente monta, configura e entrega tudo rodando 100%.</p>
              <a
                href="mailto:contato@frontzapp.com"
                className="inline-block bg-zap-500 hover:bg-zap-600 text-white font-bold px-8 py-4 rounded-lg transition-all shadow-lg shadow-zap-500/30"
              >
                ENTRAR EM CONTATO
              </a>
            </div>
          </div>

          <p className="text-center text-xs text-dark-500">
            Cancele quando quiser • sem multa • sem burocracia
          </p>
        </div>
      </section>

      {/* Testimonials Section */}
      <section id="testimonials" className="py-20 px-6">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-3xl md:text-4xl font-heading font-bold text-center mb-12">
            O que nossos clientes <span className="text-zap-400">dizem</span>
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {testimonials.map((t) => (
              <div key={t.name} className="glass-card p-6 hover:border-dark-600/60 transition-all duration-300">
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
      <section id="faq" className="py-20 px-6 bg-dark-900/40">
        <div className="max-w-3xl mx-auto">
          <h2 className="text-3xl md:text-4xl font-heading font-bold text-center mb-12">
            Perguntas Frequentes
          </h2>
          <div className="space-y-3">
            {faqs.map((faq) => (
              <FaqItem key={faq.q} q={faq.q} a={faq.a} />
            ))}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-dark-700/30 py-12 px-6">
        <div className="max-w-5xl mx-auto text-center">
          <div className="flex items-center justify-center gap-3 mb-6">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-zap-500 to-brand-600 flex items-center justify-center">
              <Zap className="w-4 h-4 text-white" />
            </div>
            <span className="font-heading font-bold text-white">
              Front<span className="text-zap-400">zapp</span>
            </span>
          </div>
          <p className="text-sm text-dark-500 mb-2">
            Frontzapp ©2026 - Todos os direitos reservados
          </p>
          <p className="text-xs text-dark-600 mb-1">contato@frontzapp.com</p>
          <p className="text-xs text-dark-600">
            CNPJ: 00.000.000/0001-00 - FRONTZAPP LTDA
          </p>
        </div>
      </footer>
    </div>
  );
}
