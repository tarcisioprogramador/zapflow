import { Router, Response } from 'express';
import prisma from '../config/database';
import { authenticate } from '../middleware/auth';
import { AuthRequest } from '../types';

const router = Router();
router.use(authenticate);

// ─── CRM Boards ────────────────────────────────────────

// GET /api/crm/boards - List boards
router.get('/boards', async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const user = await prisma.user.findUnique({ where: { id: req.user!.userId } });
    if (!user?.organizationId) {
      res.json([]);
      return;
    }

    const boards = await prisma.crmBoard.findMany({
      where: { organizationId: user.organizationId },
      include: {
        stages: { orderBy: { position: 'asc' } },
        _count: { select: { cards: true } },
      },
      orderBy: { createdAt: 'asc' },
    });

    res.json(boards);
  } catch (error) {
    res.status(500).json({ error: 'Erro ao listar boards' });
  }
});

// POST /api/crm/boards - Create board
router.post('/boards', async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const user = await prisma.user.findUnique({ where: { id: req.user!.userId } });
    if (!user?.organizationId) {
      res.status(400).json({ error: 'Sem organização' });
      return;
    }

    const { name } = req.body;
    const board = await prisma.crmBoard.create({
      data: {
        name,
        organizationId: user.organizationId,
        stages: {
          create: [
            { name: 'Lead', color: '#6366f1', position: 0 },
            { name: 'Contato', color: '#f59e0b', position: 1 },
            { name: 'Proposta', color: '#3b82f6', position: 2 },
            { name: 'Negociação', color: '#8b5cf6', position: 3 },
            { name: 'Fechado', color: '#10b981', position: 4 },
            { name: 'Perdido', color: '#ef4444', position: 5 },
          ],
        },
      },
      include: { stages: { orderBy: { position: 'asc' } } },
    });

    res.status(201).json(board);
  } catch (error) {
    res.status(500).json({ error: 'Erro ao criar board' });
  }
});

// PUT /api/crm/boards/:id - Update board
router.put('/boards/:id', async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { name } = req.body;
    const board = await prisma.crmBoard.update({
      where: { id: req.params.id },
      data: { name },
    });
    res.json(board);
  } catch (error) {
    res.status(500).json({ error: 'Erro ao atualizar board' });
  }
});

// DELETE /api/crm/boards/:id
router.delete('/boards/:id', async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    await prisma.crmBoard.delete({ where: { id: req.params.id } });
    res.json({ message: 'Board removido' });
  } catch (error) {
    res.status(500).json({ error: 'Erro ao remover board' });
  }
});

// ─── Stages ────────────────────────────────────────────

// POST /api/crm/stages - Create stage
router.post('/stages', async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { boardId, name, color } = req.body;
    const maxPos = await prisma.crmStage.findMany({
      where: { boardId },
      orderBy: { position: 'desc' },
      take: 1,
    });

    const stage = await prisma.crmStage.create({
      data: {
        name,
        color: color || '#6366f1',
        position: (maxPos[0]?.position ?? -1) + 1,
        boardId,
      },
    });

    res.status(201).json(stage);
  } catch (error) {
    res.status(500).json({ error: 'Erro ao criar etapa' });
  }
});

// PUT /api/crm/stages/:id - Update stage
router.put('/stages/:id', async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { name, color, position } = req.body;
    const stage = await prisma.crmStage.update({
      where: { id: req.params.id },
      data: { name, color, position },
    });
    res.json(stage);
  } catch (error) {
    res.status(500).json({ error: 'Erro ao atualizar etapa' });
  }
});

// DELETE /api/crm/stages/:id
router.delete('/stages/:id', async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    await prisma.crmStage.delete({ where: { id: req.params.id } });
    res.json({ message: 'Etapa removida' });
  } catch (error) {
    res.status(500).json({ error: 'Erro ao remover etapa' });
  }
});

// ─── Cards ─────────────────────────────────────────────

