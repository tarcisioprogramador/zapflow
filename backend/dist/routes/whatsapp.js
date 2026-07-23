"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.webhookRouter = void 0;
const express_1 = require("express");
const database_1 = __importDefault(require("../config/database"));
const auth_1 = require("../middleware/auth");
const utils_1 = require("../utils");
const whatsapp_1 = require("../services/whatsapp");
const router = (0, express_1.Router)();
// ─── Public: Webhook receiver (no auth) ─────────────────
// Evolution API posts incoming messages here
const webhookRouter = (0, express_1.Router)();
exports.webhookRouter = webhookRouter;
// Dedicated rate limiter for the public webhook endpoint (abuse protection)
const express_rate_limit_1 = __importDefault(require("express-rate-limit"));
const webhookLimiter = (0, express_rate_limit_1.default)({
    windowMs: 60 * 1000, // 1 minute
    max: 60, // 60 req/min — enough for normal WhatsApp traffic, prevents abuse
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: 'Muitas requisições no webhook. Tente novamente em instantes.' },
});
webhookRouter.use(webhookLimiter);
webhookRouter.post('/evolution', async (req, res) => {
    try {
        const payload = req.body;
        console.log('[Webhook] Received:', payload.event, payload.instance);
        if (payload.event === 'messages.upsert') {
            const msg = payload.data;
            if (msg.key?.fromMe) {
                res.sendStatus(200);
                return;
            }
            const from = msg.key.remoteJid.replace('@s.whatsapp.net', '').replace('@lid', '');
            const instanceName = payload.instance;
            const pushName = msg.pushName || from;
            // Find the WhatsApp number by instance name
            const whatsappNumber = await database_1.default.whatsAppNumber.findFirst({
                where: { instanceId: instanceName },
            });
            if (!whatsappNumber) {
                console.log('[Webhook] Instance not found:', instanceName);
                res.sendStatus(200);
                return;
            }
            // Extract message content
            let content = '';
            let type = 'TEXT';
            let mediaUrl;
            const message = msg.message;
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
            // Find or create contact
            let contact = await database_1.default.contact.findFirst({ where: { phone: from } });
            if (!contact) {
                contact = await database_1.default.contact.create({
                    data: { name: pushName, phone: from, tags: '[]' },
                });
            }
            // Find or create conversation
            let conversation = await database_1.default.conversation.findFirst({
                where: { whatsappNumberId: whatsappNumber.id, contactId: contact.id },
            });
            if (!conversation) {
                conversation = await database_1.default.conversation.create({
                    data: {
                        whatsappNumberId: whatsappNumber.id,
                        contactId: contact.id,
                        status: 'open',
                    },
                });
            }
            // Save incoming message
            const savedMessage = await database_1.default.message.create({
                data: {
                    content: (0, utils_1.sanitizeContent)(content),
                    type,
                    from,
                    to: whatsappNumber.number,
                    conversationId: conversation.id,
                    isFromBot: false,
                    mediaUrl,
                },
            });
            // Emit via WebSocket
            const io = req.app?.get('io');
            if (io) {
                io.to(`conversation:${conversation.id}`).emit('new-message', savedMessage);
                io.to(`user:${whatsappNumber.organizationId}`).emit('conversation-updated', {
                    conversationId: conversation.id,
                    lastMessage: content,
                });
            }
            // Check for matching flow triggers, fallback to AI auto-reply
            const flowTriggered = await processFlowTriggers(content, from, conversation.id, whatsappNumber.organizationId);
            if (!flowTriggered && content.trim()) {
                // No flow matched - AI auto-reply (Megan)
                await handleAIReply(content, from, conversation.id, whatsappNumber, io);
            }
            console.log(`[Webhook] Message saved: ${from} -> ${whatsappNumber.number}: ${content}`);
        }
        // Handle connection status updates
        if (payload.event === 'connection.update') {
            const status = payload.data?.state || payload.data?.connection;
            const instanceName = payload.instance;
            const whatsappNumber = await database_1.default.whatsAppNumber.findFirst({
                where: { instanceId: instanceName },
            });
            if (whatsappNumber) {
                let dbStatus = 'DISCONNECTED';
                if (status === 'open' || status === 'connected')
                    dbStatus = 'CONNECTED';
                else if (status === 'connecting')
                    dbStatus = 'CONNECTING';
                await database_1.default.whatsAppNumber.update({
                    where: { id: whatsappNumber.id },
                    data: { status: dbStatus },
                });
            }
        }
        res.sendStatus(200);
    }
    catch (error) {
        console.error('[Webhook] Error:', error);
        res.sendStatus(200); // Always return 200 to Evolution API
    }
});
// Process flow triggers for incoming messages
// Returns true if a flow was triggered, false otherwise
async function processFlowTriggers(messageContent, from, conversationId, organizationId) {
    try {
        // Find active flows with matching keyword triggers for this organization
        const flows = await database_1.default.flow.findMany({
            where: {
                isActive: true,
                triggerType: 'keyword',
                user: { organizationId },
            },
        });
        for (const flow of flows) {
            const triggerValue = flow.triggerValue?.toLowerCase();
            if (triggerValue && messageContent.toLowerCase().includes(triggerValue)) {
                console.log(`[Flow] Triggered flow "${flow.name}" by keyword "${triggerValue}"`);
                // Create flow execution
                const execution = await database_1.default.flowExecution.create({
                    data: {
                        flowId: flow.id,
                        status: 'running',
                        context: JSON.stringify({
                            conversationId,
                            from,
                            message: messageContent,
                            organizationId,
                        }),
                    },
                });
                // Process the flow nodes
                const nodes = typeof flow.nodes === 'string' ? JSON.parse(flow.nodes) : flow.nodes;
                const edges = typeof flow.edges === 'string' ? JSON.parse(flow.edges) : flow.edges;
                // Find the start node and follow the flow
                const startNode = nodes.find((n) => n.type === 'startNode');
                if (startNode) {
                    await executeFlowNode(startNode.id, nodes, edges, conversationId, from);
                }
                await database_1.default.flowExecution.update({
                    where: { id: execution.id },
                    data: { status: 'completed', endedAt: new Date() },
                });
                return true; // Flow was triggered
            }
        }
    }
    catch (error) {
        console.error('[Flow] Error processing triggers:', error);
    }
    return false; // No flow matched
}
// ─── AI Auto-Reply (Megan) ─────────────────────────────
// Called when no flow matches - AI responds using knowledge base
async function handleAIReply(messageContent, from, conversationId, whatsappNumber, io) {
    try {
        const organizationId = whatsappNumber.organizationId;
        if (!organizationId)
            return;
        // Check if any AI provider is configured
        const hasAIProvider = process.env.GROQ_API_KEY || process.env.GEMINI_API_KEY || process.env.OPENAI_API_KEY;
        if (!hasAIProvider) {
            console.log('[AI] No AI provider configured (GROQ_API_KEY, GEMINI_API_KEY, or OPENAI_API_KEY), skipping auto-reply');
            return;
        }
        // Import AI service
        const { generateAIResponse } = await Promise.resolve().then(() => __importStar(require('../services/ai')));
        // Load knowledge base items for this organization
        const kbItems = await database_1.default.knowledgeBaseItem.findMany({
            where: { organizationId },
            orderBy: { category: 'asc' },
        });
        // Build knowledge base context string
        let knowledgeBase = '';
        if (kbItems.length > 0) {
            const byCategory = {};
            kbItems.forEach((item) => {
                if (!byCategory[item.category])
                    byCategory[item.category] = [];
                byCategory[item.category].push(`${item.title}: ${item.content}`);
            });
            knowledgeBase = Object.entries(byCategory)
                .map(([cat, items]) => `## ${cat}\n${items.join('\n')}`)
                .join('\n\n');
        }
        // Get recent conversation history for context
        const recentMessages = await database_1.default.message.findMany({
            where: { conversationId },
            orderBy: { createdAt: 'desc' },
            take: 10,
        });
        const conversationHistory = recentMessages
            .reverse()
            .map((m) => ({
            role: m.isFromBot ? 'assistant' : 'user',
            content: m.content,
        }));
        // Generate AI response
        console.log(`[AI] Generating reply for ${from} (KB items: ${kbItems.length})`);
        const aiResponse = await generateAIResponse(messageContent, {
            systemPrompt: `Você é a Megan, assistente virtual inteligente da empresa.
Responda de forma humanizada, profissional e amigável como se estivesse no WhatsApp.
Seja conciso mas completo. Use emojis com moderação.
Se não souber a resposta, seja honesto e ofereça encaminhamento para um atendente humano.
Nunca invente informações. Use apenas a base de conhecimento fornecida.`,
            knowledgeBase: knowledgeBase || undefined,
            conversationHistory,
        });
        // Send the AI response via WhatsApp
        if (whatsappNumber.instanceId) {
            try {
                await (0, whatsapp_1.sendText)({
                    instanceName: whatsappNumber.instanceId,
                    number: from,
                    text: aiResponse,
                });
                console.log(`[AI] Reply sent to ${from}: ${aiResponse.substring(0, 100)}...`);
            }
            catch (err) {
                console.error('[AI] Failed to send reply via Evolution API:', err.message);
            }
        }
        // Save the AI response to database
        const savedReply = await database_1.default.message.create({
            data: {
                content: (0, utils_1.sanitizeContent)(aiResponse),
                type: 'TEXT',
                from: whatsappNumber.number,
                to: from,
                conversationId,
                isFromBot: true,
            },
        });
        // Emit via WebSocket so dashboard updates in real-time
        if (io) {
            io.to(`conversation:${conversationId}`).emit('new-message', savedReply);
            io.to(`user:${organizationId}`).emit('conversation-updated', {
                conversationId,
                lastMessage: aiResponse,
            });
        }
        console.log(`[AI] Auto-reply completed for conversation ${conversationId}`);
    }
    catch (error) {
        console.error('[AI] Error in handleAIReply:', error);
        // Send fallback message if AI fails
        try {
            const fallbackMsg = 'Desculpe, estou com dificuldades técnicas no momento. Um atendente humano entrará em contato em breve. 🙏';
            if (whatsappNumber.instanceId) {
                await (0, whatsapp_1.sendText)({
                    instanceName: whatsappNumber.instanceId,
                    number: from,
                    text: fallbackMsg,
                });
            }
            await database_1.default.message.create({
                data: {
                    content: (0, utils_1.sanitizeContent)(fallbackMsg),
                    type: 'TEXT',
                    from: whatsappNumber.number,
                    to: from,
                    conversationId,
                    isFromBot: true,
                },
            });
        }
        catch (fallbackError) {
            console.error('[AI] Fallback message also failed:', fallbackError);
        }
    }
}
// Execute a single flow node
async function executeFlowNode(nodeId, nodes, edges, conversationId, to) {
    const node = nodes.find((n) => n.id === nodeId);
    if (!node)
        return;
    switch (node.type) {
        case 'message': {
            const messageText = node.data?.message || 'Mensagem automática';
            console.log(`[Flow] Sending message to ${to}: ${messageText}`);
            // Find the conversation to get the whatsapp number
            const conversation = await database_1.default.conversation.findUnique({
                where: { id: conversationId },
                include: { whatsappNumber: true },
            });
            if (conversation?.whatsappNumber?.instanceId) {
                try {
                    await (0, whatsapp_1.sendText)({
                        instanceName: conversation.whatsappNumber.instanceId,
                        number: to,
                        text: messageText,
                    });
                }
                catch (err) {
                    console.log('[Flow] Send failed (API may not be configured):', err.message);
                }
            }
            // Save to database
            await database_1.default.message.create({
                data: {
                    content: (0, utils_1.sanitizeContent)(messageText),
                    type: 'TEXT',
                    from: conversation?.whatsappNumber?.number || '',
                    to,
                    conversationId,
                    isFromBot: true,
                },
            });
            break;
        }
        case 'delay': {
            const delayMs = (node.data?.delay || 5) * 1000;
            console.log(`[Flow] Waiting ${delayMs}ms...`);
            await new Promise((resolve) => setTimeout(resolve, Math.min(delayMs, 30000))); // Max 30s for demo
            break;
        }
        case 'condition': {
            console.log(`[Flow] Evaluating condition: ${node.data?.condition}`);
            // For now, just continue to next node
            break;
        }
        case 'ai': {
            console.log(`[Flow] AI node triggered`);
            // AI processing would go here
            break;
        }
    }
    // Follow edges to next node
    const outEdges = edges.filter((e) => e.source === nodeId);
    if (outEdges.length > 0) {
        const nextNodeId = outEdges[0].target;
        await executeFlowNode(nextNodeId, nodes, edges, conversationId, to);
    }
}
// ─── Protected Routes ───────────────────────────────────
router.use(auth_1.authenticate);
// GET /api/whatsapp - List connected numbers
router.get('/', async (req, res) => {
    try {
        const user = await database_1.default.user.findUnique({ where: { id: req.user.userId } });
        if (!user?.organizationId) {
            res.json([]);
            return;
        }
        const numbers = await database_1.default.whatsAppNumber.findMany({
            where: { organizationId: user.organizationId },
            orderBy: { createdAt: 'desc' },
        });
        // User-level trial is handled by plan middleware
        // Check real status from Evolution API when available
        const numbersWithStatus = await Promise.all(numbers.map(async (num) => {
            if (num.instanceId) {
                try {
                    const status = await (0, whatsapp_1.getConnectionState)(num.instanceId);
                    const realStatus = status.instance?.connectionStatus || 'disconnected';
                    let dbStatus = 'DISCONNECTED';
                    if (realStatus === 'open' || realStatus === 'connected')
                        dbStatus = 'CONNECTED';
                    else if (realStatus === 'connecting')
                        dbStatus = 'CONNECTING';
                    if (dbStatus !== num.status) {
                        await database_1.default.whatsAppNumber.update({
                            where: { id: num.id },
                            data: { status: dbStatus },
                        });
                        return { ...num, status: dbStatus };
                    }
                }
                catch {
                    // Evolution API not configured, return as-is
                }
            }
            return num;
        }));
        res.json(numbersWithStatus);
    }
    catch (error) {
        res.status(500).json({ error: 'Erro ao listar números' });
    }
});
// POST /api/whatsapp/connect - Connect a new number via Evolution API
router.post('/connect', async (req, res) => {
    try {
        const user = await database_1.default.user.findUnique({ where: { id: req.user.userId } });
        if (!user?.organizationId) {
            res.status(400).json({ error: 'Usuário não pertence a uma organização' });
            return;
        }
        const { number, name } = req.body;
        if (!number || !name) {
            res.status(400).json({ error: 'Número e nome são obrigatórios' });
            return;
        }
        // Check if Evolution API is configured
        if (!whatsapp_1.BASE_URL || !whatsapp_1.API_KEY) {
            // Demo mode: create without Evolution API
            const whatsappNumber = await database_1.default.whatsAppNumber.create({
                data: { number, name, status: 'CONNECTING', organizationId: user.organizationId },
            });
            // Simulate connection after 3s
            setTimeout(async () => {
                await database_1.default.whatsAppNumber.update({
                    where: { id: whatsappNumber.id },
                    data: { status: 'CONNECTED', qrcode: null },
                });
            }, 3000);
            res.status(201).json(whatsappNumber);
            return;
        }
        // Create instance in Evolution API
        const instanceName = `zapflow-${user.organizationId}-${Date.now()}`;
        const webhookUrl = `${process.env.BACKEND_URL || 'http://localhost:3001'}/api/webhook/evolution`;
        const instance = await (0, whatsapp_1.createInstance)({
            instanceName,
            number: number.replace(/[^0-9]/g, ''),
            qrcode: true,
            webhook: {
                enabled: true,
                url: webhookUrl,
                events: ['MESSAGES_UPSERT', 'CONNECTION_UPDATE'],
            },
        });
        // Save to database
        const whatsappNumber = await database_1.default.whatsAppNumber.create({
            data: {
                number,
                name,
                status: 'CONNECTING',
                instanceId: instanceName,
                organizationId: user.organizationId,
            },
        });
        // Get QR code
        try {
            const qr = await (0, whatsapp_1.getQRCode)(instanceName);
            await database_1.default.whatsAppNumber.update({
                where: { id: whatsappNumber.id },
                data: { qrcode: qr.base64 },
            });
            res.status(201).json({ ...whatsappNumber, qrcode: qr.base64 });
        }
        catch {
            res.status(201).json(whatsappNumber);
        }
    }
    catch (error) {
        console.error('[WhatsApp] Connect error:', error);
        res.status(500).json({ error: 'Erro ao conectar número' });
    }
});
// POST /api/whatsapp/:id/send - Send a message via Evolution API
router.post('/:id/send', async (req, res) => {
    try {
        const { to, message, type, mediaUrl } = req.body;
        if (!to || !message) {
            res.status(400).json({ error: 'Destinatário e mensagem são obrigatórios' });
            return;
        }
        const number = await database_1.default.whatsAppNumber.findUnique({ where: { id: req.params.id } });
        if (!number || number.status !== 'CONNECTED') {
            res.status(400).json({ error: 'Número não conectado' });
            return;
        }
        // Send via Evolution API if configured
        if (number.instanceId && whatsapp_1.BASE_URL && whatsapp_1.API_KEY) {
            try {
                const cleanNumber = to.replace(/[^0-9]/g, '');
                if (type === 'IMAGE' && mediaUrl) {
                    await (0, whatsapp_1.sendMedia)({
                        instanceName: number.instanceId,
                        number: cleanNumber,
                        mediatype: 'image',
                        media: mediaUrl,
                        caption: message,
                    });
                }
                else if (type === 'VIDEO' && mediaUrl) {
                    await (0, whatsapp_1.sendMedia)({
                        instanceName: number.instanceId,
                        number: cleanNumber,
                        mediatype: 'video',
                        media: mediaUrl,
                        caption: message,
                    });
                }
                else if (type === 'AUDIO' && mediaUrl) {
                    await (0, whatsapp_1.sendMedia)({
                        instanceName: number.instanceId,
                        number: cleanNumber,
                        mediatype: 'audio',
                        media: mediaUrl,
                    });
                }
                else if (type === 'DOCUMENT' && mediaUrl) {
                    await (0, whatsapp_1.sendMedia)({
                        instanceName: number.instanceId,
                        number: cleanNumber,
                        mediatype: 'document',
                        media: mediaUrl,
                        fileName: 'document',
                    });
                }
                else {
                    await (0, whatsapp_1.sendText)({
                        instanceName: number.instanceId,
                        number: cleanNumber,
                        text: message,
                    });
                }
            }
            catch (err) {
                console.error('[WhatsApp] Send via Evolution API failed:', err.message);
                // Still save the message even if API fails
            }
        }
        // Find or create conversation
        const contact = await database_1.default.contact.findFirst({ where: { phone: to } });
        let conversation = await database_1.default.conversation.findFirst({
            where: { whatsappNumberId: number.id, contactId: contact?.id },
        });
        if (!conversation) {
            conversation = await database_1.default.conversation.create({
                data: {
                    whatsappNumberId: number.id,
                    contactId: contact?.id,
                    userId: req.user.userId,
                },
            });
        }
        // Save message to database
        const msg = await database_1.default.message.create({
            data: {
                content: (0, utils_1.sanitizeContent)(message),
                type: type || 'TEXT',
                from: number.number,
                to,
                conversationId: conversation.id,
                isFromBot: true,
                mediaUrl,
            },
        });
        // Emit via WebSocket
        const io = req.app?.get('io');
        if (io) {
            io.to(`conversation:${conversation.id}`).emit('new-message', msg);
        }
        res.json(msg);
    }
    catch (error) {
        console.error('[WhatsApp] Send error:', error);
        res.status(500).json({ error: 'Erro ao enviar mensagem' });
    }
});
// GET /api/whatsapp/:id/qrcode - Get QR code
router.get('/:id/qrcode', async (req, res) => {
    try {
        const number = await database_1.default.whatsAppNumber.findUnique({ where: { id: req.params.id } });
        if (!number) {
            res.status(404).json({ error: 'Número não encontrado' });
            return;
        }
        // Try to get fresh QR from Evolution API
        if (number.instanceId && whatsapp_1.BASE_URL && whatsapp_1.API_KEY) {
            try {
                const qr = await (0, whatsapp_1.getQRCode)(number.instanceId);
                await database_1.default.whatsAppNumber.update({
                    where: { id: number.id },
                    data: { qrcode: qr.base64 },
                });
                res.json({ qrcode: qr.base64, status: number.status });
                return;
            }
            catch {
                // Fall through to cached QR
            }
        }
        res.json({ qrcode: number.qrcode, status: number.status });
    }
    catch (error) {
        res.status(500).json({ error: 'Erro ao buscar QR Code' });
    }
});
// POST /api/whatsapp/:id/disconnect - Disconnect number
router.post('/:id/disconnect', async (req, res) => {
    try {
        const number = await database_1.default.whatsAppNumber.findUnique({ where: { id: req.params.id } });
        if (!number) {
            res.status(404).json({ error: 'Número não encontrado' });
            return;
        }
        // Logout from Evolution API
        if (number.instanceId && whatsapp_1.BASE_URL && whatsapp_1.API_KEY) {
            try {
                await (0, whatsapp_1.logoutInstance)(number.instanceId);
            }
            catch {
                // Continue even if API call fails
            }
        }
        await database_1.default.whatsAppNumber.update({
            where: { id: number.id },
            data: { status: 'DISCONNECTED', qrcode: null },
        });
        res.json({ message: 'Número desconectado' });
    }
    catch (error) {
        res.status(500).json({ error: 'Erro ao desconectar número' });
    }
});
// DELETE /api/whatsapp/:id - Delete number
router.delete('/:id', async (req, res) => {
    try {
        const number = await database_1.default.whatsAppNumber.findUnique({ where: { id: req.params.id } });
        if (!number) {
            res.status(404).json({ error: 'Número não encontrado' });
            return;
        }
        // Delete from Evolution API
        if (number.instanceId && whatsapp_1.BASE_URL && whatsapp_1.API_KEY) {
            try {
                await (0, whatsapp_1.deleteInstance)(number.instanceId);
            }
            catch {
                // Continue even if API call fails
            }
        }
        await database_1.default.whatsAppNumber.delete({ where: { id: number.id } });
        res.json({ message: 'Número removido' });
    }
    catch (error) {
        res.status(500).json({ error: 'Erro ao remover número' });
    }
});
// GET /api/whatsapp/:id/status - Check real-time connection status
router.get('/:id/status', async (req, res) => {
    try {
        const number = await database_1.default.whatsAppNumber.findUnique({ where: { id: req.params.id } });
        if (!number) {
            res.status(404).json({ error: 'Número não encontrado' });
            return;
        }
        if (number.instanceId && whatsapp_1.BASE_URL && whatsapp_1.API_KEY) {
            try {
                const status = await (0, whatsapp_1.getConnectionState)(number.instanceId);
                const realStatus = status.instance?.connectionStatus || 'disconnected';
                let dbStatus = 'DISCONNECTED';
                if (realStatus === 'open' || realStatus === 'connected')
                    dbStatus = 'CONNECTED';
                else if (realStatus === 'connecting')
                    dbStatus = 'CONNECTING';
                await database_1.default.whatsAppNumber.update({
                    where: { id: number.id },
                    data: { status: dbStatus },
                });
                res.json({ status: dbStatus, instance: status.instance });
                return;
            }
            catch {
                // Fall through
            }
        }
        res.json({ status: number.status });
    }
    catch (error) {
        res.status(500).json({ error: 'Erro ao verificar status' });
    }
});
exports.default = router;
//# sourceMappingURL=whatsapp.js.map