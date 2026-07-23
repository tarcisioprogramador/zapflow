/**
 * Evolution API v2 Integration Service
 * Docs: https://doc.evolution-api.com/
 *
 * Handles: instance creation, QR code, message sending, webhooks
 */
export declare const BASE_URL: string;
export declare const API_KEY: string;
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
export declare function createInstance(params: CreateInstanceParams): Promise<InstanceInfo>;
/**
 * Get QR code to connect WhatsApp
 */
export declare function getQRCode(instanceName: string): Promise<{
    base64: string;
    code: string;
}>;
/**
 * Get connection status
 */
export declare function getConnectionState(instanceName: string): Promise<{
    instance: {
        connectionStatus: string;
    };
}>;
/**
 * Logout / disconnect instance
 */
export declare function logoutInstance(instanceName: string): Promise<void>;
/**
 * Delete instance
 */
export declare function deleteInstance(instanceName: string): Promise<void>;
export interface SendTextParams {
    instanceName: string;
    number: string;
    text: string;
    delay?: number;
}
export interface SendMediaParams {
    instanceName: string;
    number: string;
    mediatype: 'image' | 'video' | 'audio' | 'document';
    media: string;
    caption?: string;
    fileName?: string;
    mimetype?: string;
}
/**
 * Send a text message
 */
export declare function sendText(params: SendTextParams): Promise<any>;
/**
 * Send media message (image, video, audio, document)
 */
export declare function sendMedia(params: SendMediaParams): Promise<any>;
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
export declare function setWebhook(instanceName: string, config: WebhookConfig): Promise<any>;
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
export declare function parseIncomingMessage(payload: EvolutionWebhookPayload): {
    from: string;
    fromName: string;
    content: string;
    type: string;
    mediaUrl?: string;
    isGroup: boolean;
} | null;
//# sourceMappingURL=whatsapp.d.ts.map