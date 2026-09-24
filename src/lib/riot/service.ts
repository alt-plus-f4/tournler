import 'server-only';
import { z } from 'zod';
import { db } from '@/lib/db';
import { getAccountByRiotId, getDataDragonVersion, getSummonerByPuuid, profileIconUrl, riotApiConfigured, RiotApiError } from './client';
import { takeRiotAttempt } from './rate-limit';
import { isRiotPlatform, platformLabel, RIOT_PLATFORM_IDS, type RiotPlatform } from './regions';
import { RIOT_GAME_NAME_MAX, RIOT_GAME_NAME_MIN, RIOT_NOT_CONFIGURED_MESSAGE, RIOT_TAG_LINE_PATTERN, type RiotAccountView, type RiotStatusResponse } from './types';
import { CHALLENGE_TTL_MS, checkChallengeOpen, evaluateVerification, pickChallengeIcon } from './verification';

/**
 * Riot ID link + ownership verification for the session user. Routes stay thin: each function
 * returns either the new status or an error with the HTTP status to send. The PUUID only ever
 * comes from Riot's own API, never from the client.
 */

export type ServiceResult = { ok: true; status: 200; body: RiotStatusResponse } | { ok: false; status: number; error: string; retryAfter?: number };

export const linkRiotIdSchema = z.object({
	gameName: z
		.string()
		.trim()
		.min(RIOT_GAME_NAME_MIN, `Game name is at least ${RIOT_GAME_NAME_MIN} characters`)
		.max(RIOT_GAME_NAME_MAX, `Game name is at most ${RIOT_GAME_NAME_MAX} characters`),
	tagLine: z
		.string()
		.trim()
		.transform((s) => s.replace(/^#/, ''))
		.pipe(z.string().regex(RIOT_TAG_LINE_PATTERN, 'Tagline is 3–5 letters or numbers, without the #')),
	region: z.enum(RIOT_PLATFORM_IDS, { errorMap: () => ({ message: 'Pick your League region' }) }),
});

export type LinkRiotIdInput = z.infer<typeof linkRiotIdSchema>;

const ACCOUNT_SELECT = { userId: true, puuid: true, gameName: true, tagLine: true, region: true, verificationIconId: true, verificationExpiresAt: true, verifiedAt: true } as const;

type AccountRow = { gameName: string; tagLine: string; region: string; verificationIconId: number | null; verificationExpiresAt: Date | null; verifiedAt: Date | null };

export async function toRiotAccountView(row: AccountRow | null): Promise<RiotAccountView | null> {
	if (!row) return null;
	const open = row.verificationIconId !== null && row.verificationExpiresAt !== null;
	const version = open && !row.verifiedAt ? await getDataDragonVersion() : null;
	return {
		gameName: row.gameName,
		tagLine: row.tagLine,
		region: row.region,
		status: row.verifiedAt ? 'linked' : 'pending',
		challenge:
			open && !row.verifiedAt
				? { iconId: row.verificationIconId!, expiresAt: row.verificationExpiresAt!.toISOString(), iconUrl: version ? profileIconUrl(version, row.verificationIconId!) : null }
				: null,
	};
}

export async function getRiotStatus(userId: string): Promise<RiotStatusResponse> {
	const row = await db.riotAccount.findUnique({ where: { userId }, select: ACCOUNT_SELECT });
	return { configured: riotApiConfigured(), account: await toRiotAccountView(row) };
}

function riotFailure(error: unknown, notFound: string): ServiceResult {
	if (!(error instanceof RiotApiError)) throw error;
	switch (error.kind) {
		case 'not_configured':
			return { ok: false, status: 503, error: RIOT_NOT_CONFIGURED_MESSAGE };
		case 'not_found':
			return { ok: false, status: 404, error: notFound };
		case 'rate_limited':
			return { ok: false, status: 429, error: 'Riot is rate-limiting lookups right now. Try again in a minute.', retryAfter: error.retryAfter };
		case 'bad_key':
			console.error('Riot API key rejected (401/403). Dev keys expire every 24h.');
			return { ok: false, status: 502, error: 'Riot ID linking is temporarily unavailable. Try again later.' };
		case 'timeout':
			return { ok: false, status: 504, error: 'Riot’s servers didn’t answer in time. Try again.' };
		default:
			return { ok: false, status: 502, error: 'Couldn’t reach Riot’s servers. Try again.' };
	}
}

function rateLimited(userId: string): ServiceResult | null {
	const wait = takeRiotAttempt(userId);
	if (wait === null) return null;
	return { ok: false, status: 429, error: `Too many attempts. Try again in ${Math.ceil(wait / 60)} min.`, retryAfter: wait };
}

function isUniqueViolation(error: unknown) {
	return error instanceof Error && 'code' in error && (error as { code?: string }).code === 'P2002';
}

const TAKEN = 'This Riot ID is already linked to another Tournler account.';

/**
 * Resolve the Riot ID, refuse it if another user owns that PUUID, save it unverified and open an
 * icon challenge. Re-submitting the same, already verified account (e.g. a region or name fix)
 * keeps it verified: ownership of the PUUID was already proven.
 */
export async function linkRiotId(userId: string, input: LinkRiotIdInput, now: Date = new Date()): Promise<ServiceResult> {
	if (!riotApiConfigured()) return { ok: false, status: 503, error: RIOT_NOT_CONFIGURED_MESSAGE };
	const limited = rateLimited(userId);
	if (limited) return limited;
	const region = input.region as RiotPlatform;

	let resolved;
	try {
		resolved = await getAccountByRiotId(input.gameName, input.tagLine, region);
	} catch (error) {
		return riotFailure(error, `No Riot account is called ${input.gameName}#${input.tagLine}. Check the spelling and tagline.`);
	}

	const [owner, mine] = await Promise.all([
		db.riotAccount.findUnique({ where: { puuid: resolved.puuid }, select: { userId: true } }),
		db.riotAccount.findUnique({ where: { userId }, select: ACCOUNT_SELECT }),
	]);
	if (owner && owner.userId !== userId) return { ok: false, status: 409, error: TAKEN };

	let summoner;
	try {
		summoner = await getSummonerByPuuid(region, resolved.puuid);
	} catch (error) {
		return riotFailure(error, `${resolved.gameName}#${resolved.tagLine} has no League of Legends account on ${platformLabel(region)}. Check the region.`);
	}

	const samePuuid = mine?.puuid === resolved.puuid;
	const names = { puuid: resolved.puuid, gameName: resolved.gameName, tagLine: resolved.tagLine, region };
	const data =
		samePuuid && mine?.verifiedAt
			? { ...names, verificationIconId: null, verificationExpiresAt: null }
			: {
					...names,
					verificationIconId: pickChallengeIcon([summoner.profileIconId, samePuuid ? mine?.verificationIconId : null]),
					verificationExpiresAt: new Date(now.getTime() + CHALLENGE_TTL_MS),
					verifiedAt: null,
				};

	try {
		const row = await db.riotAccount.upsert({ where: { userId }, create: { userId, ...data }, update: data, select: ACCOUNT_SELECT });
		return { ok: true, status: 200, body: { configured: true, account: await toRiotAccountView(row) } };
	} catch (error) {
		if (isUniqueViolation(error)) return { ok: false, status: 409, error: TAKEN };
		throw error;
	}
}

/** Check the summoner's current icon against the open challenge. */
export async function verifyRiotId(userId: string, now: Date = new Date()): Promise<ServiceResult> {
	if (!riotApiConfigured()) return { ok: false, status: 503, error: RIOT_NOT_CONFIGURED_MESSAGE };
	const mine = await db.riotAccount.findUnique({ where: { userId }, select: ACCOUNT_SELECT });
	if (!mine) return { ok: false, status: 404, error: 'Link a Riot ID first.' };

	const closed = checkChallengeOpen(mine, now);
	if (closed?.result === 'already_verified') return { ok: true, status: 200, body: { configured: true, account: await toRiotAccountView(mine) } };
	if (closed) return { ok: false, status: 410, error: closed.result === 'expired' ? 'The 10 minutes ran out. Start again for a new icon.' : 'No verification in progress. Start again.' };

	const limited = rateLimited(userId);
	if (limited) return limited;
	if (!isRiotPlatform(mine.region)) return { ok: false, status: 410, error: 'Unknown region on file. Start again.' };

	let summoner;
	try {
		summoner = await getSummonerByPuuid(mine.region, mine.puuid);
	} catch (error) {
		return riotFailure(error, `No League of Legends account found on ${platformLabel(mine.region)}. Start again with the right region.`);
	}

	const outcome = evaluateVerification(mine, summoner.profileIconId, now);
	if (outcome.result === 'mismatch') {
		return { ok: false, status: 409, error: `Set profile icon #${outcome.expectedIconId} in the LoL client, then try again. Riot can take a minute to show the change.` };
	}
	const row = await db.riotAccount.update({ where: { userId }, data: { verifiedAt: now, verificationIconId: null, verificationExpiresAt: null }, select: ACCOUNT_SELECT });
	return { ok: true, status: 200, body: { configured: true, account: await toRiotAccountView(row) } };
}

export async function unlinkRiotId(userId: string): Promise<void> {
	await db.riotAccount.deleteMany({ where: { userId } });
}
