import { z } from 'zod';

/** Shared, framework-free forum constants and helpers (safe to import from server and client). */

export const FORUM_CATEGORIES = ['GENERAL', 'COUNTER_STRIKE', 'TOURNAMENTS', 'OFF_TOPIC'] as const;
export type ForumCategoryValue = (typeof FORUM_CATEGORIES)[number];

export const CATEGORY_LABELS: Record<ForumCategoryValue, string> = {
	GENERAL: 'General',
	COUNTER_STRIKE: 'Counter-Strike',
	TOURNAMENTS: 'Tournaments',
	OFF_TOPIC: 'Off topic',
};

/** URL slugs for `?category=`, kept readable instead of the enum spelling. */
export const CATEGORY_SLUGS: Record<ForumCategoryValue, string> = {
	GENERAL: 'general',
	COUNTER_STRIKE: 'counter-strike',
	TOURNAMENTS: 'tournaments',
	OFF_TOPIC: 'off-topic',
};

export function parseCategorySlug(value: string | null | undefined): ForumCategoryValue | null {
	if (!value) return null;
	const normalized = value.toLowerCase();
	const match = FORUM_CATEGORIES.find((c) => CATEGORY_SLUGS[c] === normalized || c.toLowerCase() === normalized);
	return match ?? null;
}

export const THREADS_PER_PAGE = 30;
export const TITLE_MIN = 3;
export const TITLE_MAX = 120;
export const BODY_MAX = 5000;
export const THREAD_COOLDOWN_MS = 30_000;
export const REPLY_COOLDOWN_MS = 10_000;

const plainText = (max: number, label: string) =>
	z
		.string({ required_error: `${label} is required` })
		.transform((value) => value.replace(/\r\n/g, '\n').trim())
		.pipe(z.string().min(1, `${label} can't be empty`).max(max, `${label} must be at most ${max} characters`));

export const threadSchema = z.object({
	title: z
		.string({ required_error: 'Title is required' })
		.transform((value) => value.replace(/\s+/g, ' ').trim())
		.pipe(z.string().min(TITLE_MIN, `Title must be at least ${TITLE_MIN} characters`).max(TITLE_MAX, `Title must be at most ${TITLE_MAX} characters`)),
	category: z.enum(FORUM_CATEGORIES, { errorMap: () => ({ message: 'Pick a category' }) }),
	body: plainText(BODY_MAX, 'Post'),
});

export const replySchema = z.object({ body: plainText(BODY_MAX, 'Reply') });

export const moderateSchema = z
	.object({ isPinned: z.boolean().optional(), isLocked: z.boolean().optional() })
	.strict()
	.refine((value) => value.isPinned !== undefined || value.isLocked !== undefined, 'Nothing to update');

/** Compact relative time ("now", "5m", "3h", "2d", then a short date), HLTV-style. */
export function formatRelative(date: Date, now: Date = new Date()): string {
	const seconds = Math.max(0, Math.round((now.getTime() - date.getTime()) / 1000));
	if (seconds < 60) return 'now';
	const minutes = Math.floor(seconds / 60);
	if (minutes < 60) return `${minutes}m ago`;
	const hours = Math.floor(minutes / 60);
	if (hours < 24) return `${hours}h ago`;
	const days = Math.floor(hours / 24);
	if (days < 30) return `${days}d ago`;
	return date.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' });
}

export function formatAbsolute(date: Date): string {
	return date.toLocaleString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit', timeZone: 'UTC' }) + ' UTC';
}

export type TextToken = { type: 'text'; value: string } | { type: 'link'; value: string };

// Trailing punctuation is almost always sentence punctuation rather than part of the URL.
const URL_PATTERN = /https?:\/\/[^\s<>"']+/g;
const TRAILING = /[.,;:!?)\]}]+$/;

/** Splits plain text into text and http(s) link tokens. Never produces markup. */
export function tokenizeLinks(text: string): TextToken[] {
	const tokens: TextToken[] = [];
	let last = 0;
	for (const match of text.matchAll(URL_PATTERN)) {
		const start = match.index ?? 0;
		let url = match[0];
		const trailing = url.match(TRAILING)?.[0] ?? '';
		if (trailing) url = url.slice(0, -trailing.length);
		if (start > last) tokens.push({ type: 'text', value: text.slice(last, start) });
		if (url.length > 'https://'.length) tokens.push({ type: 'link', value: url });
		else tokens.push({ type: 'text', value: url });
		last = start + url.length;
	}
	if (last < text.length) tokens.push({ type: 'text', value: text.slice(last) });
	return tokens;
}
