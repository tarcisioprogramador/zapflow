import { describe, it, expect, beforeEach } from 'vitest';
import { prismaMock, mockResponse, mockAuthRequest, createTestUser, mockPrismaClear } from './helpers';
import trackingRouter from '../routes/tracking';

function simulateRequest(method: string, path: string, req: any, res: any) {
  const route = trackingRouter.stack.find((layer: any) => {
    if (!layer.route) return false;
    return layer.route.path === path && layer.route.methods[method];
  });

  if (!route) {
    throw new Error(`Route ${method.toUpperCase()} ${path} not found`);
  }

  const handler = route.route!.stack[route.route!.stack.length - 1].handle;
  return handler(req, res, () => {});
}

describe('Tracking Routes', () => {
  beforeEach(() => {
    mockPrismaClear();
  });

  describe('POST /lead', () => {
    it('should capture a new lead with UTM parameters', async () => {
      const req = mockAuthRequest({
        body: {
          name: 'Web Visitor',
          phone: '+5511999999991',
          email: 'visitor@email.com',
          utmSource: 'google_ads',
          utmMedium: 'cpc',
          utmCampaign: 'summer_sale',
          adId: 'ad-123',
          adTitle: 'Summer Promo',
        },
      });
      const res = mockResponse();

      prismaMock.contact.findFirst.mockResolvedValue(null);
      prismaMock.contact.create.mockResolvedValue({
        id: 'lead-1',
        name: 'Web Visitor',
        phone: '+5511999999991',
        email: 'visitor@email.com',
        company: null,
        tags: '[]',
        notes: null,
        utmSource: 'google_ads',
        utmMedium: 'cpc',
        utmCampaign: 'summer_sale',
        adId: 'ad-123',
        adTitle: 'Summer Promo',
        userId: 'test-user-id',
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      await simulateRequest('post', '/lead', req, res);

      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          contactId: 'lead-1',
          message: expect.any(String),
        })
      );
    });

    it('should update existing contact when phone matches', async () => {
      const req = mockAuthRequest({
        body: {
          name: 'Returning Visitor',
          phone: '+5511999999991',
          utmSource: 'facebook',
        },
      });
      const res = mockResponse();

      prismaMock.contact.findFirst.mockResolvedValue({
        id: 'existing-contact',
        name: 'Old Name',
        phone: '+5511999999991',
        email: 'old@email.com',
        company: null,
        tags: '[]',
        notes: null,
        utmSource: null,
        utmMedium: null,
        utmCampaign: null,
        adId: null,
        adTitle: null,
        userId: 'test-user-id',
        createdAt: new Date(),
        updatedAt: new Date(),
      });
      prismaMock.contact.update.mockResolvedValue({
        id: 'existing-contact',
        name: 'Returning Visitor',
        phone: '+5511999999991',
        email: 'old@email.com',
        company: null,
        tags: '[]',
        notes: null,
        utmSource: 'facebook',
        utmMedium: null,
        utmCampaign: null,
        adId: null,
        adTitle: null,
        userId: 'test-user-id',
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      await simulateRequest('post', '/lead', req, res);

      expect(res.status).toHaveBeenCalledWith(201);
      expect(prismaMock.contact.update).toHaveBeenCalled();
      expect(prismaMock.contact.create).not.toHaveBeenCalled();
    });

    it('should reject lead without phone or email', async () => {
      const req = mockAuthRequest({ body: { name: 'No Contact' } });
      const res = mockResponse();

      await simulateRequest('post', '/lead', req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ error: 'Telefone ou email são obrigatórios' })
      );
    });

    it('should reject invalid email format', async () => {
      const req = mockAuthRequest({
        body: { email: 'invalid-email', name: 'Bad Email' },
      });
      const res = mockResponse();

      await simulateRequest('post', '/lead', req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ error: 'Email inválido' })
      );
    });

    it('should clean phone number formatting', async () => {
      const req = mockAuthRequest({
        body: { phone: '+55 (11) 99999-9991', name: 'Formatted Phone' },
      });
      const res = mockResponse();

      prismaMock.contact.findFirst.mockResolvedValue(null);
      prismaMock.contact.create.mockResolvedValue({
        id: 'lead-1',
        name: 'Formatted Phone',
        phone: '+5511999999991',
        email: null,
        company: null,
        tags: '[]',
        notes: null,
        utmSource: null,
        utmMedium: null,
        utmCampaign: null,
        adId: null,
        adTitle: null,
        userId: 'test-user-id',
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      await simulateRequest('post', '/lead', req, res);

      expect(prismaMock.contact.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ phone: '+5511999999991' }),
        })
      );
    });
  });

  describe('GET /stats', () => {
    it('should return tracking statistics', async () => {
      const req = mockAuthRequest();
      const res = mockResponse();

      prismaMock.contact.count.mockResolvedValue(100);
      prismaMock.contact.groupBy.mockResolvedValue([
        { utmSource: 'google_ads', _count: 30 },
        { utmSource: 'facebook', _count: 20 },
        { utmSource: 'organic', _count: 50 },
      ]);

      await simulateRequest('get', '/stats', req, res);

      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          totalLeads: 100,
          leadsWithUTM: expect.any(Number),
          leadsBySource: expect.arrayContaining([
            expect.objectContaining({ source: 'google_ads', count: 30 }),
            expect.objectContaining({ source: 'facebook', count: 20 }),
          ]),
        })
      );
    });
  });

  describe('Error handling', () => {
    it('should handle database errors gracefully on lead capture', async () => {
      const req = mockAuthRequest({ body: { phone: '+5511999999991' } });
      const res = mockResponse();

      prismaMock.contact.findFirst.mockRejectedValue(new Error('DB Error'));

      await simulateRequest('post', '/lead', req, res);

      expect(res.status).toHaveBeenCalledWith(500);
    });

    it('should handle errors on stats endpoint', async () => {
      const req = mockAuthRequest();
      const res = mockResponse();

      prismaMock.contact.count.mockRejectedValue(new Error('DB Error'));

      await simulateRequest('get', '/stats', req, res);

      expect(res.status).toHaveBeenCalledWith(500);
    });
  });
});
