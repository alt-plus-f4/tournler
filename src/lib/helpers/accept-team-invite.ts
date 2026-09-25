interface AcceptTeamInviteParams {
	userId: string;
	teamId: number;
}

/**
 * Accept a team invite. Throws with the server's message when it's refused (already on a team of
 * that game, team full, invite gone), so callers don't report success for a join that didn't happen.
 */
export async function acceptTeamInvite(params: AcceptTeamInviteParams): Promise<void> {
	const { userId, teamId } = params;
	const response = await fetch('/api/user/accept-invite', {
		method: 'POST',
		headers: { 'Content-Type': 'application/json' },
		body: JSON.stringify({ userId, teamId }),
	});
	if (!response.ok) {
		const data = await response.json().catch(() => ({}));
		throw new Error(data.message || 'Failed to accept team invitation');
	}
}
