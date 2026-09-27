import { ImageResponse } from 'next/og';
import { getTournamentDetail } from '../queries';
import { GAME_META } from '@/lib/games';
import { OG, CARD_SIZE, BrandRow, TopRule, SectionLabel, Chip, LogoPlate, InitialsPlate, ScrimBackground, brandLogoSrc, remoteImageDataUri } from '@/lib/og/kit';
import { ogFontConfig } from '@/lib/og/fonts';

export const alt = 'Tournament preview';
export const size = CARD_SIZE;
export const contentType = 'image/png';

// Live data (score, roster, registration state); never serve a stale cached card.
export const dynamic = 'force-dynamic';

const FORMAT_LABEL: Record<string, string> = { SINGLE_ELIMINATION: 'Single elimination', DOUBLE_ELIMINATION: 'Double elimination', ROUND_ROBIN: 'Round robin' };

function registrationLabel(t: { status: string; startDate: Date; teamCapacity: number; teams: unknown[] }): string {
	const count = t.teams.length;
	const teams = `${count}/${t.teamCapacity} teams`;
	if (t.status === 'COMPLETED') return `Finished · ${teams}`;
	if (t.status === 'ONGOING') return `In progress · ${teams}`;
	if (t.startDate.getTime() <= Date.now()) return `Start pending · ${teams}`;
	if (count >= t.teamCapacity) return `Full · ${teams}`;
	return `Registration open · ${teams}`;
}

export default async function Image({ params }: { params: Promise<{ slug: string }> }) {
	const { slug } = await params;
	const id = Number.parseInt(slug, 10);
	const [tournament, logoSrc, fonts] = await Promise.all([Number.isNaN(id) ? Promise.resolve(null) : getTournamentDetail(id).catch(() => null), brandLogoSrc(), ogFontConfig()]);

	if (!tournament) {
		return new ImageResponse(
			<div style={{ display: 'flex', width: '100%', height: '100%', backgroundColor: OG.stageBlack, alignItems: 'center', justifyContent: 'center' }}>
				<span style={{ fontFamily: 'Roboto', fontWeight: 900, fontSize: 56, color: OG.inkMuted, textTransform: 'uppercase' }}>Tournament not found</span>
			</div>,
			{ ...size, fonts },
		);
	}

	const state: 'live' | 'paused' | 'neutral' = tournament.status === 'ONGOING' ? 'live' : 'neutral';
	const [bannerSrc, logoAssetSrc] = await Promise.all([remoteImageDataUri(tournament.bannerUrl), remoteImageDataUri(tournament.logoUrl)]);

	return new ImageResponse(
		<div style={{ display: 'flex', flexDirection: 'column', width: '100%', height: '100%', backgroundColor: OG.stageBlack, position: 'relative' }}>
			{bannerSrc && <ScrimBackground src={bannerSrc} />}
			<TopRule state={state} />
			<BrandRow logoSrc={logoSrc} />
			<div style={{ display: 'flex', position: 'absolute', top: 32, right: 48 }}>
				<Chip>{GAME_META[tournament.game].short}</Chip>
			</div>

			<div style={{ display: 'flex', flex: 1 }} />

			<div style={{ display: 'flex', flexDirection: 'column', gap: 20, padding: '0 56px 56px' }}>
				<div style={{ display: 'flex', alignItems: 'center', gap: 28 }}>
					{logoAssetSrc ? <LogoPlate src={logoAssetSrc} size={112} /> : <InitialsPlate name={tournament.name} size={112} />}
					<div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
						<span
							style={{
								display: 'flex',
								fontFamily: 'Roboto',
								fontWeight: 900,
								fontSize: 56,
								color: OG.ink,
								textTransform: 'uppercase',
								letterSpacing: 1,
								maxWidth: 900,
								textOverflow: 'ellipsis',
								overflow: 'hidden',
								whiteSpace: 'nowrap',
							}}
						>
							{tournament.name}
						</span>
						<SectionLabel>{FORMAT_LABEL[tournament.format] ?? tournament.format}</SectionLabel>
					</div>
				</div>
				<span style={{ display: 'flex', fontFamily: 'Roboto Mono', fontWeight: 700, fontSize: 24, color: OG.inkSoft }}>{registrationLabel(tournament)}</span>
			</div>
		</div>,
		{ ...size, fonts },
	);
}
