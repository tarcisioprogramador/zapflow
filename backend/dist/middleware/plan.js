"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.checkPlanLimit = checkPlanLimit;
const database_1 = __importDefault(require("../config/database"));
const types_1 = require("../types");
const trial_1 = require("../services/trial");
function checkPlanLimit(resource) {
    return async (req, res, next) => {
        try {
            if (!req.user) {
                res.status(401).json({ error: 'Não autenticado' });
                return;
            }
            const user = await database_1.default.user.findUnique({
                where: { id: req.user.userId },
                include: { organization: true },
            });
            if (!user) {
                res.status(404).json({ error: 'Usuário não encontrado' });
                return;
            }
            // Check if trial expired — block ALL resource creation
            const trialExpired = await (0, trial_1.isUserTrialExpired)(req.user.userId);
            if (trialExpired && (user.plan === 'FREE' || user.plan === 'STARTER')) {
                res.status(403).json({
                    error: 'Seu período de teste gratuito expirou. Faça upgrade do plano para continuar usando.',
                    trialExpired: true,
                });
                return;
            }
            const plan = (user.organization?.plan || user.plan);
            const limits = types_1.PLAN_LIMITS[plan] || types_1.PLAN_LIMITS.FREE;
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
                    count = await database_1.default.whatsAppNumber.count({ where: { organizationId: orgId } });
                    break;
                case 'maxCrmBoards':
                    count = await database_1.default.crmBoard.count({ where: { organizationId: orgId } });
                    break;
                case 'maxFlows':
                    count = await database_1.default.flow.count({ where: { userId: req.user.userId } });
                    break;
                case 'maxCampaigns':
                    count = await database_1.default.campaign.count({ where: { userId: req.user.userId } });
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
        }
        catch (error) {
            res.status(500).json({ error: 'Erro ao verificar plano' });
        }
    };
}
//# sourceMappingURL=plan.js.map