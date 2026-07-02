/**
 * Trial Management Service
 * Handles 24-hour trial expiration for Starter plan
 * Auto-disconnects WhatsApp numbers when trial expires
 */

import prisma from '../config/database';
import { logoutInstance, BASE_URL, API_KEY } from './whatsapp';

const TRIAL_DURATION_HOURS = 24;

/**
 * Set trial expiration on a WhatsApp number (24h from now)
 */
export async function setTrialExpiration(whatsappNumberId: string): Promise<void> {
  const expiresAt = new Date(Date.now() + TRIAL_DURATION_HOURS * 60 * 60 * 1000);
  await prisma.whatsAppNumber.update({
    where: { id: whatsappNumberId },
    data: { trialExpiresAt: expiresAt },
  });
  console.log(`[Trial] Trial set for ${whatsappNumberId}, expires at ${expiresAt.toISOString()}`);
}

/**
 * Check if a WhatsApp number's trial has expired
 */
export async function isTrialExpired(whatsappNumberId: string): Promise<boolean> {
  const number = await prisma.whatsAppNumber.findUnique({
    where: { id: whatsappNumberId },
  });

  if (!number?.trialExpiresAt) return false; // No trial = no expiration

  return Date.now() > number.trialExpiresAt.getTime();
}

/**
 * Get remaining trial time in milliseconds
 * Returns 0 if trial has expired or no trial is set
 */
export async function getTrialRemainingMs(whatsappNumberId: string): Promise<number> {
  const number = await prisma.whatsAppNumber.findUnique({
    where: { id: whatsappNumberId },
  });

  if (!number?.trialExpiresAt) return 0;

  const remaining = number.trialExpiresAt.getTime() - Date.now();
  return Math.max(0, remaining);
}

/**
 * Format remaining trial time for display
 */
export async function getTrialRemainingFormatted(whatsappNumberId: string): Promise<string | null> {
  const remaining = await getTrialRemainingMs(whatsappNumberId);
  if (remaining <= 0) return null;

  const hours = Math.floor(remaining / (1000 * 60 * 60));
  const minutes = Math.floor((remaining % (1000 * 60 * 60)) / (1000 * 60));

  if (hours > 0) {
    return `${hours}h ${minutes}min restantes`;
  }
  return `${minutes}min restantes`;
}

/**
 * Auto-disconnect a WhatsApp number (used when trial expires)
 */
export async function disconnectExpiredTrial(whatsappNumberId: string): Promise<void> {
  const number = await prisma.whatsAppNumber.findUnique({
    where: { id: whatsappNumberId },
  });

  if (!number) return;

  console.log(`[Trial] Auto-disconnecting expired trial for ${whatsappNumberId} (${number.number})`);

  // Logout from Evolution API if configured
  if (number.instanceId && BASE_URL && API_KEY) {
    try {
      await logoutInstance(number.instanceId);
    } catch {
      // Continue even if API call fails
    }
  }

  // Update status to DISCONNECTED and clear trial
  await prisma.whatsAppNumber.update({
    where: { id: whatsappNumberId },
    data: {
      status: 'DISCONNECTED',
      qrcode: null,
      trialExpiresAt: null,
    },
  });

  console.log(`[Trial] Disconnected expired trial for ${whatsappNumberId}`);
}

/**
 * Check ALL WhatsApp numbers and disconnect those with expired trials
 * Returns count of disconnected numbers
 */
export async function checkAndDisconnectExpiredTrials(): Promise<number> {
  const now = new Date();

  const expiredNumbers = await prisma.whatsAppNumber.findMany({
    where: {
      trialExpiresAt: { lte: now },
      status: { not: 'DISCONNECTED' },
    },
  });

  console.log(`[Trial] Found ${expiredNumbers.length} expired trial(s) to disconnect`);

  for (const num of expiredNumbers) {
    await disconnectExpiredTrial(num.id);
  }

  return expiredNumbers.length;
}