// GET /api/crm/cards?boardId=xxx - List cards for a board
router.get('/cards', async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { boardId } = req.query;
    const cards = await prisma.crmCard.findMany({
      where: { boardId: boardId as string },
      include: { contact: true, stage: true },
      orderBy: { position: 'asc' },
    });
    res.json(cards);
  } catch (error) {
    res.status(500).json({ error: 'Erro ao listar cards' });
  }
});

// POST /api/crm/cards - Create card
router.post('/cards', async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { title, description, value, boardId, stageId, contactId } = req.body;

    const maxPos = await prisma.crmCard.findMany({
      where: { boardId, stageId },
      orderBy: { position: 'desc' },
      take: 1,
    });

    const card = await prisma.crmCard.create({
      data: {
        title,
        description,
        value,
        position: (maxPos[0]?.position ?? -1) + 1,
        boardId,
        stageId,
        contactId,
      },
      include: { contact: true, stage: true },
    });

    res.status(201).json(card);
  } catch (error) {
    res.status(500).json({ error: 'Erro ao criar card' });
  }
});

// PUT /api/crm/cards/:id - Update card (move, edit)
router.put('/cards/:id', async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { title, description, value, stageId, position } = req.body;
    const card = await prisma.crmCard.update({
      where: { id: req.params.id },
      data: { title, description, value, stageId, position },
      include: { contact: true, stage: true },
    });
    res.json(card);
  } catch (error) {
    res.status(500).json({ error: 'Erro ao atualizar card' });
  }
});

// PUT /api/crm/cards/:id/move - Move card between stages
router.put('/cards/:id/move', async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { stageId, position } = req.body;
    const card = await prisma.crmCard.update({
      where: { id: req.params.id },
      data: { stageId, position },
      include: { contact: true, stage: true },
    });
    res.json(card);
  } catch (error) {
    res.status(500).json({ error: 'Erro ao mover card' });
  }
});

// DELETE /api/crm/cards/:id
router.delete('/cards/:id', async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    await prisma.crmCard.delete({ where: { id: req.params.id } });
    res.json({ message: 'Card removido' });
  } catch (error) {
    res.status(500).json({ error: 'Erro ao remover card' });
  }
});

// ─── Contacts ──────────────────────────────────────────

// GET /api/crm/contacts - List contacts
router.get('/contacts', async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { search } = req.query;
    const where: any = { userId: req.user!.userId };

    if (search) {
      where.OR = [
        { name: { contains: String(search), mode: 'insensitive' } },
        { phone: { contains: String(search) } },
        { email: { contains: String(search), mode: 'insensitive' } },
      ];
    }

    const contacts = await prisma.contact.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: 100,
    });

    res.json(contacts);
  } catch (error) {
    res.status(500).json({ error: 'Erro ao listar contatos' });
  }
});

// POST /api/crm/contacts - Create contact
router.post('/contacts', async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { name, phone, email, company, tags, notes } = req.body;
    const contact = await prisma.contact.create({
      data: {
        name,
        phone,
        email,
        company,
        tags: JSON.stringify(tags || []),
        notes,
        userId: req.user!.userId,
      },
    });
    res.status(201).json(contact);
  } catch (error) {
    res.status(500).json({ error: 'Erro ao criar contato' });
  }
});

// PUT /api/crm/contacts/:id
router.put('/contacts/:id', async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { name, phone, email, company, tags, notes } = req.body;
    const contact = await prisma.contact.update({
      where: { id: req.params.id },
      data: { name, phone, email, company, tags, notes },
    });
    res.json(contact);
  } catch (error) {
    res.status(500).json({ error: 'Erro ao atualizar contato' });
  }
});

// DELETE /api/crm/contacts/:id
router.delete('/contacts/:id', async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    await prisma.contact.delete({ where: { id: req.params.id } });
    res.json({ message: 'Contato removido' });
  } catch (error) {
    res.status(500).json({ error: 'Erro ao remover contato' });
  }
});

export default router;
