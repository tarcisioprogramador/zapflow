// ═══════════════════════════════════════════════
// ZapFlow — Vercel API Entry Point
// ═══════════════════════════════════════════════
// Wraps the Express backend as a Vercel serverless function
// ═══════════════════════════════════════════════

import fs from 'fs';
import path from 'path';

// On Vercel serverless, /tmp is writable.
// Copy the SQLite DB there if it doesn't exist yet.
const tmpDb = '/tmp/dev.db';
if (!fs.existsSync(tmpDb)) {
  const dbPaths = [
    path.join(__dirname, '..', 'backend', 'dev.db'),
    path.join(__dirname, '..', '..', 'backend', 'dev.db'),
    path.join(process.cwd(), 'backend', 'dev.db'),
    '/var/task/backend/dev.db',
    '/var/task/backend/dev.db',
  ];
  for (const p of dbPaths) {
    try {
      if (fs.existsSync(p)) {
        fs.copyFileSync(p, tmpDb);
        break;
      }
    } catch {}
  }
  if (!fs.existsSync(tmpDb)) {
    try { fs.writeFileSync(tmpDb, ''); } catch {}
  }
}
process.env.DATABASE_URL = `file:${tmpDb}`;

// Load the Express backend
const distPath = path.join(__dirname, '..', 'backend', 'dist', 'index.js');
let app: any;

try {
  app = require('../backend/dist/index').default;
} catch (e: any) {
  // Minimal fallback
  const express = require('express');
  app = express();
  app.all('*', (_req: any, res: any) => {
    res.json({ status: 'error', message: 'Backend failed to load: ' + e.message });
  });
}

export default app;
