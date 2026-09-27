import { cache } from 'react';
import { db } from '@/lib/db';

/** Pending invitations for a team, read directly (it used to call GET /api/teams/[slug]/invites over HTTP). */
const fetchInvitedPlayers = cache(async function fetchInvitedPlayers(teamId: number) {
	const team = await db.cs2Team.findUnique({ where: { id: teamId }, select: { teamInvitations: true } });
	return { teamInvitations: team?.teamInvitations ?? [] };
});

export default fetchInvitedPlayers;
