import { Router, Response } from 'express';
import prisma from '../config/database';
import { authenticate } from '../middleware/auth';
import { AuthRequest } from '../types';

const router = Router();
router.use(authenticate);

// GET /api/dashboard/metrics
router.get('/metrics', async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user!.userId;
    const user = await prisma.user.findUnique({ where: { id: userId } });
    const orgId = user?.organizationId;

    const now = new Date();
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

    // Get WhatsApp number IDs for the org
    const orgNumbers = orgId
      ? await prisma.whatsAppNumber.findMany({ where: { organizationId: orgId }, select: { id: true } })
      : [];
    const numberIds = orgNumbers.map((n) => n.id);

    // Total messages (last 30 days)
    const totalMessages = await prisma.message.count({
      where: {
        conversation: { whatsappNumberId: { in: numberIds } },
        createdAt: { gte: thirtyDaysAgo },
      },
    });

    // Active conversations
    const activeConversations = await prisma.conversation.count({
      where: {
        whatsappNumberId: { in: numberIds },
        status: 'open',
      },
    });

    // Total contacts
    const totalContacts = await prisma.contact.count({
      where: { userId },
    });

    // Active flows
    const activeFlows = await prisma.flow.count({
      where: { userId, isActive: true },
    });

    // Messages per day (last 7 days) - SQLite compatible
    let messagesPerDay: any[] = [];
    if (numberIds.length > 0) {
      messagesPerDay = await prisma.$queryRawUnsafe(
        `SELECT DATE(created_at) as date, COUNT(*) as count
         FROM messages m
         JOIN conversations c ON m.conversation_id = c.id
         WHERE c.whatsapp_number_id IN (${numberIds.map(() => '?').join(',')})
         AND m.created_at >= ?
         GROUP BY DATE(created_at)
         ORDER BY date ASC`,
        ...numberIds, sevenDaysAgo
      );
    }

    // Total campaigns
    const totalCampaigns = await prisma.campaign.count({
      where: { userId },
    });

    // Cards by stage (CRM summary)
    const cardsByStage = orgId
      ? await prisma.crmCard.groupBy({
          by: ['stageId'],
          where: {
            board: { organizationId: orgId },
          },
          _count: true,
          _sum: { value: true },
        })
      : [];

    // Get stage names
    const stageIds = cardsByStage.map((c) => c.stageId);
    const stages = await prisma.crmStage.findMany({
      where: { id: { in: stageIds } },
    });
    const stageMap = new Map(stages.map((s) => [s.id, s.name]));

    const pipelineData = cardsByStage.map((c) => ({
      stage: stageMap.get(c.stageId) || 'Desconhecido',
      count: c._count,
      value: c._sum.value || 0,
    }));

    // Conversion rate (cards in "Fechado" stage / total cards)
    const totalCards = await prisma.crmCard.count({
      where: { board: orgId ? { organizationId: orgId } : undefined },
    });
    const closedCards = await prisma.crmCard.count({
      where: {
        board: orgId ? { organizationId: orgId } : undefined,
        stage: { name: 'Fechado' },
      },
    });

    const conversionRate = totalCards > 0 ? ((closedCards / totalCards) * 100).toFixed(1) : '0';

    res.json({
      totalMessages,
      activeConversations,
      totalContacts,
      activeFlows,
      totalCampaigns,
      conversionRate: parseFloat(conversionRate),
      messagesPerDay,
      pipelineData,
    });
  } catch (error) {
    console.error('Dashboard error:', error);
    res.status(500).json({ error: 'Erro ao buscar métricas' });
  }
});

// GET /api/dashboard/activity - Recent activity
router.get('/activity', async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const user = await prisma.user.findUnique({ where: { id: req.user!.userId } });
    const orgId = user?.organizationId;

    const orgNumbers = orgId
      ? await prisma.whatsAppNumber.findMany({ where: { organizationId: orgId }, select: { id: true } })
      : [];
    const numberIds = orgNumbers.map((n) => n.id);

    const recentMessages = await prisma.message.findMany({
      where: {
        conversation: { whatsappNumberId: { in: numberIds } },
      },
      include: {
        conversation: {
          include: { contact: { select: { name: true, phone: true } } },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: 20,
    });

    res.json(recentMessages);
  } catch (error) {
    res.status(500).json({ error: 'Erro ao buscar atividade' });
  }
});

export default router;
