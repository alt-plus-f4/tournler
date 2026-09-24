/**
 * Homepage rewatch (VOD) config. Admins can override every field via HomepageSettings
 * (/admin/featured); any field left null falls back to the built-in G2 vs HEROIC VOD so the
 * homepage always has something to watch out of the box.
 */
export type RewatchConfig = {
	videoId: string;
	title: string;
	teamA: string;
	teamB: string;
	teamALogo: string | null;
	teamBLogo: string | null;
};

export const DEFAULT_REWATCH: RewatchConfig = {
	videoId: 'z0rBsvbMapU',
	title: 'G2 vs HEROIC',
	teamA: 'G2',
	teamB: 'HEROIC',
	teamALogo: 'https://6q0iedxcfemxlbr8.public.blob.vercel-storage.com/logos/zFLwAELOD15BjJSDMMNBWQ-D3exi76MOTrjZtz0Xp7UEQBS1oWnUJ.png',
	teamBLogo: 'https://6q0iedxcfemxlbr8.public.blob.vercel-storage.com/logos/4S22uk_gnZTiQiI-hhH4yp-RbEJga6u2dwOsFnlHUwTBmI01XKtj0.png',
};

const VIDEO_ID = /^[A-Za-z0-9_-]{11}$/;

/**
 * Accepts a bare 11-char YouTube id or any common YouTube URL (watch?v=, youtu.be/, /embed/,
 * /live/, /shorts/) and returns the id, or null if nothing valid can be extracted.
 */
export function parseYouTubeId(input: string): string | null {
	const value = input.trim();
	if (VIDEO_ID.test(value)) return value;
	let url: URL;
	try {
		url = new URL(value.startsWith('http') ? value : `https://${value}`);
	} catch {
		return null;
	}
	const host = url.hostname.replace(/^(www\.|m\.)/, '');
	let candidate: string | null = null;
	if (host === 'youtu.be') candidate = url.pathname.slice(1).split('/')[0];
	else if (host === 'youtube.com' || host === 'youtube-nocookie.com') {
		candidate = url.searchParams.get('v') ?? url.pathname.match(/^\/(?:embed|live|shorts|v)\/([^/?#]+)/)?.[1] ?? null;
	}
	return candidate && VIDEO_ID.test(candidate) ? candidate : null;
}

type StoredRewatch = {
	rewatchVideoId: string | null;
	rewatchTitle: string | null;
	rewatchTeamA: string | null;
	rewatchTeamB: string | null;
	rewatchTeamALogo: string | null;
	rewatchTeamBLogo: string | null;
} | null;

export function resolveRewatch(settings: StoredRewatch): RewatchConfig {
	// A custom video with no custom teams shouldn't inherit the default VOD's G2/HEROIC labels.
	const customVideo = Boolean(settings?.rewatchVideoId);
	const teamA = settings?.rewatchTeamA || (customVideo ? '' : DEFAULT_REWATCH.teamA);
	const teamB = settings?.rewatchTeamB || (customVideo ? '' : DEFAULT_REWATCH.teamB);
	return {
		videoId: settings?.rewatchVideoId || DEFAULT_REWATCH.videoId,
		title: settings?.rewatchTitle || (teamA && teamB ? `${teamA} vs ${teamB}` : customVideo ? 'Match rewatch' : DEFAULT_REWATCH.title),
		teamA,
		teamB,
		teamALogo: settings?.rewatchTeamALogo || (customVideo ? null : DEFAULT_REWATCH.teamALogo),
		teamBLogo: settings?.rewatchTeamBLogo || (customVideo ? null : DEFAULT_REWATCH.teamBLogo),
	};
}
