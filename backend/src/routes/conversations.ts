import { Router, Response } from 'express';
import prisma from '../config/database';
import { authenticate } from '../middleware/auth';
import { AuthRequest, ConversationStatus } from '../types';
import { Prisma } from '../generated/prisma/client';

const router = Router();
router.use(authenticate);

// ─── Static routes MUST come before /:id to avoid :id catching them ──

// POST /api/tags - Create tag
router.post('/tags', async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { name, color } = req.body;
    const tag = await prisma.tag.create({ data: { name, color } });
    res.status(201).json(tag);
  } catch (error) {
    res.status(500).json({ error: 'Erro ao criar tag' });
  }
});

// GET /api/tags - List tags
router.get('/tags', async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const tags = await prisma.tag.findMany({ orderBy: { name: 'asc' } });
    res.json(tags);
  } catch (error) {
    res.status(500).json({ error: 'Erro ao listar tags' });
  }
});

// ─── Conversations ────────────────────────────────────────

// GET /api/conversations - List conversations
router.get('/', async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ error: 'Não autenticado' });
      return;
    }

    const { status, search, whatsappNumberId } = req.query as Record<string, string | undefined>;

    const where: Prisma.ConversationWhereInput = {};

    if (status) where.status = status as ConversationStatus;
    if (whatsappNumberId) where.whatsappNumberId = whatsappNumberId;

    // Get user's organization numbers
    const user = await prisma.user.findUnique({ where: { id: req.user.userId } });
    if (user?.organizationId) {
      const orgNumbers = await prisma.whatsAppNumber.findMany({
        where: { organizationId: user.organizationId },
        select: { id: true },
      });
      where.whatsappNumberId = { in: orgNumbers.map((n) => n.id) };
    }

    const conversations = await prisma.conversation.findMany({
      where,
      include: {
        messages: { orderBy: { createdAt: 'desc' }, take: 1 },
        contact: true,
        whatsappNumber: { select: { id: true, number: true, name: true } },
        tags: { include: { tag: true } },
        user: { select: { name: true } },
      },
      orderBy: { updatedAt: 'desc' },
    });

    // If search, filter by contact name or phone
    const searchStr = String(search || '').toLowerCase();
    const filtered = searchStr
      ? conversations.filter(
          (c) =>
            c.contact?.name.toLowerCase().includes(searchStr) ||
            c.contact?.phone.includes(searchStr)
        )
      : conversations;

    res.json(filtered);
  } catch (error) {
    res.status(500).json({ error: 'Erro ao listar conversas' });
  }
});

// GET /api/conversations/:id - Get conversation detail
router.get('/:id', async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const conversation = await prisma.conversation.findUnique({
      where: { id: req.params.id },
      include: {
        messages: { orderBy: { createdAt: 'asc' } },
        contact: true,
        whatsappNumber: { select: { id: true, number: true, name: true } },
        tags: { include: { tag: true } },
        user: { select: { name: true } },
      },
    });

    if (!conversation) {
      res.status(404).json({ error: 'Conversa não encontrada' });
      return;
    }

    res.json(conversation);
  } catch (error) {
    res.status(500).json({ error: 'Erro ao buscar conversa' });
  }
});

// POST /api/conversations/:id/assign - Assign conversation to user
router.post('/:id/assign', async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const conversation = await prisma.conversation.update({
      where: { id: req.params.id },
      data: { userId: req.user!.userId },
    });
    res.json(conversation);
  } catch (error) {
    res.status(500).json({ error: 'Erro ao atribuir conversa' });
  }
});

// PUT /api/conversations/:id/status - Update conversation status
router.put('/:id/status', async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { status } = req.body;
    const conversation = await prisma.conversation.update({
      where: { id: req.params.id },
      data: { status },
    });
    res.json(conversation);
  } catch (error) {
    res.status(500).json({ error: 'Erro ao atualizar status' });
  }
});

// POST /api/conversations/:id/tags - Add tag to conversation
router.post('/:id/tags', async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { tagId } = req.body;
    await prisma.conversationTag.create({
      data: { conversationId: req.params.id, tagId },
    });
    res.json({ message: 'Tag adicionada' });
  } catch (error) {
    res.status(500).json({ error: 'Erro ao adicionar tag' });
  }
});

// DELETE /api/conversations/:id/tags/:tagId - Remove tag
router.delete('/:id/tags/:tagId', async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    await prisma.conversationTag.delete({
      where: {
        conversationId_tagId: {
          conversationId: req.params.id,
          tagId: req.params.tagId,
        },
      },
    });
    res.json({ message: 'Tag removida' });
  } catch (error) {
    res.status(500).json({ error: 'Erro ao remover tag' });
  }
});

export default router;
