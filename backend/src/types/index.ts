import { Request, Response } from 'express';
import prisma from '../config/database';

// ─── User Roles ─────────────────────────────────────────
export type UserRole = 'OWNER' | 'ADMIN' | 'ATTENDANT';

// ─── Plan Names ─────────────────────────────────────────
export type PlanName = 'FREE' | 'STARTER' | 'PRO' | 'ENTERPRISE';

// ─── Resource Keys ──────────────────────────────────────
export type PlanResourceKey = keyof PlanLimits;

export interface AuthPayload {
  userId: string;
  email: string;
  role: UserRole;
}

export interface AuthRequest extends Request {
  user?: AuthPayload;
}

export interface PlanLimits {
  maxNumbers: number;
  maxAttendants: number;
  maxCrmBoards: number;
  maxFlows: number;
  maxCampaigns: number;
  hasAI: boolean;
  hasIntegrations: boolean;
}

/** -1 means unlimited */
export const PLAN_LIMITS: Record<PlanName, PlanLimits> = {
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

// ─── Flow Editor Types ─────────────────────────────────
export type FlowNodeType = 'startNode' | 'message' | 'delay' | 'ai' | 'condition';

export interface FlowNode {
  id: string;
  type: FlowNodeType;
  position: { x: number; y: number };
  data: Record<string, unknown>;
}

// ─── IDOR Protection Helpers ───────────────────────────

/**
 * Verify that a resource belongs to the authenticated user (by userId).
 * Returns the resource if found and owned, otherwise sends 403/404 and returns null.
 *
 * Use this for resources that have a direct `userId` foreign key (e.g., campaigns, flows, contacts).
 */
export async function verifyOwnership<T extends { id: string; userId?: string | null }>(
  resource: T | null,
  userId: string,
  res: Response,
  resourceName: string = 'Recurso'
): Promise<T | null> {
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
async function fetchUserOrgId(userId: string): Promise<string | null> {
  const user = await prisma.user.findUnique({
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
export async function verifyOrgAccess(
  resourceOrOrgId: { id: string; organizationId?: string | null } | { organizationId: string } | null,
  userId: string,
  res: Response,
  resourceName: string = 'Recurso'
): Promise<boolean> {
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

// ─── Message Types ──────────────────────────────────────
export type MessageType = 'TEXT' | 'IMAGE' | 'VIDEO' | 'AUDIO' | 'DOCUMENT';

// ─── WhatsApp Status ────────────────────────────────────
export type WhatsAppStatus = 'CONNECTED' | 'DISCONNECTED' | 'CONNECTING';

// ─── Conversation Status ────────────────────────────────
export type ConversationStatus = 'open' | 'closed' | 'waiting';

// ─── Campaign Status ────────────────────────────────────
export type CampaignStatus = 'DRAFT' | 'RUNNING' | 'PAUSED' | 'COMPLETED' | 'FAILED';

// ─── AI Intent Types ────────────────────────────────────
export type AIIntent = 'compra' | 'duvida' | 'suporte' | 'elogio' | 'reclamacao' | 'cancelamento' | 'saudacao' | 'outro';

// ─── AI Provider Types ──────────────────────────────────
export type AIProvider = 'groq' | 'gemini' | 'openai';

// ─── Queue Job Types ────────────────────────────────────
export interface WhatsAppJob {
  to: string;
  message: string;
  messageId: string;
}

export interface CampaignJob {
  campaignId: string;
  contactId: string;
  phone: string;
  message: string;
}

export interface RemarketingJob {
  executionId: string;
  contactId: string;
}
