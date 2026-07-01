export interface User {
  id: string;
  name: string;
  email: string;
  role: 'OWNER' | 'ADMIN' | 'ATTENDANT';
  plan: string;
  avatar?: string;
  organization?: Organization;
}

export interface Organization {
  id: string;
  name: string;
  plan: string;
  logo?: string;
}

export interface WhatsAppNumber {
  id: string;
  number: string;
  name: string;
  status: 'CONNECTED' | 'DISCONNECTED' | 'CONNECTING';
  qrcode?: string;
  createdAt: string;
}

export interface Contact {
  id: string;
  name: string;
  phone: string;
  email?: string;
  company?: string;
  tags: string;
  notes?: string;
  utmSource?: string;
  utmMedium?: string;
  utmCampaign?: string;
  adId?: string;
  adTitle?: string;
  createdAt: string;
}

export interface Conversation {
  id: string;
  status: 'open' | 'closed' | 'pending';
  createdAt: string;
  updatedAt: string;
  messages: Message[];
  contact?: Contact;
  whatsappNumber: { number: string; name: string };
  tags: { tag: Tag }[];
  user?: { name: string };
}

export interface Message {
  id: string;
  content: string;
  type: 'TEXT' | 'IMAGE' | 'AUDIO' | 'VIDEO' | 'DOCUMENT';
  from: string;
  to: string;
  status: 'SENT' | 'DELIVERED' | 'READ' | 'FAILED';
  mediaUrl?: string;
  isFromBot: boolean;
  createdAt: string;
}

export interface Tag {
  id: string;
  name: string;
  color: string;
}

export interface Flow {
  id: string;
  name: string;
  description?: string;
  isActive: boolean;
  triggerType: string;
  triggerValue?: string;
  nodes: any[];
  edges: any[];
  createdAt: string;
  updatedAt: string;
}

export interface CrmBoard {
  id: string;
  name: string;
  stages: CrmStage[];
  _count: { cards: number };
}

export interface CrmStage {
  id: string;
  name: string;
  color: string;
  position: number;
}

export interface CrmCard {
  id: string;
  title: string;
  description?: string;
  value?: number;
  position: number;
  stageId: string;
  boardId: string;
  contact?: Contact;
  stage: CrmStage;
}

export interface Campaign {
  id: string;
  name: string;
  message: string;
  mediaUrl?: string;
  status: 'DRAFT' | 'SCHEDULED' | 'RUNNING' | 'COMPLETED' | 'PAUSED';
  scheduledAt?: string;
  totalSent: number;
  totalFailed: number;
  _count: { contacts: number };
  createdAt: string;
}

export interface Webhook {
  id: string;
  name: string;
  url: string;
  events: string[];
  isActive: boolean;
  createdAt: string;
}

export interface RemarketingSequence {
  id: string;
  name: string;
  description?: string;
  isActive: boolean;
  steps: any[];
  _count: { executions: number };
  createdAt: string;
}

export interface DashboardMetrics {
  totalMessages: number;
  activeConversations: number;
  totalContacts: number;
  activeFlows: number;
  totalCampaigns: number;
  conversionRate: number;
  messagesPerDay: { date: string; count: number }[];
  pipelineData: { stage: string; count: number; value: number }[];
}
