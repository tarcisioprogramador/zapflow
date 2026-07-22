// ═══════════════════════════════════════════════
// ZapFlow — Vercel Serverless Entry Point
// ═══════════════════════════════════════════════
// This file adapts the Express backend to run as
// a Vercel serverless function.
//
// The backend's index.ts checks process.env.VERCEL
// and skips httpServer.listen() automatically.
// ═══════════════════════════════════════════════

// The VERCEL env var is set automatically by Vercel
import app from '../backend/src/index';

export default app;
