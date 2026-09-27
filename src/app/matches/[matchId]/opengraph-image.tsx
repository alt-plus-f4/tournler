import { ImageResponse } from 'next/og';
import { db } from '@/lib/db';
import { cachedQuery, REVALIDATE } from '@/lib/cache/cached-query';
import { GAME_META } from '@/lib/games';
import { OG, CARD_SIZE, BrandRow, TopRule, SectionLabel, StatusReadout, LogoPlate, InitialsPlate, brandLogoSrc, remoteImageDataUri } from '@/lib/og/kit';
import { ogFontConfig } from '@/lib/og/fonts';

export const alt = 'Match preview';
export const size = CARD_SIZE;
export const contentType = 'image/png';

// Live data (score, roster, registration state); never serve a stale cached card.
export const dynamic = 'force-dynamic';

const FORMAT_LABEL: Record<string, string> = { SINGLE_ELIMINATION: 'Single elimination', DOUBLE_ELIMINATION: 'Double elimination', ROUND_ROBIN: 'Round robin' };

const readMatchCard = cachedQuery(
	async (id: number) =>
		db.matches.findUnique({
			where: { id },
			select: {
				status: true,
				isPickup: true,
				scoreTeamA: true,
				scoreTeamB: true,
				winnerId: true,
				winnerSide: true,
				matchDate: true,
				bestOf: true,
				teamAName: true,
				teamBName: true,
				teamA: { select: { id: true, name: true, logo: true } },
				teamB: { select: { id: true, name: true, logo: true } },
				tournament: { select: { name: true, game: true, bestOf: true, format: true } },
			},
		}),
	['og-match-card'],
	{ tags: ['matches', 'teams', 'tournaments'], revalidate: REVALIDATE.live },
);
const getMatchCard = (id: number) => readMatchCard(id).catch(() => null);

function TeamSide({ name, logo, muted }: { name: string; logo: string | null; muted?: boolean }) {
	return (
		<div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 18, width: 320 }}>
			{logo ? <LogoPlate src={logo} size={108} /> : <InitialsPlate name={name} size={108} />}
			<span
				style={{
					display: 'flex',
					fontFamily: 'Roboto',
					fontWeight: 900,
					fontSize: 34,
					textAlign: 'center',
					textTransform: 'uppercase',
					letterSpacing: 1,
					color: muted ? OG.inkMuted : OG.ink,
					maxWidth: 320,
					textOverflow: 'ellipsis',
					overflow: 'hidden',
					whiteSpace: 'nowrap',
				}}
			>
				{name}
			</span>
		</div>
	);
}

export default async function Image({ params }: { params: Promise<{ matchId: string }> }) {
	const { matchId } = await params;
	const id = Number(matchId);
	const [match, logoSrc, fonts] = await Promise.all([Number.isInteger(id) && id > 0 ? getMatchCard(id) : Promise.resolve(null), brandLogoSrc(), ogFontConfig()]);

	if (!match) {
		return new ImageResponse(
			(
				<div style={{ display: 'flex', width: '100%', height: '100%', backgroundColor: OG.stageBlack, alignItems: 'center', justifyContent: 'center' }}>
					<span style={{ fontFamily: 'Roboto', fontWeight: 900, fontSize: 56, color: OG.inkMuted, textTransform: 'uppercase' }}>Match not found</span>
				</div>
			),
			{ ...size, fonts },
		);
	}

	const aName = match.teamA?.name ?? match.teamAName ?? 'TBD';
	const bName = match.teamB?.name ?? match.teamBName ?? 'TBD';
	const [aLogoSrc, bLogoSrc] = await Promise.all([remoteImageDataUri(match.teamA?.logo), remoteImageDataUri(match.teamB?.logo)]);
	const winnerIsA = match.status === 'COMPLETED' && (match.winnerId ? match.winnerId === match.teamA?.id : match.winnerSide === 'TEAM_A');
	const winnerIsB = match.status === 'COMPLETED' && (match.winnerId ? match.winnerId === match.teamB?.id : match.winnerSide === 'TEAM_B');
	const state: 'live' | 'paused' | 'neutral' = match.status === 'LIVE' ? 'live' : match.status === 'PAUSED' ? 'paused' : 'neutral';
	const stateLabel = match.status === 'LIVE' ? 'Live' : match.status === 'PAUSED' ? 'Paused' : match.status === 'COMPLETED' ? 'Final' : 'Scheduled';
	const bestOf = match.bestOf ?? match.tournament.bestOf;
	const when = match.matchDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', timeZone: 'UTC' });

	const centerContent =
		match.status === 'SCHEDULED' ? (
			<span style={{ display: 'flex', fontFamily: 'Roboto Mono', fontWeight: 700, fontSize: 40, color: OG.inkMuted }}>{when}</span>
		) : (
			<span style={{ display: 'flex', fontFamily: 'Roboto Mono', fontWeight: 700, fontSize: 96, color: OG.ink, fontVariantNumeric: 'tabular-nums' }}>
				{match.scoreTeamA ?? 0} : {match.scoreTeamB ?? 0}
			</span>
		);

	return new ImageResponse(
		(
			<div style={{ display: 'flex', flexDirection: 'column', width: '100%', height: '100%', backgroundColor: OG.stageBlack, position: 'relative' }}>
				<TopRule state={state} />
				<BrandRow logoSrc={logoSrc} />
				<div style={{ display: 'flex', position: 'absolute', top: 32, right: 48 }}>
					<StatusReadout state={state} label={stateLabel} />
				</div>

				<div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10, position: 'absolute', top: 148, left: 0, right: 0 }}>
					<SectionLabel>{match.isPickup ? 'Pickup match' : match.tournament.name}</SectionLabel>
					{!match.isPickup && (
						<span style={{ display: 'flex', fontFamily: 'Roboto', fontSize: 18, color: OG.inkMuted, textTransform: 'uppercase', letterSpacing: 1 }}>
							{GAME_META[match.tournament.game].short} · {FORMAT_LABEL[match.tournament.format] ?? match.tournament.format} · Best of {bestOf}
						</span>
					)}
				</div>

				<div style={{ display: 'flex', flex: 1, alignItems: 'center', justifyContent: 'center', gap: 64, paddingTop: 40 }}>
					<TeamSide name={aName} logo={aLogoSrc} muted={winnerIsB} />
					{centerContent}
					<TeamSide name={bName} logo={bLogoSrc} muted={winnerIsA} />
				</div>
			</div>
		),
		{ ...size, fonts },
	);
}
