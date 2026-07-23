import { Router, Response } from 'express';
import prisma from '../config/database';
import { authenticate } from '../middleware/auth';
import { AuthRequest, verifyOwnership } from '../types';

const router = Router();
router.use(authenticate);

// Shared template definitions used by both /templates and /from-template endpoints
const FLOW_TEMPLATES = [
  {
    name: 'Boas-vindas Automático',
    description: 'Recepciona novos contatos com mensagem personalizada e oferece opções de menu',
    triggerType: 'keyword',
    triggerValue: 'oi,olá,boa tarde,bom dia,boa noite,começar',
    nodes: [
      { id: 'start-1', type: 'startNode', position: { x: 250, y: 50 }, data: { label: 'Início', triggerType: 'keyword' } },
      { id: 'msg-1', type: 'message', position: { x: 250, y: 180 }, data: { label: 'Mensagem de Boas-vindas', message: '👋 Olá! Bem-vindo!\n\nComo podemos ajudar?\n1️⃣ - Suporte\n2️⃣ - Vendas\n3️⃣ - Agendar\n4️⃣ - Atendente' } },
      { id: 'delay-1', type: 'delay', position: { x: 250, y: 340 }, data: { label: 'Aguardar', delay: 10 } },
      { id: 'ai-1', type: 'ai', position: { x: 250, y: 500 }, data: { label: 'IA Analisa', prompt: 'Analise a resposta do usuário e encaminhe para o setor correto.' } },
    ],
    edges: [
      { id: 'e-1', source: 'start-1', target: 'msg-1' },
      { id: 'e-2', source: 'msg-1', target: 'delay-1' },
      { id: 'e-3', source: 'delay-1', target: 'ai-1' },
    ],
  },
  {
    name: 'Qualificação de Leads',
    description: 'Faz perguntas estratégicas para qualificar leads automaticamente via IA',
    triggerType: 'keyword',
    triggerValue: 'quero comprar,tenho interesse,orçamento,preço,valor',
    nodes: [
      { id: 'start-1', type: 'startNode', position: { x: 250, y: 50 }, data: { label: 'Início' } },
      { id: 'msg-1', type: 'message', position: { x: 250, y: 180 }, data: { label: 'Primeiro Contato', message: 'Ótimo! Vou ajudar 😊\n\nPreciso de algumas informações:' } },
      { id: 'ai-1', type: 'ai', position: { x: 250, y: 340 }, data: { label: 'IA Qualifica', prompt: 'Faça perguntas para qualificar: nome, empresa, interesse, urgência, orçamento.' } },
      { id: 'msg-2', type: 'message', position: { x: 250, y: 500 }, data: { label: 'Encaminhamento', message: 'Obrigado! Um consultor entrará em contato. 🚀' } },
    ],
    edges: [
      { id: 'e-1', source: 'start-1', target: 'msg-1' },
      { id: 'e-2', source: 'msg-1', target: 'ai-1' },
      { id: 'e-3', source: 'ai-1', target: 'msg-2' },
    ],
  },
  {
    name: 'Suporte Técnico',
    description: 'Triagem de suporte com IA e encaminhamento para atendente humano',
    triggerType: 'keyword',
    triggerValue: 'suporte,ajuda,problema,erro,não funciona,quebrou',
    nodes: [
      { id: 'start-1', type: 'startNode', position: { x: 250, y: 50 }, data: { label: 'Início' } },
      { id: 'ai-1', type: 'ai', position: { x: 250, y: 180 }, data: { label: 'IA Triagem', prompt: 'Identifique o problema do usuário e tente resolver.' } },
      { id: 'condition-1', type: 'condition', position: { x: 250, y: 340 }, data: { label: 'Resolveu?', condition: 'IA resolveu o problema?' } },
      { id: 'msg-1', type: 'message', position: { x: 100, y: 500 }, data: { label: 'Resolvido', message: '👍 Fico feliz em ajudar!' } },
      { id: 'msg-2', type: 'message', position: { x: 400, y: 500 }, data: { label: 'Transferir', message: 'Transferindo para atendente humano... ⏳' } },
    ],
    edges: [
      { id: 'e-1', source: 'start-1', target: 'ai-1' },
      { id: 'e-2', source: 'ai-1', target: 'condition-1' },
      { id: 'e-3', source: 'condition-1', target: 'msg-1', label: 'Sim' },
      { id: 'e-4', source: 'condition-1', target: 'msg-2', label: 'Não' },
    ],
  },
  {
    name: 'Agendamento de Reunião',
    description: 'Agenda reuniões automaticamente via IA, coletando data e horário',
    triggerType: 'keyword',
    triggerValue: 'agendar,reunião,consultoria,agenda,horário',
    nodes: [
      { id: 'start-1', type: 'startNode', position: { x: 250, y: 50 }, data: { label: 'Início' } },
      { id: 'msg-1', type: 'message', position: { x: 250, y: 180 }, data: { label: 'Iniciar', message: 'Claro! 🗓️ Me informe a melhor data e horário.' } },
      { id: 'ai-1', type: 'ai', position: { x: 250, y: 340 }, data: { label: 'IA Agenda', prompt: 'Converse para agendar: nome, data, horário, assunto.' } },
      { id: 'msg-2', type: 'message', position: { x: 250, y: 500 }, data: { label: 'Confirmação', message: '✅ Agendado! Enviaremos lembrete.' } },
    ],
    edges: [
      { id: 'e-1', source: 'start-1', target: 'msg-1' },
      { id: 'e-2', source: 'msg-1', target: 'ai-1' },
      { id: 'e-3', source: 'ai-1', target: 'msg-2' },
    ],
  },
  {
    name: 'Recuperação de Carrinho',
    description: 'Envia mensagens de follow-up para recuperar vendas não concluídas',
    triggerType: 'keyword',
    triggerValue: 'carrinho,abandonou,esqueci,não comprei,depois',
    nodes: [
      { id: 'start-1', type: 'startNode', position: { x: 250, y: 50 }, data: { label: 'Início' } },
      { id: 'delay-1', type: 'delay', position: { x: 250, y: 180 }, data: { label: '1 hora', delay: 3600 } },
      { id: 'msg-1', type: 'message', position: { x: 250, y: 320 }, data: { label: 'Follow-up 1', message: 'Olá! 😊 Notei seu interesse. Posso ajudar? 🎉' } },
      { id: 'delay-2', type: 'delay', position: { x: 250, y: 480 }, data: { label: '24 horas', delay: 86400 } },
      { id: 'msg-2', type: 'message', position: { x: 250, y: 620 }, data: { label: 'Follow-up 2', message: '🏃‍♂️ Oferta especial quase expirando! Não perca!' } },
    ],
    edges: [
      { id: 'e-1', source: 'start-1', target: 'delay-1' },
      { id: 'e-2', source: 'delay-1', target: 'msg-1' },
      { id: 'e-3', source: 'msg-1', target: 'delay-2' },
      { id: 'e-4', source: 'delay-2', target: 'msg-2' },
    ],
  },
];

