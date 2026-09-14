import DOMPurify from 'isomorphic-dompurify';

const ALLOWED_TAGS = ['p', 'br', 'strong', 'em', 'u', 's', 'ul', 'ol', 'li', 'a', 'h1', 'h2', 'h3', 'blockquote', 'code'];
const ALLOWED_ATTR = ['href', 'target', 'rel'];

/** Sanitizes admin-authored rich text (Tiptap HTML output) to a safe tag/attribute allowlist before it's persisted. */
export function sanitizeRichText(html: string): string {
	return DOMPurify.sanitize(html, { ALLOWED_TAGS, ALLOWED_ATTR });
}
