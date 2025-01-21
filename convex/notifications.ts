import { v } from 'convex/values';
import { mutation, query } from './_generated/server';

export const getNotifications = query({
	args: {},
	handler: async (ctx) => {
		return await ctx.db
			.query('notifications')
			.filter((q) => q.eq(q.field('isRead'), false))
			.order('desc')
			.take(10);
	},
});

export const getUserNotifications = query({
    args: { id: v.string() },
    handler: async (ctx, args) => {
        return await ctx.db
            .query('notifications')
            .filter((q) => q.eq(q.field('userId'), args.id))
			.filter((q) => q.eq(q.field('isRead'), false))
            .order('desc')
            .take(10);
    },
});

export const markNotificationAsRead = mutation({
	args: { id: v.id('notifications') },
	handler: async (ctx, args) => {
		const { id } = args;
		await ctx.db.patch(id, { isRead: true });
	},
});

export const markAllNotificationsAsRead = mutation({
    args: {},
    handler: async (ctx) => {
        const unreadNotifications = await ctx.db
            .query('notifications')
            .filter((q) => q.eq(q.field('isRead'), false))
            .order('desc')
            .collect();

        if(unreadNotifications.length > 0) {
            for(const notification of unreadNotifications) {
                await ctx.db.patch(notification._id, { isRead: true });
            }
        }
    },
});

export const createInfoNotification = mutation({
    args: { text: v.string(), userId: v.string() },
    handler: async (ctx, args) => {
        await ctx.db.insert('notifications', {
            text: args.text,
            userId: args.userId,
            isRead: false,
            type: 0,
        });
    },
});

export const createTeamInviteNotification = mutation({
    args: { text: v.string(), userId: v.string(), teamId: v.number() },
    handler: async (ctx, args) => {
        await ctx.db.insert('notifications', {
            text: args.text,
            userId: args.userId,
            teamId: args.teamId,
            isRead: false,
            type: 1,
        });
    },
});