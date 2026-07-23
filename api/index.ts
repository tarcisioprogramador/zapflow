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
        console.log('[DB] Copied dev.db to /tmp/dev.db from', srcDb);
        break;
      }
    }
    if (!fs.existsSync(tmpDb)) {
      try { fs.writeFileSync(tmpDb, ''); } catch (e) { /* ignore */ }
    }
  }
  process.env.DATABASE_URL = `file:${tmpDb}`;
}

// Load the compiled Express backend
const backend = require('../backend/dist/index');
const app = backend.default || backend;

export default app;
