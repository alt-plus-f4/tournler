import { ConvexError, v } from 'convex/values';
import { mutation, query, type MutationCtx, type QueryCtx } from './_generated/server';

// Must match SERVER_SUBJECT in src/lib/convex-auth.ts — the identity the Tournler server signs
// with. Only it may create or bulk-delete notifications; users only see and dismiss their own.
const SERVER_SUBJECT = 'tournler-server';

async function callerId(ctx: QueryCtx | MutationCtx) {
	const identity = await ctx.auth.getUserIdentity();
	return identity?.subject ?? null;
}

async function requireUser(ctx: QueryCtx | MutationCtx) {
	const id = await callerId(ctx);
	if (!id || id === SERVER_SUBJECT) throw new ConvexError('Not signed in');
	return id;
}

async function requireServer(ctx: MutationCtx) {
	if ((await callerId(ctx)) !== SERVER_SUBJECT) throw new ConvexError('Forbidden');
}

/** The signed-in user's 10 newest unread notifications. Signed-out callers get an empty list. */
export const getMyNotifications = query({
	args: {},
	handler: async (ctx) => {
		const userId = await callerId(ctx);
		if (!userId || userId === SERVER_SUBJECT) return [];
		return await ctx.db
			.query('notifications')
			.withIndex('by_user', (q) => q.eq('userId', userId))
			.filter((q) => q.eq(q.field('isRead'), false))
			.order('desc')
			.take(10);
	},
});

export const markNotificationAsRead = mutation({
	args: { id: v.id('notifications') },
	handler: async (ctx, { id }) => {
		const userId = await requireUser(ctx);
		const notification = await ctx.db.get(id);
		if (!notification || notification.userId !== userId) throw new ConvexError('Notification not found');
		await ctx.db.patch(id, { isRead: true });
	},
});

/** Marks everything read except team invites (type 1), which need an accept/deny answer. */
export const markAllMyNotificationsAsRead = mutation({
	args: {},
	handler: async (ctx) => {
		const userId = await requireUser(ctx);
		const unread = await ctx.db
			.query('notifications')
			.withIndex('by_user', (q) => q.eq('userId', userId))
			.filter((q) => q.and(q.eq(q.field('isRead'), false), q.neq(q.field('type'), 1)))
			.collect();
		for (const notification of unread) {
			await ctx.db.patch(notification._id, { isRead: true });
		}
	},
});

export const createInfoNotification = mutation({
	args: { text: v.string(), userId: v.string() },
	handler: async (ctx, { text, userId }) => {
		await requireServer(ctx);
		await ctx.db.insert('notifications', { text, userId, isRead: false, type: 0 });
	},
});

export const createTeamInviteNotification = mutation({
	args: { text: v.string(), userId: v.string(), teamId: v.number() },
	handler: async (ctx, { text, userId, teamId }) => {
		await requireServer(ctx);
		await ctx.db.insert('notifications', { text, userId, teamId, isRead: false, type: 1 });
	},
});

/** Account deletion: removes every notification addressed to the user. */
export const deleteUserNotifications = mutation({
	args: { userId: v.string() },
	handler: async (ctx, { userId }) => {
		await requireServer(ctx);
		const rows = await ctx.db
			.query('notifications')
			.withIndex('by_user', (q) => q.eq('userId', userId))
			.collect();
		for (const row of rows) {
			await ctx.db.delete(row._id);
		}
		return rows.length;
	},
});
