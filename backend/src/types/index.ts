import { Request } from 'express';

export interface AuthPayload {
  userId: string;
  email: string;
  role: string;
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

export const PLAN_LIMITS: Record<string, PlanLimits> = {
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

// Flow node types
export interface FlowNode {
  id: string;
  type: string;
  position: { x: number; y: number };
  data: Record<string, unknown>;
}

export interface FlowEdge {
  id: string;
  source: string;
  target: string;
  sourceHandle?: string;
  targetHandle?: string;
  label?: string;
  data?: Record<string, unknown>;
}
