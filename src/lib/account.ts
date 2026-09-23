import { db } from '@/lib/db';
import { deleteBlobsQuietly } from '@/lib/blob';
import { deleteUserNotifications } from '@/lib/convex-server';

/** Deletion can't proceed without someone deciding what happens to data other people rely on. */
export class AccountDeletionBlockedError extends Error {}

/**
 * Deletes a user and everything that is only theirs, used by self-service deletion and the admin
 * route. Prisma emulates the cascades (relationMode = "prisma"), except where the schema says
 * Restrict: a captained team and organised tournaments, handled here first.
 */
export async function deleteUserAccount(userId: string) {
	const user = await db.user.findUnique({
		where: { id: userId },
		select: {
			id: true,
			image: true,
			_count: { select: { organizedTournaments: true, newsPosts: true } },
			cs2TeamCaptain: {
				select: {
					id: true,
					logo: true,
					cs2TournamentId: true,
					members: { where: { id: { not: userId } }, select: { id: true }, orderBy: { createdAt: 'asc' }, take: 1 },
					_count: { select: { matchesAsTeamA: true, matchesAsTeamB: true } },
				},
			},
		},
	});
	if (!user) return false;

	// Tournaments hold other teams' brackets and results; an organiser leaving mustn't erase them.
	if (user._count.organizedTournaments > 0) {
		throw new AccountDeletionBlockedError(`This account organises ${user._count.organizedTournaments} tournament(s). Delete them or ask an admin to reassign them first.`);
	}
	// News posts cascade with their author, so a staff account leaving would silently unpublish them.
	if (user._count.newsPosts > 0) {
		throw new AccountDeletionBlockedError(`This account wrote ${user._count.newsPosts} news post(s). Delete them or ask an admin to reassign them first.`);
	}

	const blobsToDelete: Array<string | null> = [user.image];
	const team = user.cs2TeamCaptain;

	await db.$transaction(async (tx) => {
		if (team) {
			const successor = team.members[0];
			const hasHistory = team._count.matchesAsTeamA + team._count.matchesAsTeamB > 0 || team.cs2TournamentId !== null;
			if (successor) {
				// Longest-standing remaining member takes over.
				await tx.cs2Team.update({ where: { id: team.id }, data: { capitanId: successor.id } });
			} else if (!hasHistory) {
				await tx.cs2Team.delete({ where: { id: team.id } });
				blobsToDelete.push(team.logo);
			} else {
				// Keep an empty team that has played, so past brackets and results stay intact.
				await tx.cs2Team.update({ where: { id: team.id }, data: { capitanId: null } });
			}
		}
		await tx.user.delete({ where: { id: userId } });
	});

	// Outside the transaction: these live in other systems and failures there are only logged.
	await deleteBlobsQuietly(blobsToDelete);
	await deleteUserNotifications(userId).catch((error) => console.error('Failed to delete Convex notifications for', userId, error));
	return true;
}

/** Everything Tournler stores about a user, for GDPR access/portability requests. OAuth tokens are left out. */
export async function exportUserData(userId: string) {
	const user = await db.user.findUnique({
		where: { id: userId },
		select: {
			id: true,
			email: true,
			emailVerified: true,
			name: true,
			bio: true,
			image: true,
			role: true,
			isOnboardingCompleted: true,
			createdAt: true,
			updatedAt: true,
			accounts: { select: { provider: true, providerAccountId: true, type: true, scope: true } },
			discord: { select: { discordId: true } },
			steam: { select: { steamId: true, createdAt: true } },
			cs2Team: { select: { id: true, name: true, logo: true } },
			cs2TeamCaptain: { select: { id: true, name: true } },
			cs2TeamInvitations: { select: { teamId: true, team: { select: { name: true } } } },
			organizedTournaments: { select: { id: true, name: true, startDate: true } },
			matchParticipations: { select: { matchId: true, side: true, isCaptain: true, joinedAt: true } },
			draftPicks: { select: { matchId: true, captainSide: true, order: true } },
			playerMatchStats: { select: { matchId: true, teamId: true, side: true, kills: true, deaths: true, assists: true } },
			badges: { select: { awardedAt: true, badge: { select: { name: true } } } },
			newsPosts: { select: { id: true, title: true, createdAt: true } },
		},
	});
	if (!user) return null;
	return { exportedAt: new Date().toISOString(), service: 'Tournler', user };
}
