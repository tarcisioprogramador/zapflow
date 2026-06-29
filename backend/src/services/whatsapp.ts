/**
 * Evolution API v2 Integration Service
 * Docs: https://doc.evolution-api.com/
 *
 * Handles: instance creation, QR code, message sending, webhooks
 */

const BASE_URL = process.env.WHATSAPP_API_URL || '';
const API_KEY = process.env.WHATSAPP_API_KEY || '';

interface EvolutionHeaders {
  'Content-Type': string;
  apikey: string;
}

function headers(): EvolutionHeaders {
  return { 'Content-Type': 'application/json', apikey: API_KEY };
}

// ─── Instance Management ────────────────────────────────

export interface CreateInstanceParams {
  instanceName: string;
  number: string;
  qrcode?: boolean;
  integration?: 'WHATSAPP-BAILEYS' | 'WHATSAPP-CLOUD';
  webhook?: {
    enabled: boolean;
    url: string;
    events: string[];
  };
}

export interface InstanceInfo {
  instance: {
    instanceName: string;
    instanceId: string;
    status: string;
    owner?: string;
  };
}

/**
 * Create a new WhatsApp instance
 */
export async function createInstance(params: CreateInstanceParams): Promise<InstanceInfo> {
  const res = await fetch(`${BASE_URL}/instance/create`, {
    method: 'POST',
    headers: headers(),
    body: JSON.stringify({
      instanceName: params.instanceName,
      number: params.number,
      qrcode: params.qrcode ?? true,
      integration: params.integration || 'WHATSAPP-BAILEYS',
      webhook: params.webhook,
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Evolution API createInstance failed: ${res.status} - ${err}`);
  }

  return res.json();
}

/**
 * Get QR code to connect WhatsApp
 */
export async function getQRCode(instanceName: string): Promise<{ base64: string; code: string }> {
  const res = await fetch(`${BASE_URL}/instance/connect/${instanceName}`, {
    method: 'GET',
    headers: headers(),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Evolution API getQRCode failed: ${res.status} - ${err}`);
  }

  return res.json();
}

/**
 * Get connection status
 */
export async function getConnectionState(instanceName: string): Promise<{
  instance: { connectionStatus: string };
}> {
  const res = await fetch(`${BASE_URL}/instance/connectionState/${instanceName}`, {
    method: 'GET',
    headers: headers(),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Evolution API getConnectionState failed: ${res.status} - ${err}`);
  }

  return res.json();
}

/**
 * Logout / disconnect instance
 */
export async function logoutInstance(instanceName: string): Promise<void> {
  const res = await fetch(`${BASE_URL}/instance/logout/${instanceName}`, {
    method: 'DELETE',
    headers: headers(),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Evolution API logoutInstance failed: ${res.status} - ${err}`);
  }
}

/**
 * Delete instance
 */
export async function deleteInstance(instanceName: string): Promise<void> {
  const res = await fetch(`${BASE_URL}/instance/delete/${instanceName}`, {
    method: 'DELETE',
    headers: headers(),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Evolution API deleteInstance failed: ${res.status} - ${err}`);
  }
}

// ─── Message Sending ────────────────────────────────────

export interface SendTextParams {
  instanceName: string;
  number: string;  // Format: 5511999999999 (no + or spaces)
  text: string;
  delay?: number;  // Simulate typing delay in ms
}

export interface SendMediaParams {
  instanceName: string;
  number: string;
  mediatype: 'image' | 'video' | 'audio' | 'document';
  media: string;   // URL or base64
  caption?: string;
  fileName?: string;
  mimetype?: string;
}

/**
 * Send a text message
 */
export async function sendText(params: SendTextParams): Promise<any> {
  const res = await fetch(`${BASE_URL}/message/sendText/${params.instanceName}`, {
    method: 'POST',
    headers: headers(),
    body: JSON.stringify({
      number: params.number,
      text: params.text,
      delay: params.delay || 1200,
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Evolution API sendText failed: ${res.status} - ${err}`);
  }

  return res.json();
}

/**
 * Send media message (image, video, audio, document)
 */
export async function sendMedia(params: SendMediaParams): Promise<any> {
  const res = await fetch(`${BASE_URL}/message/sendMedia/${params.instanceName}`, {
    method: 'POST',
    headers: headers(),
    body: JSON.stringify({
      number: params.number,
      mediatype: params.mediatype,
      media: params.media,
      caption: params.caption,
      fileName: params.fileName,
      mimetype: params.mimetype,
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Evolution API sendMedia failed: ${res.status} - ${err}`);
  }

  return res.json();
}

// ─── Webhook Configuration ──────────────────────────────

export interface WebhookConfig {
  enabled: boolean;
  url: string;
  events: string[];
  webhookByEvents?: boolean;
  webhookBase64?: boolean;
}

/**
 * Configure webhook for an instance
 */
export async function setWebhook(instanceName: string, config: WebhookConfig): Promise<any> {
  const res = await fetch(`${BASE_URL}/webhook/set/${instanceName}`, {
    method: 'POST',
    headers: headers(),
    body: JSON.stringify({ webhook: config }),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Evolution API setWebhook failed: ${res.status} - ${err}`);
  }

  return res.json();
}

// ─── Incoming Message Types ─────────────────────────────

export interface EvolutionWebhookPayload {
  event: string;
  instance: string;
  data: {
    key: {
      remoteJid: string;
      fromMe: boolean;
      id: string;
    };
    pushName?: string;
    message?: {
      conversation?: string;
      extendedTextMessage?: {
        text?: string;
      };
      imageMessage?: {
        caption?: string;
        url?: string;
        mimetype?: string;
      };
      videoMessage?: {
        caption?: string;
        url?: string;
        mimetype?: string;
      };
      audioMessage?: {
        url?: string;
        mimetype?: string;
      };
      documentMessage?: {
        fileName?: string;
        url?: string;
        mimetype?: string;
      };
    };
    messageType?: string;
    messageTimestamp?: number;
  };
}

/**
 * Parse an incoming webhook payload from Evolution API
 */
export function parseIncomingMessage(payload: EvolutionWebhookPayload): {
  from: string;
  fromName: string;
  content: string;
  type: string;
  mediaUrl?: string;
  isGroup: boolean;
} | null {
  if (payload.event !== 'messages.upsert') return null;

  const { key, pushName, message } = payload.data;
  if (key.fromMe) return null; // Ignore our own messages

  const from = key.remoteJid.replace('@s.whatsapp.net', '').replace('@lid', '');
  const isGroup = key.remoteJid.includes('@g.us');

  let content = '';
  let type = 'TEXT';
  let mediaUrl: string | undefined;

  if (message?.conversation) {
    content = message.conversation;
  } else if (message?.extendedTextMessage?.text) {
    content = message.extendedTextMessage.text;
  } else if (message?.imageMessage) {
    content = message.imageMessage.caption || '';
    type = 'IMAGE';
    mediaUrl = message.imageMessage.url;
  } else if (message?.videoMessage) {
    content = message.videoMessage.caption || '';
    type = 'VIDEO';
    mediaUrl = message.videoMessage.url;
  } else if (message?.audioMessage) {
    type = 'AUDIO';
    mediaUrl = message.audioMessage.url;
  } else if (message?.documentMessage) {
    content = message.documentMessage.fileName || '';
    type = 'DOCUMENT';
    mediaUrl = message.documentMessage.url;
  }

  return {
    from,
    fromName: pushName || from,
    content,
    type,
    mediaUrl,
    isGroup,
  };
}
