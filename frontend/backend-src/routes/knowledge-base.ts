import { Router, Response } from 'express';
import prisma from '../config/database';
import { authenticate } from '../middleware/auth';
import { AuthRequest } from '../types';

const router = Router();
router.use(authenticate);

// ─── Static routes BEFORE /:id routes ───────────────────

// GET /api/knowledge-base - List all items
router.get('/', async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const user = await prisma.user.findUnique({ where: { id: req.user!.userId } });
    if (!user?.organizationId) { res.json([]); return; }

    const { search, category } = req.query;
    const where: any = { organizationId: user.organizationId };

    if (category) where.category = category;
    if (search) {
      const searchStr = String(search).toLowerCase();
      const items = await prisma.knowledgeBaseItem.findMany({ where: { organizationId: user.organizationId } });
      const filtered = items.filter(
        (i) => i.title.toLowerCase().includes(searchStr) || i.content.toLowerCase().includes(searchStr)
      );
      res.json(filtered);
      return;
    }

    const items = await prisma.knowledgeBaseItem.findMany({ where, orderBy: { updatedAt: 'desc' } });
    res.json(items);
  } catch (error) {
    res.status(500).json({ error: 'Erro ao listar base de conhecimento' });
  }
});

// GET /api/knowledge-base/stats - Get stats
router.get('/stats', async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const user = await prisma.user.findUnique({ where: { id: req.user!.userId } });
    if (!user?.organizationId) { res.json({ total: 0, categories: 0, characters: 0 }); return; }

    const items = await prisma.knowledgeBaseItem.findMany({
      where: { organizationId: user.organizationId },
    });

    const categories = [...new Set(items.map((i) => i.category))];
    const totalChars = items.reduce((sum, i) => sum + i.content.length, 0);

    res.json({ total: items.length, categories: categories.length, characters: totalChars });
  } catch (error) {
    res.status(500).json({ error: 'Erro ao buscar estatísticas' });
  }
});

// GET /api/knowledge-base/categories - List categories
router.get('/categories', async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const user = await prisma.user.findUnique({ where: { id: req.user!.userId } });
    if (!user?.organizationId) { res.json([]); return; }

    const items = await prisma.knowledgeBaseItem.findMany({
      where: { organizationId: user.organizationId },
      select: { category: true },
    });

    const categories = [...new Set(items.map((i) => i.category))];
    res.json(categories);
  } catch (error) {
    res.status(500).json({ error: 'Erro ao listar categorias' });
  }
});

// POST /api/knowledge-base - Create item
router.post('/', async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const user = await prisma.user.findUnique({ where: { id: req.user!.userId } });
    if (!user?.organizationId) {
      res.status(400).json({ error: 'Usuário não pertence a uma organização' });
      return;
    }

    const { title, content, category } = req.body;
    if (!title || !content) {
      res.status(400).json({ error: 'Título e conteúdo são obrigatórios' });
      return;
    }

    const item = await prisma.knowledgeBaseItem.create({
      data: { title, content, category: category || 'Geral', organizationId: user.organizationId },
    });

    res.status(201).json(item);
  } catch (error) {
    res.status(500).json({ error: 'Erro ao criar item' });
  }
});

// POST /api/knowledge-base/ai-context - Generate AI context
router.post('/ai-context', async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const user = await prisma.user.findUnique({ where: { id: req.user!.userId } });
    if (!user?.organizationId) {
      res.status(400).json({ error: 'Usuário não pertence a uma organização' });
      return;
    }

    const items = await prisma.knowledgeBaseItem.findMany({
      where: { organizationId: user.organizationId },
      orderBy: { category: 'asc' },
    });

    const contextByCategory: Record<string, string[]> = {};
    items.forEach((item) => {
      if (!contextByCategory[item.category]) contextByCategory[item.category] = [];
      contextByCategory[item.category].push(`**${item.title}**: ${item.content}`);
    });

    let context = 'BASE DE CONHECIMENTO DA EMPRESA:\n\n';
    Object.entries(contextByCategory).forEach(([category, entries]) => {
      context += `## ${category}\n`;
      entries.forEach((entry) => { context += `${entry}\n\n`; });
    });

    res.json({
      context,
      itemCount: items.length,
      totalCharacters: items.reduce((sum, i) => sum + i.content.length, 0),
    });
  } catch (error) {
    res.status(500).json({ error: 'Erro ao gerar contexto de IA' });
  }
});

// ─── Dynamic /:id routes AFTER static routes ────────────

// PUT /api/knowledge-base/:id - Update item (with authorization)
router.put('/:id', async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const user = await prisma.user.findUnique({ where: { id: req.user!.userId } });
    if (!user?.organizationId) {
      res.status(400).json({ error: 'Sem organização' });
      return;
    }

    const { title, content, category } = req.body;
    const item = await prisma.knowledgeBaseItem.update({
      where: { id: req.params.id },
      data: { title, content, category },
    });

    // Verify ownership
    if (item.organizationId !== user.organizationId) {
      res.status(403).json({ error: 'Sem permissão' });
      return;
    }

    res.json(item);
  } catch (error) {
    res.status(500).json({ error: 'Erro ao atualizar item' });
  }
});

// DELETE /api/knowledge-base/:id - Delete item (with authorization)
router.delete('/:id', async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const user = await prisma.user.findUnique({ where: { id: req.user!.userId } });
    if (!user?.organizationId) {
      res.status(400).json({ error: 'Sem organização' });
      return;
    }

    const item = await prisma.knowledgeBaseItem.findUnique({ where: { id: req.params.id } });
    if (!item || item.organizationId !== user.organizationId) {
      res.status(404).json({ error: 'Item não encontrado' });
      return;
    }

    await prisma.knowledgeBaseItem.delete({ where: { id: req.params.id } });
    res.json({ message: 'Item removido' });
  } catch (error) {
    res.status(500).json({ error: 'Erro ao remover item' });
  }
});

export default router;
