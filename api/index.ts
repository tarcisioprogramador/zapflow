// ═══════════════════════════════════════════════
// ZapFlow — Vercel API Entry Point
// ═══════════════════════════════════════════════
// Wraps the Express backend as a Vercel serverless function
// ═══════════════════════════════════════════════

import fs from 'fs';
import path from 'path';

// Debug: log the current directory structure
console.log('[API] __dirname:', __dirname);
console.log('[API] cwd:', process.cwd());
console.log('[API] VERCEL:', process.env.VERCEL);

// Check if backend/dist/index.js exists
const distPath = path.join(__dirname, '..', 'backend', 'dist', 'index.js');
const srcPath = path.join(__dirname, '..', 'backend', 'src', 'index.ts');
console.log('[API] dist/index.js exists:', fs.existsSync(distPath));
console.log('[API] src/index.ts exists:', fs.existsSync(srcPath));

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
      console.log('[DB] Checking:', srcDb, 'exists:', fs.existsSync(srcDb));
      if (fs.existsSync(srcDb)) {
        fs.copyFileSync(srcDb, tmpDb);
        console.log('[DB] Copied dev.db to /tmp/dev.db from', srcDb);
        break;
      }
    }
    if (!fs.existsSync(tmpDb)) {
      console.log('[DB] No dev.db found, creating empty at /tmp/dev.db');
      try { fs.writeFileSync(tmpDb, ''); } catch (e) { /* ignore */ }
    }
  }
  process.env.DATABASE_URL = `file:${tmpDb}`;
  console.log('[DB] DATABASE_URL set to:', process.env.DATABASE_URL);
}

export default async function handler(req: any, res: any) {
  // Check environment
  console.log('[API] Handling request:', req.method, req.url);
  
  // Simple health check without Express
  if (req.url === '/api/health') {
    res.status(200).json({ status: 'ok', name: 'ZapFlow', version: '1.0.0' });
    return;
  }

  // For any other /api/* route, try to use the Express app
  try {
    const backend = require('../backend/dist/index');
    const app = backend.default || backend;
    console.log('[API] Loaded compiled backend from dist/');
    app(req, res);
  } catch (e1: any) {
    console.error('[API] dist/ load failed:', e1.message);
    try {
      const backend = require('../backend/src/index');
      const app = backend.default || backend;
      console.log('[API] Loaded source backend from src/');
      app(req, res);
    } catch (e2: any) {
      console.error('[API] src/ load failed:', e2.message);
      console.error('[API] Stack:', e2.stack);
      res.status(500).json({
        error: 'Backend failed to load',
        message: e2.message,
        paths: {
          dist: distPath,
          distExists: fs.existsSync(distPath),
          src: srcPath,
          srcExists: fs.existsSync(srcPath),
        }
      });
    }
  }
}
