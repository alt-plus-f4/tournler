import { ImageResponse } from 'next/og';
import { getProfileUser } from './_lib/load-profile';
import { getFaceitInfo } from '@/lib/faceit';
import { OG, CARD_SIZE, BrandRow, LogoPlate, InitialsPlate, LevelCrest, brandLogoSrc, remoteImageDataUri } from '@/lib/og/kit';
import { ogFontConfig } from '@/lib/og/fonts';

export const alt = 'Player profile';
export const size = CARD_SIZE;
export const contentType = 'image/png';

// Live data (score, roster, registration state); never serve a stale cached card.
export const dynamic = 'force-dynamic';

export default async function Image({ params }: { params: Promise<{ userId: string }> }) {
	const { userId } = await params;
	const [user, logoSrc, fonts] = await Promise.all([getProfileUser(decodeURIComponent(userId)), brandLogoSrc(), ogFontConfig()]);

	if (!user) {
		return new ImageResponse(
			<div style={{ display: 'flex', width: '100%', height: '100%', backgroundColor: OG.stageBlack, alignItems: 'center', justifyContent: 'center' }}>
				<span style={{ fontFamily: 'Roboto', fontWeight: 900, fontSize: 56, color: OG.inkMuted, textTransform: 'uppercase' }}>Player not found</span>
			</div>,
			{ ...size, fonts },
		);
	}

	const name = user.name ?? 'Player';
	const team = user.teams.find((t) => t.game === 'CS2') ?? user.teams[0] ?? null;
	// FACEIT level is public FACEIT data (same rule the profile page itself follows) — real or absent, never fabricated.
	const [faceit, avatarSrc, teamLogoSrc] = await Promise.all([
		user.steam ? getFaceitInfo(user.steam.steamId).catch(() => null) : Promise.resolve(null),
		remoteImageDataUri(user.image),
		remoteImageDataUri(team?.logo),
	]);

	return new ImageResponse(
		<div style={{ display: 'flex', flexDirection: 'column', width: '100%', height: '100%', backgroundColor: OG.stageBlack, position: 'relative' }}>
			<BrandRow logoSrc={logoSrc} />

			<div style={{ display: 'flex', flex: 1, alignItems: 'center', gap: 48, padding: '0 72px' }}>
				{avatarSrc ? (
					// eslint-disable-next-line @next/next/no-img-element
					<img src={avatarSrc} width={220} height={220} alt='' style={{ display: 'flex', borderRadius: 999, objectFit: 'cover', border: `3px solid ${OG.hairline}`, flexShrink: 0 }} />
				) : (
					<div
						style={{
							display: 'flex',
							width: 220,
							height: 220,
							borderRadius: 999,
							backgroundColor: OG.panel,
							border: `3px solid ${OG.hairline}`,
							alignItems: 'center',
							justifyContent: 'center',
							flexShrink: 0,
						}}
					>
						<span style={{ display: 'flex', fontFamily: 'Roboto', fontWeight: 900, fontSize: 84, color: OG.inkMuted }}>{name.slice(0, 1).toUpperCase()}</span>
					</div>
				)}

				<div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
					<div style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
						<span
							style={{
								display: 'flex',
								fontFamily: 'Roboto',
								fontWeight: 900,
								fontSize: 64,
								color: OG.ink,
								textTransform: 'uppercase',
								letterSpacing: 1,
								maxWidth: 620,
								textOverflow: 'ellipsis',
								overflow: 'hidden',
								whiteSpace: 'nowrap',
							}}
						>
							{name}
						</span>
						{faceit && <LevelCrest level={faceit.level} size={56} />}
					</div>
					{team && (
						<div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
							{teamLogoSrc ? <LogoPlate src={teamLogoSrc} size={40} /> : <InitialsPlate name={team.name} size={40} />}
							<span style={{ display: 'flex', fontFamily: 'Roboto', fontWeight: 700, fontSize: 24, color: OG.inkSoft }}>{team.name}</span>
						</div>
					)}
				</div>
			</div>
		</div>,
		{ ...size, fonts },
	);
}
