import { NextRequest, NextResponse } from 'next/server';
import { Prisma } from '@prisma/client';
import { db } from '@/lib/db';
import { ContentError, blurbFromPlainText, deriveBlurb, parseContent } from './_lib/content';
import { requireContentManager } from './_lib/auth';
import { postInputSchema, readJsonBody } from './_lib/post-input';

const PAGE_SIZE = 20;

/**
 * GET /api/news?page=N — public feed, newest first, 20 per page.
 * POST /api/news — create an EditorJS post (requires `content:manage`).
 */
export async function GET(request: NextRequest) {
	try {
		const page = Math.max(1, Number.parseInt(request.nextUrl.searchParams.get('page') ?? '1', 10) || 1);
		const [total, posts] = await Promise.all([
			db.newsPost.count(),
			db.newsPost.findMany({
				orderBy: { publishedAt: 'desc' },
				skip: (page - 1) * PAGE_SIZE,
				take: PAGE_SIZE,
				select: {
					id: true,
					title: true,
					blurb: true,
					imageUrl: true,
					link: true,
					publishedAt: true,
					author: { select: { id: true, name: true, image: true } },
					_count: { select: { comments: true } },
				},
			}),
		]);
		return NextResponse.json({ posts, page, totalPages: Math.max(1, Math.ceil(total / PAGE_SIZE)) });
	} catch (error) {
		console.error('Error fetching news feed:', error);
		return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
	}
}

export async function POST(request: Request) {
	const auth = await requireContentManager();
	if (auth.error) return auth.error;

	const read = await readJsonBody(request);
	if ('error' in read) return NextResponse.json({ error: read.error }, { status: read.status });

	const parsed = postInputSchema.safeParse(read.body);
	if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message ?? 'Invalid post' }, { status: 400 });

	try {
		const content = parseContent(parsed.data.content);
		if (content.blocks.length === 0) return NextResponse.json({ error: 'Write something before publishing' }, { status: 400 });

		const blurb = parsed.data.blurb?.trim() ? blurbFromPlainText(parsed.data.blurb) : deriveBlurb(content);
		const post = await db.newsPost.create({
			data: {
				title: parsed.data.title,
				content: content as unknown as Prisma.InputJsonValue,
				blurb,
				imageUrl: parsed.data.imageUrl || null,
				isFeatured: parsed.data.isFeatured ?? false,
				authorId: auth.session.user.id,
			},
			select: { id: true },
		});
		return NextResponse.json({ post }, { status: 201 });
	} catch (error) {
		if (error instanceof ContentError) return NextResponse.json({ error: error.message }, { status: 400 });
		console.error('Error creating news post:', error);
		return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
	}
}
