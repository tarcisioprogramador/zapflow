import { Worker, Job } from 'bullmq';
import Redis from 'ioredis';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';

let _whatsappWorker: Worker | null = null;
let _campaignWorker: Worker | null = null;
let _remarketingWorker: Worker | null = null;

function tryCreateWorker<T = any>(
  name: string,
  processor: (job: Job<T>) => Promise<any>,
): Worker | null {
  try {
    const connection = new Redis(redisUrl, {
      maxRetriesPerRequest: null,
      lazyConnect: true,
      retryStrategy: () => null, // Don't retry — fail fast
    });

    // Test connection
    connection.connect().catch(() => {
      console.warn(`[Queue] Worker "${name}" not started — Redis unavailable`);
      connection.disconnect();
      return;
    });

    const worker = new Worker(name, processor, { connection: connection as any });

    worker.on('failed', (job, err) => {
      console.error(`[${name}] Job ${job?.id} failed:`, err.message);
    });

    worker.on('error', (err) => {
      if ((err as any)?.code === 'ECONNREFUSED') {
        // Silently ignore connection refused errors — Redis is optional
        return;
      }
      console.error(`[${name}] Worker error:`, err.message);
    });

    console.log(`[Queue] Worker "${name}" started`);
    return worker;
  } catch (err) {
    console.warn(`[Queue] Worker "${name}" unavailable — running without it`);
    return null;
  }
}

// Lazy initialization — workers only created on first access
export function getWhatsappWorker(): Worker | null {
  if (_whatsappWorker === null) {
    _whatsappWorker = tryCreateWorker('whatsapp-messages', async (job: Job) => {
      const { to, message } = job.data;

      console.log(`[WhatsApp] Sending message to ${to}: ${message}`);

      await new Promise((resolve) => setTimeout(resolve, 1000));

      await prisma.message.update({
        where: { id: job.data.messageId },
        data: { status: 'SENT' },
      });

      return { success: true };
    });
  }
  return _whatsappWorker;
}

export function getCampaignWorker(): Worker | null {
  if (_campaignWorker === null) {
    _campaignWorker = tryCreateWorker('campaign-messages', async (job: Job) => {
      const { campaignId, contactId, phone, message } = job.data;

      console.log(`[Campaign] Sending to ${phone}: ${message}`);

      await new Promise((resolve) => setTimeout(resolve, 2000));

      await prisma.campaignContact.update({
        where: { id: contactId },
        data: { status: 'sent', sentAt: new Date() },
      });

      await prisma.campaign.update({
        where: { id: campaignId },
        data: { totalSent: { increment: 1 } },
      });

      return { success: true };
    });
  }
  return _campaignWorker;
}

export function getRemarketingWorker(): Worker | null {
  if (_remarketingWorker === null) {
    _remarketingWorker = tryCreateWorker('remarketing', async (job: Job) => {
      const { executionId, contactId } = job.data;
      console.log(`[Remarketing] Sending follow-up to contact ${contactId}`);

      await new Promise((resolve) => setTimeout(resolve, 1000));

      await prisma.remarketingExecution.update({
        where: { id: executionId },
        data: { status: 'sent' },
      });

      return { success: true };
    });
  }
  return _remarketingWorker;
}
