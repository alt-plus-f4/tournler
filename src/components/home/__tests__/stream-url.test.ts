import { parseStreamUrl } from '../stream-url';

describe('parseStreamUrl', () => {
	it('extracts a YouTube video id from watch, short and live links', () => {
		expect(parseStreamUrl('https://www.youtube.com/watch?v=z0rBsvbMapU')).toEqual({ provider: 'youtube', id: 'z0rBsvbMapU' });
		expect(parseStreamUrl('https://youtu.be/z0rBsvbMapU')).toEqual({ provider: 'youtube', id: 'z0rBsvbMapU' });
		expect(parseStreamUrl('https://www.youtube.com/live/z0rBsvbMapU')).toEqual({ provider: 'youtube', id: 'z0rBsvbMapU' });
	});

	it('extracts a Twitch channel from a plain channel link', () => {
		expect(parseStreamUrl('https://www.twitch.tv/some_caster')).toEqual({ provider: 'twitch', id: 'some_caster' });
	});

	it('does not embed Twitch VODs, clips or site pages', () => {
		expect(parseStreamUrl('https://www.twitch.tv/videos/123456789')).toBeNull();
		expect(parseStreamUrl('https://www.twitch.tv/some_caster/clip/AbCdEf')).toBeNull();
		expect(parseStreamUrl('https://www.twitch.tv/directory')).toBeNull();
	});

	it('does not embed unknown hosts or YouTube channel pages', () => {
		expect(parseStreamUrl('https://example.com/watch?v=z0rBsvbMapU')).toBeNull();
		expect(parseStreamUrl('https://www.youtube.com/@someone')).toBeNull();
		expect(parseStreamUrl('https://notyoutube.com/watch?v=z0rBsvbMapU')).toBeNull();
	});

	it('rejects non-http links and junk', () => {
		expect(parseStreamUrl('javascript:alert(1)')).toBeNull();
		expect(parseStreamUrl('z0rBsvbMapU')).toBeNull();
		expect(parseStreamUrl('')).toBeNull();
	});
});
