/**
 * Sanitize user-provided content before persisting to database.
 * Strips all HTML tags — WhatsApp messages are plain text.
 * Defense-in-depth: frontend already sanitizes at render time with DOMPurify.
 */
import sanitizeHtml from 'sanitize-html';

export function sanitizeContent(content: string): string {
  if (!content) return '';

  const clean = sanitizeHtml(content, {
    allowedTags: [],
    allowedAttributes: {},
    disallowedTagsMode: 'discard',
  });

  return clean.trim();
}
