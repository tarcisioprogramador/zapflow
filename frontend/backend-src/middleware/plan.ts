import { Response, NextFunction } from 'express';
import prisma from '../config/database';
import { AuthRequest, PLAN_LIMITS, PlanResourceKey } from '../types';
import { isUserTrialExpired } from '../services/trial';

type NumericResource = {
  [K in PlanResourceKey]: typeof PLAN_LIMITS['FREE'][K] extends number ? K : never;
}[PlanResourceKey];

export function checkPlanLimit(resource: NumericResource) {
  return async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      if (!req.user) {
        res.status(401).json({ error: 'Não autenticado' });
        return;
      }

      const user = await prisma.user.findUnique({
        where: { id: req.user.userId },
        include: { organization: true },
      });

      if (!user) {
        res.status(404).json({ error: 'Usuário não encontrado' });
        return;
      }

      // Check if trial expired — block ALL resource creation
      const trialExpired = await isUserTrialExpired(req.user.userId);
      if (trialExpired && (user.plan === 'FREE' || user.plan === 'STARTER')) {
        res.status(403).json({
          error: 'Seu período de teste gratuito expirou. Faça upgrade do plano para continuar usando.',
          trialExpired: true,
        });
        return;
      }

      const plan = (user.organization?.plan || user.plan) as keyof typeof PLAN_LIMITS;
      const limits = PLAN_LIMITS[plan] || PLAN_LIMITS.FREE;
      const limit = limits[resource];

      // Skip non-numeric limits (booleans like hasAI, hasIntegrations)
      if (typeof limit !== 'number') {
        next();
        return;
      }

      // -1 means unlimited
      if (limit === -1) {
        next();
        return;
      }

      // Count current usage
      let count = 0;
      const orgId = user.organizationId;

      switch (resource) {
        case 'maxNumbers':
          count = await prisma.whatsAppNumber.count({ where: { organizationId: orgId! } });
          break;
        case 'maxCrmBoards':
          count = await prisma.crmBoard.count({ where: { organizationId: orgId! } });
          break;
        case 'maxFlows':
          count = await prisma.flow.count({ where: { userId: req.user.userId } });
          break;
        case 'maxCampaigns':
          count = await prisma.campaign.count({ where: { userId: req.user.userId } });
          break;
        default:
          break;
      }

      if (count >= limit) {
        res.status(403).json({
          error: `Limite do plano atingido. Upgrade para continuar.`,
          limit,
          current: count,
        });
        return;
      }

      next();
    } catch (error) {
      res.status(500).json({ error: 'Erro ao verificar plano' });
    }
  };
}
