import { defineSchema, defineTable } from 'convex/server';
import { v } from 'convex/values';

export default defineSchema({
	notifications: defineTable({
		userId: v.string(),
		teamId: v.optional(v.number()),
		// Set on friend-request notifications (type 2) so Notifications.tsx knows who to accept/decline.
		fromUserId: v.optional(v.string()),
		text: v.string(),
		type: v.number(),
		isRead: v.boolean(),
	}).index('by_user', ['userId']),
});
