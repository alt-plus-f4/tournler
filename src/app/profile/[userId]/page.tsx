import { getAuthSession } from '@/lib/auth';
import { getProfileUser, loadProfileExtras } from './_lib/load-profile';
import { ProfileNotFound, ProfileView, type PublicProfileData } from './_components/ProfileView';

/**
 * Server-rendered profile: the user row, stats, match history and FACEIT level are read directly
 * (no client-side fetch of /api/users/[slug] + /api/user after hydration). profile/loading.tsx
 * shows the skeleton while this resolves; ProfileView keeps all the interactivity.
 */
export default async function PublicProfilePage({ params }: { params: Promise<{ userId: string }> }) {
	const { userId } = await params;
	const [session, user] = await Promise.all([getAuthSession(), getProfileUser(decodeURIComponent(userId))]);
	if (!user) return <ProfileNotFound />;

	const [stats, recentMatches, faceit] = await loadProfileExtras(user);

	const profile: PublicProfileData = {
		id: user.id,
		name: user.name ?? '',
		bio: user.bio ?? undefined,
		image: user.image ?? undefined,
		steam: user.steam ? { steamId: user.steam.steamId, createdAt: user.steam.createdAt.toISOString() } : null,
		discord: user.discord,
		cs2Team: user.cs2Team,
		badges: user.badges.map((b) => ({ ...b, awardedAt: b.awardedAt.toISOString() })),
		createdAt: user.createdAt.toISOString(),
	};

	return <ProfileView profile={profile} stats={stats} recentMatches={recentMatches} faceit={faceit} isOwner={session?.user.id === user.id} />;
}
