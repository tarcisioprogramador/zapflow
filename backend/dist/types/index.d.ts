import { Request, Response } from 'express';
export type UserRole = 'OWNER' | 'ADMIN' | 'ATTENDANT';
export type PlanName = 'FREE' | 'STARTER' | 'PRO' | 'ENTERPRISE';
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
export declare const PLAN_LIMITS: Record<PlanName, PlanLimits>;
export type FlowNodeType = 'startNode' | 'message' | 'delay' | 'ai' | 'condition';
export interface FlowNode {
    id: string;
    type: FlowNodeType;
    position: {
        x: number;
        y: number;
    };
    data: Record<string, unknown>;
}
/**
 * Verify that a resource belongs to the authenticated user (by userId).
 * Returns the resource if found and owned, otherwise sends 403/404 and returns null.
 *
 * Use this for resources that have a direct `userId` foreign key (e.g., campaigns, flows, contacts).
 */
export declare function verifyOwnership<T extends {
    id: string;
    userId?: string | null;
}>(resource: T | null, userId: string, res: Response, resourceName?: string): Promise<T | null>;
/**
 * Verify that a resource's organization matches the user's organization.
 * If `resourceOrOrgId` has an `id` property, it's treated as a full resource object.
 * Otherwise it's treated as a raw organizationId string.
 */
export declare function verifyOrgAccess(resourceOrOrgId: {
    id: string;
    organizationId?: string | null;
} | {
    organizationId: string;
} | null, userId: string, res: Response, resourceName?: string): Promise<boolean>;
export type MessageType = 'TEXT' | 'IMAGE' | 'VIDEO' | 'AUDIO' | 'DOCUMENT';
export type WhatsAppStatus = 'CONNECTED' | 'DISCONNECTED' | 'CONNECTING';
export type ConversationStatus = 'open' | 'closed' | 'waiting';
export type CampaignStatus = 'DRAFT' | 'RUNNING' | 'PAUSED' | 'COMPLETED' | 'FAILED';
export type AIIntent = 'compra' | 'duvida' | 'suporte' | 'elogio' | 'reclamacao' | 'cancelamento' | 'saudacao' | 'outro';
export type AIProvider = 'groq' | 'gemini' | 'openai';
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
//# sourceMappingURL=index.d.ts.map