// GET /api/flows - List flows
router.get('/', async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const flows = await prisma.flow.findMany({
      where: { userId: req.user!.userId },
      orderBy: { updatedAt: 'desc' },
    });

    res.json(flows);
  } catch (error) {
    res.status(500).json({ error: 'Erro ao listar fluxos' });
  }
});

// GET /api/flows/:id - Get flow detail
router.get('/:id', async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!req.user) { res.status(401).json({ error: 'Não autenticado' }); return; }

    const flow = await prisma.flow.findUnique({
      where: { id: req.params.id },
    });

    if (!(await verifyOwnership(flow, req.user.userId, res, 'Fluxo'))) return;
    res.json(flow);
  } catch (error) {
    res.status(500).json({ error: 'Erro ao buscar fluxo' });
  }
});

// POST /api/flows - Create flow
router.post('/', async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { name, description, triggerType, triggerValue } = req.body;
    const flow = await prisma.flow.create({
      data: {
        name: name || 'Novo Fluxo',
        description,
        triggerType: triggerType || 'keyword',
        triggerValue,
        userId: req.user!.userId,
        nodes: JSON.stringify([
          {
            id: 'start-1',
            type: 'startNode',
            position: { x: 250, y: 50 },
            data: { label: 'Início', triggerType: triggerType || 'keyword' },
          },
        ]),
        edges: JSON.stringify([]),
      },
    });

    res.status(201).json(flow);
  } catch (error) {
    res.status(500).json({ error: 'Erro ao criar fluxo' });
  }
});

