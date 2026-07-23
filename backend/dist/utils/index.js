"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.sanitizeContent = sanitizeContent;
/**
 * Sanitize user-provided content before persisting to database.
 * Strips all HTML tags — WhatsApp messages are plain text.
 * Defense-in-depth: frontend already sanitizes at render time with DOMPurify.
 */
const sanitize_html_1 = __importDefault(require("sanitize-html"));
function sanitizeContent(content) {
    if (!content)
        return '';
    const clean = (0, sanitize_html_1.default)(content, {
        allowedTags: [],
        allowedAttributes: {},
        disallowedTagsMode: 'discard',
    });
    return clean.trim();
}
//# sourceMappingURL=index.js.map