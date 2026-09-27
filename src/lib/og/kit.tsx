import 'server-only';
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import sharp from 'sharp';

/** DESIGN.md's Broadcast Booth tokens — kept in lockstep with the colors block there. */
export const OG = {
	stageBlack: '#000000',
	canvas: '#09090b',
	panel: '#171717',
	hairline: '#27272a',
	ink: '#fafafa',
	inkSoft: '#d4d4d4',
	inkMuted: '#a1a1aa',
	labelGrey: '#a3a3a3',
	onAirRed: '#ef4444',
	readyGreen: '#22c55e',
	holdAmber: '#facc15',
} as const;

export const CARD_SIZE = { width: 1200, height: 630 } as const;

/**
 * Satori (next/og's renderer) fetches remote `<img src>` URLs itself, but only decodes PNG/JPEG —
 * it errors on WebP outright ("Unsupported image type: image/webp") and doesn't reliably rasterize
 * SVG (Dicebear-generated avatars). Uploads on this app can be any of those (avatars, team/
 * tournament art), so every remote asset is fetched and normalized to PNG with sharp (already a
 * project dependency) before being inlined as a data URI. Returns null on any failure so callers
 * fall back to their drawn placeholder instead of a broken image reaching the social-media crawler.
 */
export async function remoteImageDataUri(url: string | null | undefined, maxWidth = 1200): Promise<string | null> {
	if (!url) return null;
	try {
		const res = await fetch(url, { cache: 'no-store' });
		if (!res.ok) return null;
		const buf = Buffer.from(await res.arrayBuffer());
		// Uploads can be arbitrarily large (a source banner easily re-encodes past several MB as a
		// lossless PNG) — capped to the card's own width, since embedding it any bigger just bloats
		// the data URI Satori has to hold in memory for no visible gain at 1200x630.
		const png = await sharp(buf).resize({ width: maxWidth, withoutEnlargement: true }).png().toBuffer();
		return `data:image/png;base64,${png.toString('base64')}`;
	} catch (err) {
		console.error('[og] remoteImageDataUri failed', url, err);
		return null;
	}
}

let logoDataUri: Promise<string> | null = null;

/** The "TOURNLER" wordmark (public/logo.png — white strokes on transparent), inlined once. */
export function brandLogoSrc() {
	if (!logoDataUri) {
		logoDataUri = readFile(join(process.cwd(), 'public/logo.png')).then((buf) => `data:image/png;base64,${buf.toString('base64')}`);
	}
	return logoDataUri;
}

/** Fixed top-left brand row every card shares — the one constant across all four templates. */
export function BrandRow({ logoSrc }: { logoSrc: string }) {
	return (
		<div style={{ display: 'flex', alignItems: 'center', position: 'absolute', top: 36, left: 48 }}>
			{/* eslint-disable-next-line @next/next/no-img-element */}
			<img src={logoSrc} width={132} height={20} alt='' style={{ objectFit: 'contain' }} />
		</div>
	);
}

const STATE_COLOR: Record<'live' | 'paused' | 'neutral', string> = {
	live: OG.onAirRed,
	paused: OG.holdAmber,
	neutral: OG.hairline,
};

/** The signature top rule — 6px, colored by state, the same "pulse means now" hue vocabulary the
 *  match room uses, minus the pulse (a static raster can't animate). */
export function TopRule({ state }: { state: 'live' | 'paused' | 'neutral' }) {
	return <div style={{ position: 'absolute', top: 0, left: 0, right: 0, display: 'flex', height: 6, backgroundColor: STATE_COLOR[state] }} />;
}

/** A Section Label: tiny, bold, uppercase, widely tracked — the app's own signature heading style. */
export function SectionLabel({ children, color = OG.labelGrey }: { children: React.ReactNode; color?: string }) {
	return <div style={{ display: 'flex', fontFamily: 'Roboto', fontSize: 20, fontWeight: 700, letterSpacing: 2, textTransform: 'uppercase', color }}>{children}</div>;
}

/** dot + word status readout (no mono timer — nothing to tick in a static image). */
export function StatusReadout({ state, label }: { state: 'live' | 'paused' | 'neutral'; label: string }) {
	const color = state === 'neutral' ? OG.inkMuted : STATE_COLOR[state];
	return (
		<div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
			{state !== 'neutral' && <div style={{ display: 'flex', width: 14, height: 14, borderRadius: 999, backgroundColor: color }} />}
			<span style={{ fontFamily: 'Roboto', fontWeight: 700, fontSize: 24, color, textTransform: 'uppercase', letterSpacing: 1 }}>{label}</span>
		</div>
	);
}

/** Small pill chip — CS2/LoL game tag, format labels. Tight-corner, not a pill: 6px radius per
 *  the app's "no new pill-shaped containers" rule. */
