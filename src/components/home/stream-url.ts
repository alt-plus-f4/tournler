import { parseTwitchChannel, parseYouTubeId } from './rewatch-config';

export type StreamEmbed = { provider: 'youtube' | 'twitch'; id: string };

/**
 * Turns a match's stream link into something safe to embed. Only YouTube video links and a bare
 * twitch.tv/<channel> link are recognised — the iframe src is always built from the extracted id,
 * never from the URL itself. Anything else (other hosts, Twitch VODs/clips, YouTube channel pages)
 * returns null and is shown as a plain outbound link instead.
 */
export function parseStreamUrl(input: string): StreamEmbed | null {
	let url: URL;
	try {
		url = new URL(input.trim());
	} catch {
		return null;
	}
	if (url.protocol !== 'https:' && url.protocol !== 'http:') return null;

	const host = url.hostname.replace(/^(www\.|m\.)/, '');
	if (host === 'youtu.be' || host === 'youtube.com' || host === 'youtube-nocookie.com') {
		const id = parseYouTubeId(url.toString());
		return id ? { provider: 'youtube', id } : null;
	}
	if (host === 'twitch.tv') {
		const segments = url.pathname.split('/').filter(Boolean);
		if (segments.length !== 1) return null;
		if (['videos', 'directory', 'downloads', 'jobs', 'settings', 'subscriptions', 'turbo', 'store'].includes(segments[0].toLowerCase())) return null;
		const channel = parseTwitchChannel(segments[0]);
		return channel ? { provider: 'twitch', id: channel } : null;
	}
	return null;
}
