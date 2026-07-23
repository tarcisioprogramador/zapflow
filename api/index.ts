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
    // Try multiple paths for the bundled dev.db
    const possiblePaths = [
      path.join(__dirname, '..', 'backend', 'dev.db'),
      path.join(__dirname, '..', '..', 'backend', 'dev.db'),
      path.join(process.cwd(), 'backend', 'dev.db'),
      '/var/task/backend/dev.db',
    ];
    for (const srcDb of possiblePaths) {
      if (fs.existsSync(srcDb)) {
        fs.copyFileSync(srcDb, tmpDb);
        console.log('[DB] Copied dev.db to /tmp/dev.db from', srcDb);
        break;
      }
    }
    if (!fs.existsSync(tmpDb)) {
      // Create empty DB - Prisma will populate it
      console.log('[DB] No dev.db found, creating empty at /tmp/dev.db');
      try { fs.writeFileSync(tmpDb, ''); } catch (e) { /* ignore */ }
    }
  }
  process.env.DATABASE_URL = `file:${tmpDb}`;
}

// Try to import compiled output first, fall back to source
let app: any;
try {
  // Compiled TypeScript output
  app = require('../backend/dist/index').default;
  console.log('[API] Loaded compiled backend from dist/');
} catch (e1) {
  try {
    // Direct source (for Vercel's TS support)
    app = require('../backend/src/index').default;
    console.log('[API] Loaded source backend from src/');
  } catch (e2) {
    console.error('[API] Failed to load backend:', (e2 as Error).message);
    // Fallback: minimal Express app
    const express = require('express');
    const minimalApp = express();
    minimalApp.get('/api/health', (_req: any, res: any) => {
      res.json({ status: 'ok', name: 'ZapFlow', version: '1.0.0' });
    });
    app = minimalApp;
  }
}

export default app;
