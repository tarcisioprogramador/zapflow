// ═══════════════════════════════════════════════
// ZapFlow — Vercel API Entry Point - DIAGNOSTIC
// ═══════════════════════════════════════════════

import fs from 'fs';
import path from 'path';

// Set DB path first
const tmpDb = '/tmp/dev.db';
if (!fs.existsSync(tmpDb)) {
  const paths = [
    path.join(__dirname, '..', 'backend', 'dev.db'),
    path.join(__dirname, '..', '..', 'backend', 'dev.db'),
    path.join(process.cwd(), 'backend', 'dev.db'),
    '/var/task/backend/dev.db',
  ];
  for (const p of paths) {
    if (fs.existsSync(p)) {
      fs.copyFileSync(p, tmpDb);
      break;
    }
  }
  if (!fs.existsSync(tmpDb)) {
    try { fs.writeFileSync(tmpDb, ''); } catch (e) {}  }
}
process.env.DATABASE_URL = `file:${tmpDb}`;

export default async function handler(req: any, res: any) {
  // Always respond to health check
  if (req.url === '/api/health') {
    return res.status(200).json({ status: 'ok', name: 'ZapFlow', version: '1.0.0' });
  }

  // Diagnostic endpoint
  if (req.url === '/api/diagnose') {
    const results: any = {
      vercel: !!process.env.VERCEL,
      node: process.version,
      cwd: process.cwd(),
      dirname: __dirname,
      envDb: process.env.DATABASE_URL,
      devDbExists: {},
      distIndexExists: false,
      distRoutes: [],
    };

    // Check dev.db locations
    for (const p of [path.join(__dirname, '..', 'backend', 'dev.db'), '/tmp/dev.db']) {
      results.devDbExists[p] = fs.existsSync(p);
    }

    // Check dist/index.js
    const distIndex = path.join(__dirname, '..', 'backend', 'dist', 'index.js');
    results.distIndexExists = fs.existsSync(distIndex);

    // Check dist/routes
    const distRoutesDir = path.join(__dirname, '..', 'backend', 'dist', 'routes');
    if (fs.existsSync(distRoutesDir)) {
      results.distRoutes = fs.readdirSync(distRoutesDir);
    }

    // Try to load backend and report
    try {
      const backend = require('../backend/dist/index');
      results.loaded = true;
      results.hasDefault = !!backend.default;
      results.hasApp = typeof backend.default === 'function';
      results.exportKeys = Object.keys(backend);
      
      // Test a basic property of the app
      if (backend.default) {
        results.appType = typeof backend.default;
        results.appStackSize = backend.default._router?.stack?.length;
        results.appMountpaths = backend.default._router?.stack
          ?.filter((s: any) => s.route || s.handle?.stack)
          ?.map((s: any) => s.route?.path || s.regexp?.toString() || 'middleware')
          .slice(0, 20);
      }
    } catch (e: any) {
      results.loaded = false;
      results.error = e.message;
      results.stack = e.stack?.split('\n').slice(0, 5).join('\n');
    }

    return res.json(results);
  }

  // For all other routes, try to use the Express app
  try {
    const backend = require('../backend/dist/index');
    const app = backend.default || backend;
    app(req, res);
  } catch (e: any) {
    res.status(500).json({
      error: 'Backend failed to handle request',
      message: e.message,
      stack: e.stack?.split('\n').slice(0, 3).join('\n'),
    });
  }
}
