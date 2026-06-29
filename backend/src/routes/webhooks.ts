import { Router, Response } from 'express';
import prisma from '../config/database';
import { authenticate } from '../middleware/auth';
import { AuthRequest } from '../types';

const router = Router();
router.use(authenticate);

// GET /api/webhooks - List webhooks
router.get('/', async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const user = await prisma.user.findUnique({ where: { id: req.user!.userId } });
    if (!user?.organizationId) { res.json([]); return; }

    const webhooks = await prisma.webhook.findMany({
      where: { organizationId: user.organizationId },
      orderBy: { createdAt: 'desc' },
    });
    res.json(webhooks);
  } catch (error) {
    res.status(500).json({ error: 'Erro ao listar webhooks' });
  }
});

// POST /api/webhooks - Create webhook
router.post('/', async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const user = await prisma.user.findUnique({ where: { id: req.user!.userId } });
    if (!user?.organizationId) {
      res.status(400).json({ error: 'Sem organização' });
      return;
    }

    const { name, url, events, secret } = req.body;
    const webhook = await prisma.webhook.create({
      data: {
        name,
        url,
        events: events || [],
        secret,
        organizationId: user.organizationId,
      },
    });
    res.status(201).json(webhook);
  } catch (error) {
    res.status(500).json({ error: 'Erro ao criar webhook' });
  }
});

// PUT /api/webhooks/:id
router.put('/:id', async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { name, url, events, isActive } = req.body;
    const webhook = await prisma.webhook.update({
      where: { id: req.params.id },
      data: { name, url, events, isActive },
    });
    res.json(webhook);
  } catch (error) {
    res.status(500).json({ error: 'Erro ao atualizar webhook' });
  }
});

// DELETE /api/webhooks/:id
router.delete('/:id', async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    await prisma.webhook.delete({ where: { id: req.params.id } });
    res.json({ message: 'Webhook removido' });
  } catch (error) {
    res.status(500).json({ error: 'Erro ao remover webhook' });
  }
});

// POST /api/webhooks/:id/test - Test webhook
router.post('/:id/test', async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const webhook = await prisma.webhook.findUnique({ where: { id: req.params.id } });
    if (!webhook) { res.status(404).json({ error: 'Webhook não encontrado' }); return; }

    // Send test payload
    try {
      await fetch(webhook.url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          event: 'test',
          data: { message: 'ZapFlow webhook test', timestamp: new Date().toISOString() },
        }),
      });
      res.json({ success: true, message: 'Teste enviado com sucesso' });
    } catch {
      res.json({ success: false, message: 'Falha ao enviar teste' });
    }
  } catch (error) {
    res.status(500).json({ error: 'Erro ao testar webhook' });
  }
});

export default router;
