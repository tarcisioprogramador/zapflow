import DOMPurify from 'dompurify';

// Parse tags from SQLite JSON string or array
export function parseTags(tags: any): string[] {
  if (Array.isArray(tags)) return tags;
  if (typeof tags === 'string') {
    try { return JSON.parse(tags); } catch { return []; }
  }
  return [];
}

// ─── XSS Sanitization ─────────────────────────────────────

/**
 * Sanitize user-generated content to prevent XSS attacks.
 * Strips ALL HTML tags — WhatsApp messages should be plain text only.
 *
 * Uses DOMPurify (https://github.com/cure53/DOMPurify) — industry-standard
 * XSS sanitization library used by Slack, GitHub, and Mozilla.
 *
 * Must be called BEFORE rendering any content that originated from:
 * - WhatsApp messages (incoming/outgoing)
 * - Contact names and user-generated text
 * - Knowledge base entries
 * - Webhook payloads
 */
export function sanitizeContent(content: string): string {
  if (!content) return '';
  return DOMPurify.sanitize(content, {
    ALLOWED_TAGS: [],    // Strip ALL HTML tags — messages are plain text
    ALLOWED_ATTR: [],    // Strip ALL attributes
    ALLOW_DATA_ATTR: false,
  });
}
