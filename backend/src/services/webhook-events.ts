import prisma from '../config/database';

export async function createEventLog(params: {
  source: string;
  eventId?: string;
  eventType: string;
  dataId?: string;
  status: 'received' | 'processing' | 'processed' | 'failed';
  requestBody?: any;
  responseBody?: any;
  errorMessage?: string;
}) {
  try {
    return await prisma.webhookEvent.create({
      data: {
        source: params.source,
        eventId: params.eventId,
        eventType: params.eventType,
        dataId: params.dataId,
        status: params.status,
        requestBody: params.requestBody ? JSON.stringify(params.requestBody) : null,
        responseBody: params.responseBody ? JSON.stringify(params.responseBody) : null,
        errorMessage: params.errorMessage,
        processedAt: params.status === 'processed' || params.status === 'failed' ? new Date() : null,
      },
    });
  } catch (err) {
    console.error('[WebhookEvents] Failed to create log:', err);
  }
}

export async function updateEventLog(id: string, data: Partial<{
  status: string;
  responseBody: any;
  errorMessage: string;
}>) {
  try {
    const updateData: any = { ...data };
    if (data.responseBody) {
      updateData.responseBody = JSON.stringify(data.responseBody);
    }
    if (data.status === 'processed' || data.status === 'failed') {
      updateData.processedAt = new Date();
    }
    return await prisma.webhookEvent.update({ where: { id }, data: updateData });
  } catch (err) {
    console.error('[WebhookEvents] Failed to update log:', err);
  }
}

export async function findEventByIdempotencyKey(source: string, eventId: string) {
  try {
    return await prisma.webhookEvent.findUnique({
      where: { eventId: `${source}_${eventId}` },
    });
  } catch {
    return null;
  }
}

export async function findRecentEventByDataId(source: string, dataId: string, withinMs: number = 60000) {
  const since = new Date(Date.now() - withinMs);
  try {
    return await prisma.webhookEvent.findFirst({
      where: {
        source,
        dataId,
        createdAt: { gte: since },
        status: { in: ['processing', 'processed'] },
      },
      orderBy: { createdAt: 'desc' },
    });
  } catch {
    return null;
  }
}
