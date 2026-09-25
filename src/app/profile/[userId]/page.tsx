import type { Game } from '@prisma/client';
import { getAuthSession } from '@/lib/auth';
import { getRiotStatus } from '@/lib/riot/service';
import { getProfileUser, loadProfileExtras, type ProfileUser } from './_lib/load-profile';
import { ProfileNotFound, ProfileView, type PublicProfileData } from './_components/ProfileView';

function teamFor(user: ProfileUser, game: Game) {
	const team = user.teams.find((t) => t.game === game);
	return team ? { id: team.id, name: team.name, logo: team.logo, memberCount: team._count.members } : null;
}

/**
 * Server-rendered profile: the user row, stats, match history and FACEIT level are read directly
 * (no client-side fetch of /api/users/[slug] + /api/user after hydration). profile/loading.tsx
 * shows the skeleton while this resolves; ProfileView keeps all the interactivity.
 */
export default async function PublicProfilePage({ params }: { params: Promise<{ userId: string }> }) {
	const { userId } = await params;
	const [session, user] = await Promise.all([getAuthSession(), getProfileUser(decodeURIComponent(userId))]);
	if (!user) return <ProfileNotFound />;

	const isOwner = session?.user.id === user.id;
	const [[stats, recentMatches, faceit, lolRank, eventTrophies], riotStatus] = await Promise.all([loadProfileExtras(user), isOwner ? getRiotStatus(user.id) : Promise.resolve(undefined)]);

	// Hidden linked accounts never reach a visitor's payload; the owner still sees them (flagged as hidden).
	const steam = user.steam && (isOwner || user.showSteam) ? user.steam : null;
	const discord = user.discord && (isOwner || user.showDiscord) ? user.discord : null;
	// A Riot ID is public once verified (it's the in-game name) unless the owner hid it; a pending one is
	// only the owner's business regardless. The rank follows the same visibility.
	const riot = user.riot?.verifiedAt && (isOwner || user.showRiot) ? { gameName: user.riot.gameName, tagLine: user.riot.tagLine, region: user.riot.region } : null;
	const rank = riot ? lolRank : null;

	const teams = { CS2: teamFor(user, 'CS2'), LOL: teamFor(user, 'LOL') };
	// A game's section shows only if the player plays it: picked it in onboarding, or has its team/account.
	const plays = {
		CS2: user.games.includes('CS2') || !!teams.CS2 || !!user.steam,
		LOL: user.games.includes('LOL') || !!teams.LOL || !!user.riot?.verifiedAt || (isOwner && !!user.riot),
	};

	const profile: PublicProfileData = {
		id: user.id,
		name: user.name ?? '',
		bio: user.bio ?? undefined,
		image: user.image ?? undefined,
		steam: steam ? { steamId: steam.steamId, createdAt: steam.createdAt.toISOString() } : null,
		steamLinked: !!user.steam,
		discord,
		riot,
		teams,
		plays,
		badges: user.badges.map((b) => ({ ...b, awardedAt: b.awardedAt.toISOString() })),
		createdAt: user.createdAt.toISOString(),
	};

	return (
		<ProfileView
			profile={profile}
			stats={stats}
			recentMatches={recentMatches}
			faceit={faceit}
			lolRank={rank}
			eventTrophies={eventTrophies.map((t) => ({ ...t, wonAt: t.wonAt.toISOString() }))}
			isOwner={isOwner}
			visibility={isOwner ? { showDiscord: user.showDiscord, showSteam: user.showSteam, showRiot: user.showRiot } : undefined}
			riotStatus={riotStatus}
		/>
	);
}
