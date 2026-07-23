"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const url_1 = require("url");
const dns_1 = require("dns");
const util_1 = require("util");
const database_1 = __importDefault(require("../config/database"));
const auth_1 = require("../middleware/auth");
const types_1 = require("../types");
const dnsLookup = (0, util_1.promisify)(dns_1.lookup);
// Private IP ranges that should never be reachable via webhooks (anti-SSRF)
const PRIVATE_IP_RANGES = [
    { prefix: '10.', mask: null }, // 10.0.0.0/8
    { prefix: '172.16.', mask: null, min: 16, max: 31 }, // 172.16.0.0/12
    { prefix: '192.168.', mask: null }, // 192.168.0.0/16
    { prefix: '127.', mask: null }, // 127.0.0.0/8 (localhost)
    { prefix: '169.254.', mask: null }, // 169.254.0.0/16 (link-local)
    { prefix: '0.', mask: null }, // 0.0.0.0/8
    { prefix: '100.', mask: null, min: 64, max: 127 }, // 100.64.0.0/10 (CGNAT)
    { prefix: '198.18.', mask: null }, // 198.18.0.0/15 (benchmarking)
];
function isPrivateIP(ip) {
    for (const range of PRIVATE_IP_RANGES) {
        if (ip.startsWith(range.prefix)) {
            // For 172.16.0.0/12, check the second octet range
            if (range.min !== undefined && range.max !== undefined) {
                const octets = ip.split('.');
                if (octets.length >= 2) {
                    const secondOctet = parseInt(octets[1], 10);
                    if (!isNaN(secondOctet) && secondOctet >= range.min && secondOctet <= range.max) {
                        return true;
                    }
                    continue;
                }
            }
            return true;
        }
    }
    return false;
}
/**
 * Validate that a webhook URL doesn't point to internal/private resources.
 * Throws if the URL is invalid, uses an insecure protocol, or resolves to a private IP.
 * This prevents SSRF (Server-Side Request Forgery) attacks.
 */
