import { Router, Response } from 'express';
import prisma from '../config/database';
import { authenticate } from '../middleware/auth';
import { AuthRequest } from '../types';

const router = Router();
router.use(authenticate);

// GET /api/remarketing - List sequences
router.get('/', async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const sequences = await prisma.remarketingSequence.findMany({
      orderBy: { createdAt: 'desc' },
      include: { _count: { select: { executions: true } } },
    });
    res.json(sequences);
  } catch (error) {
    res.status(500).json({ error: 'Erro ao listar sequências' });
  }
});

// POST /api/remarketing - Create sequence
router.post('/', async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { name, description, steps } = req.body;
    const sequence = await prisma.remarketingSequence.create({
      data: {
        name,
        description,
        steps: steps || [],
      },
    });
    res.status(201).json(sequence);
  } catch (error) {
    res.status(500).json({ error: 'Erro ao criar sequência' });
  }
});

// PUT /api/remarketing/:id
router.put('/:id', async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { name, description, steps, isActive } = req.body;
    const sequence = await prisma.remarketingSequence.update({
      where: { id: req.params.id },
      data: { name, description, steps, isActive },
    });
    res.json(sequence);
  } catch (error) {
    res.status(500).json({ error: 'Erro ao atualizar sequência' });
  }
});

// DELETE /api/remarketing/:id
router.delete('/:id', async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    await prisma.remarketingSequence.delete({ where: { id: req.params.id } });
    res.json({ message: 'Sequência removida' });
  } catch (error) {
    res.status(500).json({ error: 'Erro ao remover sequência' });
  }
});

export default router;
