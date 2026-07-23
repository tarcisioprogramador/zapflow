"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const database_1 = __importDefault(require("../config/database"));
const auth_1 = require("../middleware/auth");
const router = (0, express_1.Router)();
// POST /api/tracking/lead - Public endpoint to capture leads with UTM parameters
// No auth required - called from landing pages and ad campaigns
router.post('/lead', async (req, res) => {
    try {
        const { name, phone, email, utmSource, utmMedium, utmCampaign, utmContent, utmTerm, adId, adTitle } = req.body;
        if (!phone && !email) {
            res.status(400).json({ error: 'Telefone ou email são obrigatórios' });
            return;
        }
        // Basic input validation
        const cleanPhone = phone?.replace(/[^0-9+]/g, '');
        const cleanEmail = email?.trim().toLowerCase();
        if (cleanEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)) {
            res.status(400).json({ error: 'Email inválido' });
            return;
        }
        // Find or create contact using cleaned data
        let contact;
        if (cleanPhone) {
            contact = await database_1.default.contact.findFirst({ where: { phone: cleanPhone } });
        }
        if (!contact && cleanEmail) {
            contact = await database_1.default.contact.findFirst({ where: { email: cleanEmail } });
        }
        if (contact) {
            // Update existing contact with UTM data
            contact = await database_1.default.contact.update({
                where: { id: contact.id },
                data: {
                    name: name || contact.name,
                    email: cleanEmail || contact.email,
                    utmSource: utmSource || contact.utmSource,
                    utmMedium: utmMedium || contact.utmMedium,
                    utmCampaign: utmCampaign || contact.utmCampaign,
                    adId: adId || contact.adId,
                    adTitle: adTitle || contact.adTitle,
                },
            });
        }
        else {
            // Create new contact with UTM data
            contact = await database_1.default.contact.create({
                data: {
                    name: name || 'Lead Web',
                    phone: cleanPhone || '',
                    email: cleanEmail || null,
                    tags: '[]',
                    utmSource: utmSource || null,
                    utmMedium: utmMedium || null,
                    utmCampaign: utmCampaign || null,
                    adId: adId || null,
                    adTitle: adTitle || null,
                },
            });
        }
        console.log(`[Tracking] Lead captured: ${contact.id} (source: ${utmSource || 'organic'}, campaign: ${utmCampaign || 'none'})`);
        // Emit via WebSocket for real-time dashboard updates
        const io = req.app?.get('io');
        if (io) {
            io.emit('new-lead', {
                contactId: contact.id,
                name: contact.name,
                phone: contact.phone,
                utmSource: utmSource || 'organic',
                utmCampaign: utmCampaign || 'none',
            });
        }
        res.status(201).json({
            success: true,
            contactId: contact.id,
            message: 'Lead capturado com sucesso!',
        });
    }
    catch (error) {
        console.error('[Tracking] Error capturing lead:', error);
        res.status(500).json({ error: 'Erro ao capturar lead' });
    }
});
// GET /api/tracking/stats - Get tracking stats (requires auth)
router.get('/stats', auth_1.authenticate, async (req, res) => {
    try {
        // This endpoint could be protected with auth middleware if needed
        const totalLeads = await database_1.default.contact.count();
        const leadsWithUTM = await database_1.default.contact.count({
            where: {
                OR: [
                    { utmSource: { not: null } },
                    { utmMedium: { not: null } },
                    { utmCampaign: { not: null } },
                ],
            },
        });
        // Group by UTM source
        const leadsBySource = await database_1.default.contact.groupBy({
            by: ['utmSource'],
            where: {
                utmSource: { not: null },
            },
            _count: true,
        });
        res.json({
            totalLeads,
            leadsWithUTM,
            leadsBySource: leadsBySource.map(s => ({
                source: s.utmSource || 'unknown',
                count: s._count,
            })),
        });
    }
    catch (error) {
        console.error('[Tracking] Error fetching stats:', error);
        res.status(500).json({ error: 'Erro ao buscar estatísticas' });
    }
});
exports.default = router;
//# sourceMappingURL=tracking.js.map