/** Fields returned for a news comment everywhere it's read (API and the post page). */
export const commentSelect = {
	id: true,
	text: true,
	createdAt: true,
	author: { select: { id: true, name: true, image: true } },
} as const;
