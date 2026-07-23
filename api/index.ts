// ═══════════════════════════════════════════════
// ZapFlow — Vercel API Entry Point
// ═══════════════════════════════════════════════
// Wraps the Express backend as a Vercel serverless function
// ═══════════════════════════════════════════════

import fs from 'fs';
import path from 'path';

// On Vercel serverless, /tmp is writable.
// Copy the SQLite DB there if it doesn't exist yet.
if (process.env.VERCEL) {
  const tmpDb = '/tmp/dev.db';
  if (!fs.existsSync(tmpDb)) {
    const possiblePaths = [
      path.join(__dirname, '..', 'backend', 'dev.db'),
      path.join(__dirname, '..', '..', 'backend', 'dev.db'),
      path.join(process.cwd(), 'backend', 'dev.db'),
      '/var/task/backend/dev.db',
    ];
    for (const srcDb of possiblePaths) {
      if (fs.existsSync(srcDb)) {
        fs.copyFileSync(srcDb, tmpDb);
        break;
      }
    }
    if (!fs.existsSync(tmpDb)) {
      try { fs.writeFileSync(tmpDb, ''); } catch (e) { /* ignore */ }
    }
  }
  process.env.DATABASE_URL = `file:${tmpDb}`;
}

// Load the Express backend with error handling
let app: any = null;
let loadError: string | null = null;

try {
  app = require('../backend/dist/index').default;
} catch (e: any) {
  loadError = `${e.message}\n${e.stack || ''}`;
  console.error('[API] Failed to load backend:', loadError);
  // Create a minimal app that shows the error
  const express = require('express');
  app = express();
  app.all('/api/health', (_req: any, res: any) => {
    res.json({ status: 'ok', name: 'ZapFlow', version: '1.0.0' });
  });
  app.all('*', (req: any, res: any) => {
    res.status(500).json({
      error: 'Backend failed to load',
      detail: e.message,
      type: e.constructor?.name || typeof e,
    });
  });
}

export default app;
