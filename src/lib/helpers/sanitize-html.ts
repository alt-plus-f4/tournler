import sanitizeHtml from 'sanitize-html';

const ALLOWED_TAGS = ['p', 'br', 'strong', 'em', 'u', 's', 'ul', 'ol', 'li', 'a', 'h1', 'h2', 'h3', 'blockquote', 'code'];
const ALLOWED_ATTR = ['href', 'target', 'rel'];

/** Sanitizes admin-authored rich text (Tiptap HTML output) to a safe tag/attribute allowlist before it's persisted. */
export function sanitizeRichText(html: string): string {
	return sanitizeHtml(html, {
		allowedTags: ALLOWED_TAGS,
		allowedAttributes: { '*': ALLOWED_ATTR },
	});
}

// Decorative vector shapes only. No <script>, <foreignObject>, <style> (CSS, incl. @import, can itself
// execute behavior and reach out to the network), <use> (can pull in external/remote content via href),
// or any SMIL <animate*>/<set> element (these can mutate attributes like onclick-equivalents or toggle
// visibility/position without any <script> tag at all, which is exactly what a denylist tends to miss).
const SVG_ALLOWED_TAGS = [
	'svg',
	'g',
	'path',
	'circle',
	'rect',
	'ellipse',
	'line',
	'polyline',
	'polygon',
	'defs',
	'clipPath',
	'mask',
	'linearGradient',
	'radialGradient',
	'stop',
	'title',
	'desc',
];

const SVG_ALLOWED_ATTR = [
	'viewBox',
	'width',
	'height',
	'xmlns',
	'xmlns:xlink',
	'version',
	'fill',
	'fill-rule',
	'fill-opacity',
	'stroke',
	'stroke-width',
	'stroke-linecap',
	'stroke-linejoin',
	'stroke-dasharray',
	'stroke-opacity',
	'opacity',
	'd',
	'cx',
	'cy',
	'r',
	'rx',
	'ry',
	'x',
	'y',
	'x1',
	'y1',
	'x2',
	'y2',
	'points',
	'transform',
	'id',
	'class',
	'clip-path',
	'mask',
	'offset',
	'stop-color',
	'stop-opacity',
	'gradientUnits',
	'gradientTransform',
	'preserveAspectRatio',
];

/**
 * Sanitizes a user-submitted avatar SVG to a safe, decorative-shapes-only allowlist before it's
 * uploaded/stored. An allowlist is used (rather than denylisting known-dangerous constructs like
 * <script>/<foreignObject>/on* handlers) because a denylist can never enumerate every scriptable SVG
 * primitive — SMIL animations (<animate>, <animateTransform>, <set>, …) and <style> (CSS @import, etc.)
 * are both script-free ways to execute behavior that a hand-rolled denylist is liable to miss.
 */
export function sanitizeSvgAvatar(svg: string): string {
	return sanitizeHtml(svg, {
		allowedTags: SVG_ALLOWED_TAGS,
		allowedAttributes: { '*': SVG_ALLOWED_ATTR },
		// Belt-and-suspenders: strip any inline style/url()-based CSS even on an allowed element.
		allowedStyles: {},
		disallowedTagsMode: 'discard',
		// No protocol-based attributes (href/xlink:href) are in the allowlist above, so there is
		// nothing for allowedSchemes to apply to — external/remote references are dropped outright.
		allowedSchemes: [],
		enforceHtmlBoundary: false,
		parser: { lowerCaseAttributeNames: false },
	});
}
