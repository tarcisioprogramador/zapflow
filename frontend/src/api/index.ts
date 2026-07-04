import axios from 'axios';
import { useAuthStore } from '../store';

const api = axios.create({
  baseURL: '/api',
  headers: { 'Content-Type': 'application/json' },
});

api.interceptors.request.use((config) => {
  const token = useAuthStore.getState().token;
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      useAuthStore.getState().logout();
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

// Auth
export const authApi = {
  login: (data: { email: string; password: string }) => api.post('/auth/login', data),
  register: (data: { name: string; email: string; password: string; organizationName?: string }) =>
    api.post('/auth/register', data),
  me: () => api.get('/auth/me'),
  updateProfile: (data: any) => api.put('/auth/profile', data),
  trial: () => api.get('/auth/trial'),
};

// WhatsApp
export const whatsappApi = {
  list: () => api.get('/whatsapp'),
  connect: (data: { number: string; name: string }) => api.post('/whatsapp/connect', data),
  send: (id: string, data: { to: string; message: string; type?: string }) =>
    api.post(`/whatsapp/${id}/send`, data),
  delete: (id: string) => api.delete(`/whatsapp/${id}`),
  disconnect: (id: string) => api.post(`/whatsapp/${id}/disconnect`),
  getQrCode: (id: string) => api.get(`/whatsapp/${id}/qrcode`),
};

// Conversations
export const conversationsApi = {
  list: (params?: any) => api.get('/conversations', { params }),
  get: (id: string) => api.get(`/conversations/${id}`),
  assign: (id: string) => api.post(`/conversations/${id}/assign`),
  updateStatus: (id: string, status: string) => api.put(`/conversations/${id}/status`, { status }),
  addTag: (id: string, tagId: string) => api.post(`/conversations/${id}/tags`, { tagId }),
  removeTag: (id: string, tagId: string) => api.delete(`/conversations/${id}/tags/${tagId}`),
};

// Tags
export const tagsApi = {
  list: () => api.get('/conversations/tags'),
  create: (data: { name: string; color: string }) => api.post('/conversations/tags', data),
};

// CRM
export const crmApi = {
  listBoards: () => api.get('/crm/boards'),
  createBoard: (data: { name: string }) => api.post('/crm/boards', data),
  updateBoard: (id: string, data: any) => api.put(`/crm/boards/${id}`, data),
  deleteBoard: (id: string) => api.delete(`/crm/boards/${id}`),
  listCards: (boardId: string) => api.get('/crm/cards', { params: { boardId } }),
  createCard: (data: any) => api.post('/crm/cards', data),
  updateCard: (id: string, data: any) => api.put(`/crm/cards/${id}`, data),
  moveCard: (id: string, data: any) => api.put(`/crm/cards/${id}/move`, data),
  deleteCard: (id: string) => api.delete(`/crm/cards/${id}`),
  createStage: (data: any) => api.post('/crm/stages', data),
  updateStage: (id: string, data: any) => api.put(`/crm/stages/${id}`, data),
  deleteStage: (id: string) => api.delete(`/crm/stages/${id}`),
  listContacts: (params?: any) => api.get('/crm/contacts', { params }),
  createContact: (data: any) => api.post('/crm/contacts', data),
  updateContact: (id: string, data: any) => api.put(`/crm/contacts/${id}`, data),
  deleteContact: (id: string) => api.delete(`/crm/contacts/${id}`),
};

// Flows
export const flowsApi = {
  list: () => api.get('/flows'),
  get: (id: string) => api.get(`/flows/${id}`),
  create: (data: any) => api.post('/flows', data),
  update: (id: string, data: any) => api.put(`/flows/${id}`, data),
  toggle: (id: string) => api.put(`/flows/${id}/toggle`),
  delete: (id: string) => api.delete(`/flows/${id}`),
  duplicate: (id: string) => api.post(`/flows/${id}/duplicate`),
};

// Campaigns
export const campaignsApi = {
  list: () => api.get('/campaigns'),
  get: (id: string) => api.get(`/campaigns/${id}`),
  create: (data: any) => api.post('/campaigns', data),
  update: (id: string, data: any) => api.put(`/campaigns/${id}`, data),
  updateStatus: (id: string, status: string) => api.put(`/campaigns/${id}/status`, { status }),
  delete: (id: string) => api.delete(`/campaigns/${id}`),
};

// Dashboard
export const dashboardApi = {
  metrics: () => api.get('/dashboard/metrics'),
  activity: () => api.get('/dashboard/activity'),
};

// Webhooks
export const webhooksApi = {
  list: () => api.get('/webhooks'),
  create: (data: any) => api.post('/webhooks', data),
  update: (id: string, data: any) => api.put(`/webhooks/${id}`, data),
  delete: (id: string) => api.delete(`/webhooks/${id}`),
  test: (id: string) => api.post(`/webhooks/${id}/test`),
};

// Remarketing
export const remarketingApi = {
  list: () => api.get('/remarketing'),
  create: (data: any) => api.post('/remarketing', data),
  update: (id: string, data: any) => api.put(`/remarketing/${id}`, data),
  delete: (id: string) => api.delete(`/remarketing/${id}`),
};

// Knowledge Base
export const knowledgeBaseApi = {
  list: (params?: any) => api.get('/knowledge-base', { params }),
  getStats: () => api.get('/knowledge-base/stats'),
  getCategories: () => api.get('/knowledge-base/categories'),
  create: (data: { title: string; content: string; category: string }) => api.post('/knowledge-base', data),
  update: (id: string, data: any) => api.put(`/knowledge-base/${id}`, data),
  delete: (id: string) => api.delete(`/knowledge-base/${id}`),
  getAiContext: () => api.post('/knowledge-base/ai-context'),
};

// Users
export const usersApi = {
  list: () => api.get('/users'),
  create: (data: any) => api.post('/users', data),
  updateRole: (id: string, role: string) => api.put(`/users/${id}`, { role }),
  delete: (id: string) => api.delete(`/users/${id}`),
};

// Payments
export const paymentsApi = {
  getConfig: () => api.get('/payments/config'),
  createCheckout: (data: { plan: string }) => api.post('/payments/create-checkout', data),
  getSession: (id: string) => api.get(`/payments/session/${id}`),
  getSubscription: () => api.get('/payments/subscription'),
  createPortal: () => api.post('/payments/portal'),
};

export default api;
