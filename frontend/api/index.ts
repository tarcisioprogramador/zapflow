// ═══════════════════════════════════════════════
// ZapFlow — Vercel API Entry Point
// ═══════════════════════════════════════════════
// Wraps the Express backend as a Vercel serverless function
// ═══════════════════════════════════════════════

// Import and re-export the Express app from the local backend copy
// Backend's index.ts skips httpServer.listen() when VERCEL=1
import app from './backend-src/index';

export default app;
