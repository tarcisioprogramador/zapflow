"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.PLAN_LIMITS = void 0;
exports.verifyOwnership = verifyOwnership;
exports.verifyOrgAccess = verifyOrgAccess;
const database_1 = __importDefault(require("../config/database"));
/** -1 means unlimited */
exports.PLAN_LIMITS = {
    FREE: {
        maxNumbers: 1,
        maxAttendants: 1,
        maxCrmBoards: 1,
        maxFlows: 3,
        maxCampaigns: 0,
        hasAI: false,
        hasIntegrations: false,
    },
    STARTER: {
        maxNumbers: 1,
        maxAttendants: 5,
        maxCrmBoards: 2,
        maxFlows: 10,
        maxCampaigns: 5,
        hasAI: false,
        hasIntegrations: false,
    },
    PRO: {
        maxNumbers: 3,
        maxAttendants: -1, // unlimited
        maxCrmBoards: 5,
        maxFlows: -1, // unlimited
        maxCampaigns: -1, // unlimited
        hasAI: true,
        hasIntegrations: true,
    },
    ENTERPRISE: {
        maxNumbers: -1, // unlimited
        maxAttendants: -1,
        maxCrmBoards: -1,
        maxFlows: -1,
        maxCampaigns: -1,
        hasAI: true,
        hasIntegrations: true,
    },
};
// ─── IDOR Protection Helpers ───────────────────────────
/**
 * Verify that a resource belongs to the authenticated user (by userId).
 * Returns the resource if found and owned, otherwise sends 403/404 and returns null.
 *
 * Use this for resources that have a direct `userId` foreign key (e.g., campaigns, flows, contacts).
 */
async function verifyOwnership(resource, userId, res, resourceName = 'Recurso') {
    if (!resource) {
        res.status(404).json({ error: `${resourceName} não encontrado` });
        return null;
    }
    // Block if the resource has a userId that doesn't match the requester
    // Also block orphaned resources (userId = null) from being accessed
    if (resource.userId === undefined || resource.userId === null || resource.userId !== userId) {
        res.status(403).json({ error: 'Sem permissão para acessar este recurso' });
        return null;
    }
    return resource;
}
/**
 * Check if a resource's organizationId matches the user's organization.
 * Sends 403/404 if not authorized and returns false.
 * Returns true if authorized.
 *
 * Unlike verifyOwnership, this accepts a simple orgId value (not a full resource object)
 * to support cases where the resource is fetched with `select` (without `id`).
 */
async function fetchUserOrgId(userId) {
    const user = await database_1.default.user.findUnique({
        where: { id: userId },
        select: { organizationId: true },
    });
    return user?.organizationId || null;
}
/**
 * Verify that a resource's organization matches the user's organization.
 * If `resourceOrOrgId` has an `id` property, it's treated as a full resource object.
 * Otherwise it's treated as a raw organizationId string.
 */
async function verifyOrgAccess(resourceOrOrgId, userId, res, resourceName = 'Recurso') {
    if (!resourceOrOrgId) {
        res.status(404).json({ error: `${resourceName} não encontrado` });
        return false;
    }
    const userOrgId = await fetchUserOrgId(userId);
    const resourceOrgId = 'id' in resourceOrOrgId ? resourceOrOrgId.organizationId : resourceOrOrgId.organizationId;
    if (!userOrgId || resourceOrgId !== userOrgId) {
        res.status(403).json({ error: 'Sem permissão para acessar este recurso' });
        return false;
    }
    return true;
}
//# sourceMappingURL=index.js.map