// PUT /api/flows/:id - Update flow (save editor state)
router.put('/:id', async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!req.user) { res.status(401).json({ error: 'Não autenticado' }); return; }

    const existing = await prisma.flow.findUnique({ where: { id: req.params.id } });
    if (!(await verifyOwnership(existing, req.user.userId, res, 'Fluxo'))) return;

    const { name, description, nodes, edges, isActive, triggerType, triggerValue } = req.body;

    const flow = await prisma.flow.update({
      where: { id: req.params.id },
      data: {
        name,
        description,
        nodes: nodes !== undefined ? (typeof nodes === 'string' ? nodes : JSON.stringify(nodes)) : undefined,
        edges: edges !== undefined ? (typeof edges === 'string' ? edges : JSON.stringify(edges)) : undefined,
        isActive,
        triggerType,
        triggerValue,
      },
    });

    res.json(flow);
  } catch (error) {
    res.status(500).json({ error: 'Erro ao atualizar fluxo' });
  }
});

// PUT /api/flows/:id/toggle - Toggle flow active state
router.put('/:id/toggle', async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!req.user) { res.status(401).json({ error: 'Não autenticado' }); return; }

    const flow = await prisma.flow.findUnique({ where: { id: req.params.id } });
    const ownedFlow = await verifyOwnership(flow, req.user.userId, res, 'Fluxo');
    if (!ownedFlow) return;

    const updated = await prisma.flow.update({
      where: { id: req.params.id },
      data: { isActive: !ownedFlow.isActive },
    });

    res.json(updated);
  } catch (error) {
    res.status(500).json({ error: 'Erro ao alternar fluxo' });
  }
});

// DELETE /api/flows/:id
router.delete('/:id', async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!req.user) { res.status(401).json({ error: 'Não autenticado' }); return; }

    const existing = await prisma.flow.findUnique({ where: { id: req.params.id } });
    if (!(await verifyOwnership(existing, req.user.userId, res, 'Fluxo'))) return;

    await prisma.flow.delete({ where: { id: req.params.id } });
    res.json({ message: 'Fluxo removido' });
  } catch (error) {
    res.status(500).json({ error: 'Erro ao remover fluxo' });
  }
});

// GET /api/flows/templates - List flow templates
router.get('/templates', async (_req: AuthRequest, res: Response): Promise<void> => {
  res.json(FLOW_TEMPLATES);
});

// POST /api/flows/from-template - Create flow from template
router.post('/from-template', async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { templateName, description } = req.body;

    const template = FLOW_TEMPLATES.find((t) => t.name === templateName);
    if (!template) {
      res.status(404).json({ error: 'Template não encontrado' });
      return;
    }

    const flow = await prisma.flow.create({
      data: {
        name: template.name,
        description: description || template.description,
        triggerType: template.triggerType,
        triggerValue: template.triggerValue,
        isActive: false,
        userId: req.user!.userId,
        nodes: JSON.stringify(template.nodes),
        edges: JSON.stringify(template.edges),
      },
    });

    res.status(201).json(flow);
  } catch (error) {
    console.error('[Flows] from-template error:', error);
    res.status(500).json({ error: 'Erro ao criar fluxo do template' });
  }
});

// POST /api/flows/:id/duplicate - Duplicate flow
router.post('/:id/duplicate', async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!req.user) { res.status(401).json({ error: 'Não autenticado' }); return; }

    const original = await prisma.flow.findUnique({ where: { id: req.params.id } });
    const ownedOriginal = await verifyOwnership(original, req.user.userId, res, 'Fluxo');
    if (!ownedOriginal) return;

    const duplicate = await prisma.flow.create({
      data: {
        name: `${ownedOriginal.name} (Cópia)`,
        description: ownedOriginal.description,
        triggerType: ownedOriginal.triggerType,
        triggerValue: ownedOriginal.triggerValue,
        nodes: typeof ownedOriginal.nodes === 'string' ? ownedOriginal.nodes : JSON.stringify(ownedOriginal.nodes),
        edges: typeof ownedOriginal.edges === 'string' ? ownedOriginal.edges : JSON.stringify(ownedOriginal.edges),
        userId: req.user!.userId,
      },
    });

    res.status(201).json(duplicate);
  } catch (error) {
    res.status(500).json({ error: 'Erro ao duplicar fluxo' });
  }
});

export default router;
