import { defineSchema, defineTable } from 'convex/server';
import { v } from 'convex/values';

export default defineSchema({
    notifications: defineTable({
        userId: v.string(),
        teamId: v.optional(v.number()),
        text: v.string(),
        type: v.number(),
        isRead: v.boolean(),
    }),
});