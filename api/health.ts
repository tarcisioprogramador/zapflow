// ═══════════════════════════════════════════════
// ZapFlow — Vercel Health Check
// ═══════════════════════════════════════════════
// Simple endpoint to verify serverless functions work
// ═══════════════════════════════════════════════

import type { VercelRequest, VercelResponse } from '@vercel/node';

export default function handler(req: VercelRequest, res: VercelResponse) {
  res.status(200).json({ status: 'ok', name: 'ZapFlow', version: '1.0.0' });
}
