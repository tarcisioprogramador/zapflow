import { Worker, Job } from 'bullmq';
import Redis from 'ioredis';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';

const connection = new Redis(redisUrl, { maxRetriesPerRequest: null });

// WhatsApp message worker
const whatsappWorker = new Worker(
  'whatsapp-messages',
  async (job: Job) => {
    const { conversationId, to, message, type, mediaUrl } = job.data;

    // In production, this would call Evolution API or similar
    // For now, simulate sending
    console.log(`[WhatsApp] Sending message to ${to}: ${message}`);

    // Simulate delay
    await new Promise((resolve) => setTimeout(resolve, 1000));

    // Update message status
    await prisma.message.update({
      where: { id: job.data.messageId },
      data: { status: 'SENT' },
    });

    return { success: true };
  },
  { connection }
);

// Campaign message worker
const campaignWorker = new Worker(
  'campaign-messages',
  async (job: Job) => {
    const { campaignId, contactId, phone, message, mediaUrl } = job.data;

    console.log(`[Campaign] Sending to ${phone}: ${message}`);

    // Simulate delay between messages (rate limiting)
    await new Promise((resolve) => setTimeout(resolve, 2000));

    // Update contact status
    await prisma.campaignContact.update({
      where: { id: contactId },
      data: { status: 'sent', sentAt: new Date() },
    });

    // Update campaign counters
    await prisma.campaign.update({
      where: { id: campaignId },
      data: { totalSent: { increment: 1 } },
    });

    return { success: true };
  },
  { connection }
);

// Remarketing worker
const remarketingWorker = new Worker(
  'remarketing',
  async (job: Job) => {
    const { executionId, contactId, message } = job.data;
    console.log(`[Remarketing] Sending follow-up to contact ${contactId}`);

    await new Promise((resolve) => setTimeout(resolve, 1000));

    await prisma.remarketingExecution.update({
      where: { id: executionId },
      data: { status: 'sent' },
    });

    return { success: true };
  },
  { connection }
);

// Error handlers
whatsappWorker.on('failed', (job, err) => {
  console.error(`[WhatsApp] Job ${job?.id} failed:`, err.message);
});

campaignWorker.on('failed', (job, err) => {
  console.error(`[Campaign] Job ${job?.id} failed:`, err.message);
});

remarketingWorker.on('failed', (job, err) => {
  console.error(`[Remarketing] Job ${job?.id} failed:`, err.message);
});

export { whatsappWorker, campaignWorker, remarketingWorker };
