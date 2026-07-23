/**
 * Trial Management Service
 * Handles 7-day free trial for new user accounts
 * Blocks access to features when trial expires
 */

import prisma from '../config/database';

const TRIAL_DURATION_DAYS = 7;

/**
 * Set 7-day trial for a user (called on registration)
 */
export async function startUserTrial(userId: string): Promise<void> {
  const now = new Date();
  const expiresAt = new Date(now.getTime() + TRIAL_DURATION_DAYS * 24 * 60 * 60 * 1000);

  await prisma.user.update({
    where: { id: userId },
    data: {
      trialStartedAt: now,
      trialExpiresAt: expiresAt,
    },
  });

  console.log(`[Trial] 7-day trial started for user ${userId}, expires at ${expiresAt.toISOString()}`);
}

/**
 * Check if a user's trial has expired
 */
export async function isUserTrialExpired(userId: string): Promise<boolean> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { trialExpiresAt: true, plan: true },
  });

  // Paid plans never expire
  if (user?.plan === 'PRO' || user?.plan === 'ENTERPRISE') return false;

  // No trial set = treat as expired (block access)
  if (!user?.trialExpiresAt) return true;

  return Date.now() > user.trialExpiresAt.getTime();
}

/**
 * Get trial status for a user
 */
export async function getUserTrialStatus(userId: string): Promise<{
  isActive: boolean;
  isExpired: boolean;
  daysRemaining: number;
  startedAt: string | null;
  expiresAt: string | null;
  plan: string;
}> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      plan: true,
      trialStartedAt: true,
      trialExpiresAt: true,
    },
  });

  if (!user) {
    return { isActive: false, isExpired: true, daysRemaining: 0, startedAt: null, expiresAt: null, plan: 'FREE' };
  }

  // Paid plans have no trial expiration
  if (user.plan === 'PRO' || user.plan === 'ENTERPRISE') {
    return {
      isActive: false,
      isExpired: false,
      daysRemaining: 0,
      startedAt: user.trialStartedAt?.toISOString() || null,
      expiresAt: null,
      plan: user.plan,
    };
  }

  if (!user.trialExpiresAt) {
    return { isActive: false, isExpired: true, daysRemaining: 0, startedAt: null, expiresAt: null, plan: user.plan };
  }

  const now = Date.now();
  const expired = now > user.trialExpiresAt.getTime();
  const remainingMs = user.trialExpiresAt.getTime() - now;
  const daysRemaining = expired ? 0 : Math.ceil(remainingMs / (1000 * 60 * 60 * 24));

  return {
    isActive: !expired && (user.plan === 'FREE' || user.plan === 'STARTER'),
    isExpired: expired && (user.plan === 'FREE' || user.plan === 'STARTER'),
    daysRemaining,
    startedAt: user.trialStartedAt?.toISOString() || null,
    expiresAt: user.trialExpiresAt.toISOString(),
    plan: user.plan,
  };
}

/**
 * Migrate existing users without trial data — start trial from creation date
 */
export async function migrateExistingUsersWithoutTrial(): Promise<number> {
  const users = await prisma.user.findMany({
    where: {
      trialExpiresAt: null,
      plan: { in: ['FREE', 'STARTER'] },
    },
  });

  for (const user of users) {
    const startedAt = user.createdAt;
    const expiresAt = new Date(startedAt.getTime() + TRIAL_DURATION_DAYS * 24 * 60 * 60 * 1000);

    await prisma.user.update({
      where: { id: user.id },
      data: {
        trialStartedAt: startedAt,
        trialExpiresAt: expiresAt,
      },
    });
  }

  return users.length;
}

/**
 * CRON: Check all users with expired trials and downgrade/notify
 */
export async function checkAndDisconnectExpiredTrials(): Promise<number> {
  const now = new Date();

  const expiredUsers = await prisma.user.findMany({
    where: {
      trialExpiresAt: { lte: now, not: null },
      plan: { in: ['FREE', 'STARTER'] },
    },
  });

  for (const user of expiredUsers) {
    console.log(`[Trial] Trial expired for user ${user.id} (${user.email})`);
    // Future: send notification email, downgrade WhatsApp instances, etc.
  }

  return expiredUsers.length;
}
