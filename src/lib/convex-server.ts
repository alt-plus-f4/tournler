import { ConvexHttpClient } from 'convex/browser';
import { api } from '../../convex/_generated/api';
import { SERVER_SUBJECT, signConvexToken } from './convex-auth';

/** Convex client acting as the Tournler server — the only identity allowed to create notifications. */
function serverClient() {
	const client = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!);
	client.setAuth(signConvexToken(SERVER_SUBJECT, 60).token);
	return client;
}

export async function notifyTeamInvite(userId: string, teamId: number, teamName: string) {
	await serverClient().mutation(api.notifications.createTeamInviteNotification, {
		text: `You have been invited to join the team ${teamName}.`,
		userId,
		teamId,
	});
}

export async function deleteUserNotifications(userId: string) {
	return await serverClient().mutation(api.notifications.deleteUserNotifications, { userId });
}
