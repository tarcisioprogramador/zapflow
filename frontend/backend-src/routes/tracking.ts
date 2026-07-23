import { Router, Response } from 'express';
import prisma from '../config/database';
import { authenticate } from '../middleware/auth';
import { AuthRequest } from '../types';

const router = Router();

// POST /api/tracking/lead - Public endpoint to capture leads with UTM parameters
// No auth required - called from landing pages and ad campaigns
router.post('/lead', async (req: any, res: Response): Promise<void> => {
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
      contact = await prisma.contact.findFirst({ where: { phone: cleanPhone } });
    }
    if (!contact && cleanEmail) {
      contact = await prisma.contact.findFirst({ where: { email: cleanEmail } });
    }

    if (contact) {
      // Update existing contact with UTM data
      contact = await prisma.contact.update({
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
    } else {
      // Create new contact with UTM data
      contact = await prisma.contact.create({
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
  } catch (error) {
    console.error('[Tracking] Error capturing lead:', error);
    res.status(500).json({ error: 'Erro ao capturar lead' });
  }
});

// GET /api/tracking/stats - Get tracking stats (requires auth)
router.get('/stats', authenticate, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    // This endpoint could be protected with auth middleware if needed
    const totalLeads = await prisma.contact.count();
    const leadsWithUTM = await prisma.contact.count({
      where: {
        OR: [
          { utmSource: { not: null } },
          { utmMedium: { not: null } },
          { utmCampaign: { not: null } },
        ],
      },
    });

    // Group by UTM source
    const leadsBySource = await prisma.contact.groupBy({
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
  } catch (error) {
    console.error('[Tracking] Error fetching stats:', error);
    res.status(500).json({ error: 'Erro ao buscar estatísticas' });
  }
});

export default router;
