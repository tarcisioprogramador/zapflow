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
    // Source DB is bundled with the deployment
    const srcDb = path.join(__dirname, '..', 'backend', 'dev.db');
    if (fs.existsSync(srcDb)) {
      fs.copyFileSync(srcDb, tmpDb);
      console.log('[DB] Copied dev.db to /tmp/dev.db');
    }
  }
  process.env.DATABASE_URL = `file:${tmpDb}`;
}

// Import and re-export the Express app from the backend
// Backend's index.ts skips httpServer.listen() when VERCEL=1
import app from '../backend/src/index';

export default app;
