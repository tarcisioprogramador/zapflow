import { Router, Response } from 'express';
import prisma from '../config/database';
import { authenticate } from '../middleware/auth';
import { AuthRequest } from '../types';

const router = Router();
router.use(authenticate);

// GET /api/campaigns - List campaigns
router.get('/', async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const campaigns = await prisma.campaign.findMany({
      where: { userId: req.user!.userId },
      include: { _count: { select: { contacts: true } } },
      orderBy: { createdAt: 'desc' },
    });
    res.json(campaigns);
  } catch (error) {
    res.status(500).json({ error: 'Erro ao listar campanhas' });
  }
});

// GET /api/campaigns/:id
router.get('/:id', async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const campaign = await prisma.campaign.findUnique({
      where: { id: req.params.id },
      include: { contacts: true },
    });
    if (!campaign) { res.status(404).json({ error: 'Campanha não encontrada' }); return; }
    res.json(campaign);
  } catch (error) {
    res.status(500).json({ error: 'Erro ao buscar campanha' });
  }
});

// POST /api/campaigns - Create campaign
router.post('/', async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { name, message, mediaUrl, scheduledAt, contacts } = req.body;
    if (!name || !message) {
      res.status(400).json({ error: 'Nome e mensagem são obrigatórios' });
      return;
    }

    const campaign = await prisma.campaign.create({
      data: {
        name,
        message,
        mediaUrl,
        scheduledAt: scheduledAt ? new Date(scheduledAt) : null,
        userId: req.user!.userId,
        contacts: contacts
          ? { create: contacts.map((c: any) => ({ phone: c.phone, name: c.name })) }
          : undefined,
      },
      include: { _count: { select: { contacts: true } } },
    });

    res.status(201).json(campaign);
  } catch (error) {
    res.status(500).json({ error: 'Erro ao criar campanha' });
  }
});

// PUT /api/campaigns/:id - Update campaign
router.put('/:id', async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { name, message, mediaUrl, scheduledAt } = req.body;
    const campaign = await prisma.campaign.update({
      where: { id: req.params.id },
      data: {
        name,
        message,
        mediaUrl,
        scheduledAt: scheduledAt ? new Date(scheduledAt) : undefined,
      },
    });
    res.json(campaign);
  } catch (error) {
    res.status(500).json({ error: 'Erro ao atualizar campanha' });
  }
});

// PUT /api/campaigns/:id/status - Update status (pause, resume)
router.put('/:id/status', async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { status } = req.body;
    const campaign = await prisma.campaign.update({
      where: { id: req.params.id },
      data: { status, sentAt: status === 'RUNNING' ? new Date() : undefined },
    });
    res.json(campaign);
  } catch (error) {
    res.status(500).json({ error: 'Erro ao atualizar status' });
  }
});

// DELETE /api/campaigns/:id
router.delete('/:id', async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    await prisma.campaign.delete({ where: { id: req.params.id } });
    res.json({ message: 'Campanha removida' });
  } catch (error) {
    res.status(500).json({ error: 'Erro ao remover campanha' });
  }
});

export default router;
