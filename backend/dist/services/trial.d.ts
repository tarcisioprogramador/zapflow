/**
 * Trial Management Service
 * Handles 7-day free trial for new user accounts
 * Blocks access to features when trial expires
 */
/**
 * Set 7-day trial for a user (called on registration)
 */
export declare function startUserTrial(userId: string): Promise<void>;
/**
 * Check if a user's trial has expired
 */
export declare function isUserTrialExpired(userId: string): Promise<boolean>;
/**
 * Get trial status for a user
 */
export declare function getUserTrialStatus(userId: string): Promise<{
    isActive: boolean;
    isExpired: boolean;
    daysRemaining: number;
    startedAt: string | null;
    expiresAt: string | null;
    plan: string;
}>;
/**
 * Migrate existing users without trial data — start trial from creation date
 */
export declare function migrateExistingUsersWithoutTrial(): Promise<number>;
/**
 * CRON: Check all users with expired trials and downgrade/notify
 */
export declare function checkAndDisconnectExpiredTrials(): Promise<number>;
//# sourceMappingURL=trial.d.ts.map