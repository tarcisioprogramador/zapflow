import { Router, Response } from 'express';
import prisma from '../config/database';
import { authenticate } from '../middleware/auth';
import { AuthRequest } from '../types';

const router = Router();
router.use(authenticate);

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
    const flow = await prisma.flow.findUnique({
      where: { id: req.params.id },
    });

    if (!flow) {
      res.status(404).json({ error: 'Fluxo não encontrado' });
      return;
    }

    res.json(flow);
  } catch (error) {
    res.status(500).json({ error: 'Erro ao buscar fluxo' });
  }
});

// POST /api/flows - Create flow
router.post('/', async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { name, description, triggerType, triggerValue } = req.body;      const flow = await prisma.flow.create({
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
    const flow = await prisma.flow.findUnique({ where: { id: req.params.id } });
    if (!flow) {
      res.status(404).json({ error: 'Fluxo não encontrado' });
      return;
    }

    const updated = await prisma.flow.update({
      where: { id: req.params.id },
      data: { isActive: !flow.isActive },
    });

    res.json(updated);
  } catch (error) {
    res.status(500).json({ error: 'Erro ao alternar fluxo' });
  }
});

// DELETE /api/flows/:id
router.delete('/:id', async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    await prisma.flow.delete({ where: { id: req.params.id } });
    res.json({ message: 'Fluxo removido' });
  } catch (error) {
    res.status(500).json({ error: 'Erro ao remover fluxo' });
  }
});

// POST /api/flows/:id/duplicate - Duplicate flow
router.post('/:id/duplicate', async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const original = await prisma.flow.findUnique({ where: { id: req.params.id } });
    if (!original) {
      res.status(404).json({ error: 'Fluxo não encontrado' });
      return;
    }

    const duplicate = await prisma.flow.create({
      data: {
        name: `${original.name} (Cópia)`,
        description: original.description,
        triggerType: original.triggerType,
        triggerValue: original.triggerValue,
        nodes: typeof original.nodes === 'string' ? original.nodes : JSON.stringify(original.nodes),
        edges: typeof original.edges === 'string' ? original.edges : JSON.stringify(original.edges),
        userId: req.user!.userId,
      },
    });

    res.status(201).json(duplicate);
  } catch (error) {
    res.status(500).json({ error: 'Erro ao duplicar fluxo' });
  }
});

export default router;