export function Chip({ children, tone = 'default' }: { children: React.ReactNode; tone?: 'default' | 'ink' }) {
	const bg = tone === 'ink' ? OG.ink : 'transparent';
	const color = tone === 'ink' ? '#18181b' : OG.inkSoft;
	const border = tone === 'ink' ? 'none' : `2px solid ${OG.hairline}`;
	return (
		<div
			style={{
				display: 'flex',
				alignItems: 'center',
				padding: '6px 16px',
				borderRadius: 6,
				backgroundColor: bg,
				border,
				fontFamily: 'Roboto',
				fontWeight: 700,
				fontSize: 20,
				color,
				textTransform: 'uppercase',
				letterSpacing: 1,
			}}
		>
			{children}
		</div>
	);
}

/** Team/tournament logos are often dark art on transparent backgrounds — same light "sponsor
 *  plate" backing used everywhere else in the app (see TeamLogo.tsx) so the mark stays visible on
 *  the black stage. */
export function LogoPlate({ src, size = 96 }: { src: string; size?: number }) {
	return (
		<div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: size, height: size, borderRadius: 8, backgroundColor: '#f5f5f5', padding: size * 0.12, flexShrink: 0 }}>
			{/* eslint-disable-next-line @next/next/no-img-element */}
			<img src={src} width={size * 0.76} height={size * 0.76} alt='' style={{ objectFit: 'contain' }} />
		</div>
	);
}

/** Initials fallback for a missing team logo — same idea as TeamLogo.tsx's dark initials tile. */
export function InitialsPlate({ name, size = 96 }: { name: string; size?: number }) {
	const initials = (name.trim().slice(0, 2) || 'T').toUpperCase();
	return (
		<div
			style={{
				display: 'flex',
				alignItems: 'center',
				justifyContent: 'center',
				width: size,
				height: size,
				borderRadius: 8,
				backgroundColor: '#171717',
				border: `2px solid ${OG.hairline}`,
				flexShrink: 0,
			}}
		>
			<span style={{ fontFamily: 'Roboto', fontWeight: 900, fontSize: size * 0.36, color: OG.inkMuted }}>{initials}</span>
		</div>
	);
}

/** Full-bleed banner/background art faded to black at the bottom — the same scrim treatment
 *  DESIGN.md documents for every banner image in the app. */
export function ScrimBackground({ src }: { src: string }) {
	return (
		<div style={{ display: 'flex', position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, width: CARD_SIZE.width, height: CARD_SIZE.height }}>
			{/* eslint-disable-next-line @next/next/no-img-element */}
			<img src={src} width={CARD_SIZE.width} height={CARD_SIZE.height} alt='' style={{ objectFit: 'cover', width: '100%', height: '100%' }} />
			<div
				style={{
					display: 'flex',
					position: 'absolute',
					top: 0,
					left: 0,
					right: 0,
					bottom: 0,
					width: CARD_SIZE.width,
					height: CARD_SIZE.height,
					// Heavier than the app's own banner scrim (DESIGN.md) on purpose: a share card has no
					// surrounding page chrome to lean on, and the source art is whatever an organizer
					// uploaded — often carrying its own baked-in title lockup — so the whole frame recedes
					// enough that our own type and logo always win the read, not just the bottom third.
					backgroundImage: `linear-gradient(to top, rgba(0,0,0,0.97) 0%, rgba(0,0,0,0.86) 45%, rgba(0,0,0,0.55) 100%)`,
				}}
			/>
		</div>
	);
}

/** FACEIT level crest, redrawn as our own art (own SVG ring, same color bands as LevelBadge.tsx —
 *  never the hotlinked FACEIT icon). The numeral is a plain flex `<span>` layered over the ring
 *  rather than SVG `<text>`: Satori (next/og's renderer) doesn't reliably support text inside
 *  `<svg>` — it hung/crashed the whole response in testing — so every other numeral in these cards
 *  goes through ordinary HTML-style text layout, and this one does too. */
export function LevelCrest({ level, size = 72 }: { level: number; size?: number }) {
	const clamped = Math.min(10, Math.max(1, Math.round(level)));
	const color = clamped >= 9 ? '#E4483C' : clamped >= 7 ? '#FF4B4B' : clamped >= 5 ? '#F77F00' : clamped >= 3 ? '#FFC115' : '#A9A9A9';
	return (
		<div style={{ display: 'flex', position: 'relative', width: size, height: size, flexShrink: 0 }}>
			<svg width={size} height={size} viewBox='0 0 24 24' style={{ display: 'flex', position: 'absolute', top: 0, left: 0 }}>
				<circle cx='12' cy='12' r='10' fill='#0a0a0a' stroke={color} strokeWidth='2' />
			</svg>
			<div style={{ display: 'flex', position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, alignItems: 'center', justifyContent: 'center' }}>
				<span style={{ display: 'flex', fontFamily: 'Roboto', fontWeight: 700, fontSize: size * 0.4, color }}>{clamped}</span>
			</div>
		</div>
	);
}
