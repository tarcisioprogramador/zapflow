/**
 * Tour Sync Utility
 *
 * Syncs tour completion status between localStorage (fast, offline-capable)
 * and the backend user profile (persistent across devices).
 *
 * Strategy:
 *  - localStorage is the source of truth for the UI (instant reads)
 *  - Backend sync happens in the background (fire-and-forget on completion)
 *  - On mount, we fetch from backend and merge into localStorage
 */

import { tourApi } from '../api';

export const TOUR_KEYS = {
  DASHBOARD: 'zapflow-dashboard-tour-completed',
  ONBOARDING: 'zapflow-onboarding-tour-completed',
} as const;

/**
 * Read a tour's completion status from localStorage.
 * Returns false if localStorage is unavailable or the value is not 'true'.
 */
export function getLocalTourStatus(key: string): boolean {
  try {
    return localStorage.getItem(key) === 'true';
  } catch {
    return false;
  }
}

/**
 * Write a tour's completion status to localStorage.
 * Silently ignores errors (e.g. private browsing, storage full).
 */
export function setLocalTourStatus(key: string, value: boolean): void {
  try {
    localStorage.setItem(key, value ? 'true' : 'false');
  } catch {
    // localStorage might not be available
  }
}

/**
 * Fetch tour status from the backend and merge into localStorage.
 * Backend values take precedence over localStorage values.
 *
 * Call this on page mount for pages that show tours.
 */
export async function syncTourFromBackend(): Promise<void> {
  try {
    const { data } = await tourApi.getStatus();
    if (data?.dashboard !== undefined) {
      setLocalTourStatus(TOUR_KEYS.DASHBOARD, data.dashboard);
    }
    if (data?.onboarding !== undefined) {
      setLocalTourStatus(TOUR_KEYS.ONBOARDING, data.onboarding);
    }
  } catch {
    // Backend might not be available (offline, not authenticated, etc.)
    // Keep using localStorage values in that case
  }
}

/**
 * Save tour completion status to the backend (fire-and-forget).
 * This runs in the background and doesn't block the UI.
 *
 * Call this when a tour is completed.
 */
export function syncTourToBackend(data: {
  dashboard?: boolean;
  onboarding?: boolean;
}): void {
  tourApi.update(data).catch(() => {
    // Silently ignore — will retry on next page load
  });
}
