import DOMPurify from 'isomorphic-dompurify';
import { z } from 'zod';
import { isBlobUrl } from '@/lib/blob';
import { escapeHtml } from '@/components/news/text';

/** Serialized EditorJS content is capped so one post can't bloat the row or the page. */
export const MAX_CONTENT_BYTES = 200 * 1024;
const MAX_BLOCKS = 500;
const MAX_CODE_CHARS = 20_000;
const BLURB_MAX_CHARS = 280;

/** Hosts the enabled Embed services produce (see EMBED_SERVICES in the editor). Anything else is dropped. */
const EMBED_HOSTS = new Set(['www.youtube.com', 'player.twitch.tv', 'player.vimeo.com', 'platform.twitter.com']);
const EMBED_SERVICES = new Set(['youtube', 'twitch-video', 'twitch-channel', 'vimeo', 'twitter']);

// The inline tools EditorJS can emit inside paragraphs, headers, list items and table cells.
const INLINE_TAGS = ['b', 'strong', 'i', 'em', 'a', 'code', 'br', 'mark', 'u', 's'];

function inline(value: unknown): string {
	if (typeof value !== 'string') return '';
	return DOMPurify.sanitize(value, { ALLOWED_TAGS: INLINE_TAGS, ALLOWED_ATTR: ['href', 'class'] });
}

/** Plain text for fields the renderer still runs through an HTML parser (captions, link meta). */
function plain(value: unknown, max = 500): string {
	if (typeof value !== 'string') return '';
	return DOMPurify.sanitize(value.slice(0, max * 2), { ALLOWED_TAGS: [] }).slice(0, max);
}

function httpUrl(value: unknown): string | null {
	if (typeof value !== 'string' || value.length > 2048) return null;
	try {
		const url = new URL(value);
		return url.protocol === 'https:' || url.protocol === 'http:' ? url.toString() : null;
	} catch {
		return null;
	}
}

function bool(value: unknown): boolean {
	return value === true;
}

const blockSchema = z.object({
	id: z.string().max(64).optional(),
	type: z.string().max(32),
	data: z.record(z.unknown()),
});

const contentSchema = z.object({
	time: z.number().optional(),
	version: z.string().max(32).optional(),
	blocks: z.array(blockSchema).max(MAX_BLOCKS),
});

export type NewsContent = { time?: number; version?: string; blocks: Array<{ id?: string; type: string; data: Record<string, unknown> }> };

type Block = z.infer<typeof blockSchema>;

function cleanListItems(items: unknown, depth = 0): unknown[] {
	if (!Array.isArray(items) || depth > 4) return [];
	return items.slice(0, 200).flatMap<unknown>((item) => {
		if (typeof item === 'string') return [inline(item)];
		if (item && typeof item === 'object' && 'content' in item) {
			const nested = item as { content: unknown; items?: unknown };
			return [{ content: inline(nested.content), items: cleanListItems(nested.items, depth + 1) }];
		}
		return [];
	});
}

/** Returns a sanitized copy of the block, or null when it should be dropped. Throws for unknown block types. */
function cleanBlock(block: Block): Block | null {
	const { id, type, data } = block;
	const out = (d: Record<string, unknown>): Block => ({ ...(id ? { id } : {}), type, data: d });

	switch (type) {
		case 'paragraph':
			return out({ text: inline(data.text) });
		case 'header': {
			const level = Math.min(4, Math.max(2, Number(data.level) || 2));
			return out({ text: inline(data.text), level });
		}
		case 'list':
			return out({ style: data.style === 'ordered' ? 'ordered' : 'unordered', items: cleanListItems(data.items) });
		case 'code':
			return out({ code: typeof data.code === 'string' ? data.code.slice(0, MAX_CODE_CHARS) : '' });
		case 'table': {
			const rows = Array.isArray(data.content) ? data.content.slice(0, 100) : [];
			const content = rows.map((row) => (Array.isArray(row) ? row.slice(0, 20).map(inline) : []));
			return out({ withHeadings: bool(data.withHeadings), content });
		}
		case 'embed': {
			const embed = httpUrl(data.embed);
			if (!embed || !EMBED_SERVICES.has(String(data.service))) return null;
			const url = new URL(embed);
			if (url.protocol !== 'https:' || !EMBED_HOSTS.has(url.hostname)) return null;
			return out({
				service: String(data.service),
				source: httpUrl(data.source) ?? '',
				embed,
				width: Number(data.width) || 580,
				height: Number(data.height) || 320,
				caption: plain(data.caption),
			});
		}
		case 'image': {
			const file = data.file as { url?: unknown } | undefined;
			const url = typeof file?.url === 'string' ? file.url : null;
			if (!isBlobUrl(url)) return null;
			return out({
				file: { url },
				caption: plain(data.caption),
				withBorder: bool(data.withBorder),
				stretched: bool(data.stretched),
				withBackground: bool(data.withBackground),
			});
		}
		case 'linkTool': {
			const link = httpUrl(data.link);
			if (!link) return null;
			const meta = (data.meta ?? {}) as Record<string, unknown>;
			const image = httpUrl((meta.image as { url?: unknown } | undefined)?.url);
			return out({
				link,
				meta: {
					title: plain(meta.title, 200),
					description: plain(meta.description, 400),
					...(meta.site_name ? { site_name: plain(meta.site_name, 100) } : {}),
					...(image ? { image: { url: image } } : {}),
				},
			});
		}
		default:
			throw new ContentError(`Unsupported block type "${type}"`);
	}
}

export class ContentError extends Error {}

/** Validates the `{ blocks: [...] }` shape and size cap, then sanitizes every block. Throws ContentError on bad input. */
export function parseContent(raw: unknown): NewsContent {
	const size = Buffer.byteLength(JSON.stringify(raw ?? null), 'utf8');
	if (size > MAX_CONTENT_BYTES) throw new ContentError('Post is too long (200KB limit)');

	const parsed = contentSchema.safeParse(raw);
	if (!parsed.success) throw new ContentError('Content must be EditorJS output with a blocks array');

	const blocks = parsed.data.blocks.map(cleanBlock).filter((b): b is Block => b !== null);
	return { ...(parsed.data.time ? { time: parsed.data.time } : {}), ...(parsed.data.version ? { version: parsed.data.version } : {}), blocks };
}

/** First paragraph of the post, as a short escaped `<p>` for the feed and homepage card. */
export function deriveBlurb(content: NewsContent): string {
	const first = content.blocks.find((b) => b.type === 'paragraph' && typeof b.data.text === 'string' && b.data.text.trim());
	if (!first) return '';
	const text = DOMPurify.sanitize(String(first.data.text), { ALLOWED_TAGS: [] })
		.replace(/&nbsp;/g, ' ')
		.replace(/&amp;/g, '&')
		.replace(/&lt;/g, '<')
		.replace(/&gt;/g, '>')
		.replace(/\s+/g, ' ')
		.trim();
	const clipped = text.length > BLURB_MAX_CHARS ? `${text.slice(0, BLURB_MAX_CHARS).replace(/\s+\S*$/, '')}…` : text;
	return `<p>${escapeHtml(clipped)}</p>`;
}

/** Plain-text blurb from the editor form, stored as escaped HTML so it renders the same as legacy rich-text blurbs. */
export function blurbFromPlainText(text: string): string {
	const trimmed = text.trim();
	return trimmed ? `<p>${escapeHtml(trimmed)}</p>` : '';
}