async function validateWebhookUrl(urlStr) {
    let parsed;
    try {
        parsed = new url_1.URL(urlStr);
    }
    catch {
        throw new Error('URL inválida');
    }
    // Only allow HTTPS in production, allow HTTP for localhost in development
    if (parsed.protocol !== 'https:' && parsed.protocol !== 'http:') {
        throw new Error('Protocolo não suportado. Use HTTP ou HTTPS.');
    }
    if (process.env.NODE_ENV === 'production' && parsed.protocol !== 'https:') {
        throw new Error('HTTPS é obrigatório para webhooks em produção');
    }
    // Check hostname against private/reserved IPs
    const hostname = parsed.hostname.toLowerCase();
    // Block obvious internal hostnames
    const blockedHosts = [
        'localhost', '127.0.0.1', '0.0.0.0', 'metadata.google.internal',
        '169.254.169.254', 'metadata.amazonaws.com', '100.100.100.200',
    ];
    if (blockedHosts.includes(hostname)) {
        throw new Error('URL aponta para um recurso interno — não permitido');
    }
    // Block hostnames ending with internal suffixes commonly used for SSRF
    const blockedSuffixes = [
        '.local', '.internal', '.intranet', '.corp', '.lan',
    ];
    for (const suffix of blockedSuffixes) {
        if (hostname.endsWith(suffix)) {
            throw new Error('URL aponta para rede interna — não permitido');
        }
    }
    // For non-localhost dev, resolve DNS to check if it points to a private IP
    if (!hostname.startsWith('localhost') && !hostname.match(/^\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}$/)) {
        try {
            // DNS with 5s timeout to prevent hanging on slow DNS
            const result = await Promise.race([
                dnsLookup(hostname, 4),
                new Promise((_, reject) => setTimeout(() => reject(new Error('DNS lookup timeout')), 5000)),
            ]);
            if (isPrivateIP(result.address)) {
                throw new Error('URL resolve para IP privado — risco de SSRF');
            }
        }
        catch (err) {
            // DNS lookup failed — if it's a DNS error, the URL is likely invalid
            if (err.code === 'ENOTFOUND' || err.code === 'EAI_AGAIN') {
                throw new Error('Domínio não encontrado');
            }
            // For other DNS errors (e.g., timeout), warn but allow through
            console.warn(`[Webhook] DNS lookup warning for ${hostname}: ${err.message}`);
        }
    }
    else if (hostname.match(/^\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}$/)) {
        // Direct IP — check if private
        if (isPrivateIP(hostname)) {
            throw new Error('URL aponta para IP privado — não permitido');
        }
    }
}
const router = (0, express_1.Router)();
router.use(auth_1.authenticate);
// GET /api/webhooks - List webhooks
router.get('/', async (req, res) => {
    try {
        const user = await database_1.default.user.findUnique({ where: { id: req.user.userId } });
        if (!user?.organizationId) {
            res.json([]);
            return;
        }
        const webhooks = await database_1.default.webhook.findMany({
            where: { organizationId: user.organizationId },
            orderBy: { createdAt: 'desc' },
        });
        res.json(webhooks);
    }
    catch (error) {
        res.status(500).json({ error: 'Erro ao listar webhooks' });
    }
});
// POST /api/webhooks - Create webhook (only ADMIN/OWNER)
router.post('/', (0, auth_1.authorize)('OWNER', 'ADMIN'), async (req, res) => {
    try {
        const user = await database_1.default.user.findUnique({ where: { id: req.user.userId } });
        if (!user?.organizationId) {
            res.status(400).json({ error: 'Sem organização' });
            return;
        }
        const { name, url, events, secret } = req.body;
        // Validate URL against SSRF — no internal/private endpoints
        if (url) {
            try {
                await validateWebhookUrl(url);
            }
            catch (err) {
                res.status(400).json({ error: err.message });
                return;
            }
        }
        const webhook = await database_1.default.webhook.create({
            data: {
                name,
                url,
                events: events || [],
                secret,
                organizationId: user.organizationId,
            },
        });
        res.status(201).json(webhook);
    }
    catch (error) {
        res.status(500).json({ error: 'Erro ao criar webhook' });
    }
});
// PUT /api/webhooks/:id (only ADMIN/OWNER)
router.put('/:id', (0, auth_1.authorize)('OWNER', 'ADMIN'), async (req, res) => {
    try {
        if (!req.user) {
            res.status(401).json({ error: 'Não autenticado' });
            return;
        }
        const existing = await database_1.default.webhook.findUnique({ where: { id: req.params.id } });
        if (!(await (0, types_1.verifyOrgAccess)(existing, req.user.userId, res, 'Webhook')))
            return;
        const { name, url, events, isActive } = req.body;
        // Validate URL against SSRF if being updated
        if (url) {
            try {
                await validateWebhookUrl(url);
            }
            catch (err) {
                res.status(400).json({ error: err.message });
                return;
            }
        }
        const updated = await database_1.default.webhook.update({
            where: { id: req.params.id },
            data: { name, url, events, isActive },
        });
        res.json(updated);
    }
    catch (error) {
        res.status(500).json({ error: 'Erro ao atualizar webhook' });
    }
});
// DELETE /api/webhooks/:id (only ADMIN/OWNER)
router.delete('/:id', (0, auth_1.authorize)('OWNER', 'ADMIN'), async (req, res) => {
    try {
        if (!req.user) {
            res.status(401).json({ error: 'Não autenticado' });
            return;
        }
        const existing = await database_1.default.webhook.findUnique({ where: { id: req.params.id } });
        if (!(await (0, types_1.verifyOrgAccess)(existing, req.user.userId, res, 'Webhook')))
            return;
        await database_1.default.webhook.delete({ where: { id: req.params.id } });
        res.json({ message: 'Webhook removido' });
    }
    catch (error) {
        res.status(500).json({ error: 'Erro ao remover webhook' });
    }
});
// POST /api/webhooks/:id/test - Test webhook (only ADMIN/OWNER)
router.post('/:id/test', (0, auth_1.authorize)('OWNER', 'ADMIN'), async (req, res) => {
    try {
        if (!req.user) {
            res.status(401).json({ error: 'Não autenticado' });
            return;
        }
        const webhook = await database_1.default.webhook.findUnique({ where: { id: req.params.id } });
        if (!webhook) {
            res.status(404).json({ error: 'Webhook não encontrado' });
            return;
        }
        if (!(await (0, types_1.verifyOrgAccess)(webhook, req.user.userId, res, 'Webhook')))
            return;
        // Validate URL against SSRF before making the request
        try {
            await validateWebhookUrl(webhook.url);
        }
        catch (err) {
            res.status(400).json({ success: false, message: err.message });
            return;
        }
        // Send test payload
        try {
            const controller = new AbortController();
            const timeout = setTimeout(() => controller.abort(), 10000); // 10s timeout
            await fetch(webhook.url, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    event: 'test',
                    data: { message: 'ZapFlow webhook test', timestamp: new Date().toISOString() },
                }),
                signal: controller.signal,
            });
            clearTimeout(timeout);
            res.json({ success: true, message: 'Teste enviado com sucesso' });
        }
        catch {
            res.json({ success: false, message: 'Falha ao enviar teste' });
        }
    }
    catch (error) {
        res.status(500).json({ error: 'Erro ao testar webhook' });
    }
});
exports.default = router;
//# sourceMappingURL=webhooks.js.map