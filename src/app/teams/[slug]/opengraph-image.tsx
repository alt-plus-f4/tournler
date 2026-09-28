import { ImageResponse } from 'next/og';
import fetchTeam from '@/lib/helpers/fetch-team';
import { GAME_META } from '@/lib/games';
import { OG, CARD_SIZE, BrandRow, SectionLabel, Chip, LogoPlate, InitialsPlate, ScrimBackground, brandLogoSrc, remoteImageDataUri } from '@/lib/og/kit';
import { ogFontConfig } from '@/lib/og/fonts';

export const alt = 'Team preview';
export const size = CARD_SIZE;
export const contentType = 'image/png';

// Live data (score, roster, registration state); never serve a stale cached card.
export const dynamic = 'force-dynamic';

export default async function Image({ params }: { params: Promise<{ slug: string }> }) {
	const { slug } = await params;
	const id = Number.parseInt(slug, 10);
	const [data, logoSrc, fonts] = await Promise.all([Number.isNaN(id) ? Promise.resolve(null) : fetchTeam(id), brandLogoSrc(), ogFontConfig()]);
	const team = data?.team ?? null;

	if (!team) {
		return new ImageResponse(
			<div style={{ display: 'flex', width: '100%', height: '100%', backgroundColor: OG.stageBlack, alignItems: 'center', justifyContent: 'center' }}>
				<span style={{ fontFamily: 'Roboto', fontWeight: 900, fontSize: 56, color: OG.inkMuted, textTransform: 'uppercase' }}>Team not found</span>
			</div>,
			{ ...size, fonts },
		);
	}

	const captain = team.capitan;
	const [backgroundSrc, logoAssetSrc] = await Promise.all([remoteImageDataUri(team.background), remoteImageDataUri(team.logo)]);

	return new ImageResponse(
		<div style={{ display: 'flex', flexDirection: 'column', width: '100%', height: '100%', backgroundColor: OG.stageBlack, position: 'relative' }}>
			{backgroundSrc && <ScrimBackground src={backgroundSrc} />}
			<BrandRow logoSrc={logoSrc} />
			<div style={{ display: 'flex', position: 'absolute', top: 32, right: 48 }}>
				<Chip>{GAME_META[team.game].short}</Chip>
			</div>

			<div style={{ display: 'flex', flex: 1 }} />

			<div style={{ display: 'flex', flexDirection: 'column', gap: 20, padding: '0 56px 56px' }}>
				<div style={{ display: 'flex', alignItems: 'center', gap: 28 }}>
					{logoAssetSrc ? <LogoPlate src={logoAssetSrc} size={112} /> : <InitialsPlate name={team.name} size={112} />}
					<div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
						<span style={{ display: 'flex', fontFamily: 'Roboto', fontWeight: 900, fontSize: 56, color: OG.ink, textTransform: 'uppercase', letterSpacing: 1 }}>{team.name}</span>
						<SectionLabel>
							{team.members.length} {team.members.length === 1 ? 'player' : 'players'}
							{captain ? ` · Captain ${captain.name}` : ''}
						</SectionLabel>
					</div>
				</div>
			</div>
		</div>,
		{ ...size, fonts },
	);
}
