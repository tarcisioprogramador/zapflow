"use strict";
/**
 * Evolution API v2 Integration Service
 * Docs: https://doc.evolution-api.com/
 *
 * Handles: instance creation, QR code, message sending, webhooks
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.API_KEY = exports.BASE_URL = void 0;
exports.createInstance = createInstance;
exports.getQRCode = getQRCode;
exports.getConnectionState = getConnectionState;
exports.logoutInstance = logoutInstance;
exports.deleteInstance = deleteInstance;
exports.sendText = sendText;
exports.sendMedia = sendMedia;
exports.setWebhook = setWebhook;
exports.parseIncomingMessage = parseIncomingMessage;
exports.BASE_URL = process.env.WHATSAPP_API_URL || '';
exports.API_KEY = process.env.WHATSAPP_API_KEY || '';
function headers() {
    return { 'Content-Type': 'application/json', apikey: exports.API_KEY };
}
/**
 * Create a new WhatsApp instance
 */
async function createInstance(params) {
    const res = await fetch(`${exports.BASE_URL}/instance/create`, {
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
async function getQRCode(instanceName) {
    const res = await fetch(`${exports.BASE_URL}/instance/connect/${instanceName}`, {
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
async function getConnectionState(instanceName) {
    const res = await fetch(`${exports.BASE_URL}/instance/connectionState/${instanceName}`, {
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
async function logoutInstance(instanceName) {
    const res = await fetch(`${exports.BASE_URL}/instance/logout/${instanceName}`, {
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
async function deleteInstance(instanceName) {
    const res = await fetch(`${exports.BASE_URL}/instance/delete/${instanceName}`, {
        method: 'DELETE',
        headers: headers(),
    });
    if (!res.ok) {
        const err = await res.text();
        throw new Error(`Evolution API deleteInstance failed: ${res.status} - ${err}`);
    }
}
/**
 * Send a text message
 */
async function sendText(params) {
    const res = await fetch(`${exports.BASE_URL}/message/sendText/${params.instanceName}`, {
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
async function sendMedia(params) {
    const res = await fetch(`${exports.BASE_URL}/message/sendMedia/${params.instanceName}`, {
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
/**
 * Configure webhook for an instance
 */
async function setWebhook(instanceName, config) {
    const res = await fetch(`${exports.BASE_URL}/webhook/set/${instanceName}`, {
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
/**
 * Parse an incoming webhook payload from Evolution API
 */
function parseIncomingMessage(payload) {
    if (payload.event !== 'messages.upsert')
        return null;
    const { key, pushName, message } = payload.data;
    if (key.fromMe)
        return null; // Ignore our own messages
    const from = key.remoteJid.replace('@s.whatsapp.net', '').replace('@lid', '');
    const isGroup = key.remoteJid.includes('@g.us');
    let content = '';
    let type = 'TEXT';
    let mediaUrl;
    if (message?.conversation) {
        content = message.conversation;
    }
    else if (message?.extendedTextMessage?.text) {
        content = message.extendedTextMessage.text;
    }
    else if (message?.imageMessage) {
        content = message.imageMessage.caption || '';
        type = 'IMAGE';
        mediaUrl = message.imageMessage.url;
    }
    else if (message?.videoMessage) {
        content = message.videoMessage.caption || '';
        type = 'VIDEO';
        mediaUrl = message.videoMessage.url;
    }
    else if (message?.audioMessage) {
        type = 'AUDIO';
        mediaUrl = message.audioMessage.url;
    }
    else if (message?.documentMessage) {
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
//# sourceMappingURL=whatsapp.js.map