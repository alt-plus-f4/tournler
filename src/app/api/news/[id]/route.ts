import { NextResponse } from 'next/server';
import { Prisma } from '@prisma/client';
import { db } from '@/lib/db';
import { deleteBlobsQuietly } from '@/lib/blob';
import { ContentError, NewsContent, blurbFromPlainText, deriveBlurb, parseContent } from '../_lib/content';
import { parseId, requireContentManager } from '../_lib/auth';
import { postInputSchema, readJsonBody } from '../_lib/post-input';
import { hasEditorContent } from '@/components/news/text';

type Params = { params: Promise<{ id: string }> };

/**
 * GET /api/news/:id — public post.
 * PATCH /api/news/:id — update title/content/blurb/cover/featured (requires `content:manage`).
 * DELETE /api/news/:id — delete the post and its comments (requires `content:manage`).
 */
export async function GET(_request: Request, { params }: Params) {
	const id = parseId((await params).id);
	if (id === null) return NextResponse.json({ error: 'Invalid news post ID' }, { status: 400 });

	try {
		const post = await db.newsPost.findUnique({
			where: { id },
			select: {
				id: true,
				title: true,
				blurb: true,
				content: true,
				imageUrl: true,
				link: true,
				isFeatured: true,
				publishedAt: true,
				updatedAt: true,
				author: { select: { id: true, name: true, image: true } },
				_count: { select: { comments: true } },
			},
		});
		if (!post) return NextResponse.json({ error: 'News post not found' }, { status: 404 });
		return NextResponse.json({ post });
	} catch (error) {
		console.error('Error fetching news post:', error);
		return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
	}
}

export async function PATCH(request: Request, { params }: Params) {
	const auth = await requireContentManager();
	if (auth.error) return auth.error;

	const id = parseId((await params).id);
	if (id === null) return NextResponse.json({ error: 'Invalid news post ID' }, { status: 400 });

	const read = await readJsonBody(request);
	if ('error' in read) return NextResponse.json({ error: read.error }, { status: read.status });

	const parsed = postInputSchema.safeParse(read.body);
	if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message ?? 'Invalid post' }, { status: 400 });

	try {
		const existing = await db.newsPost.findUnique({ where: { id }, select: { blurb: true, content: true, imageUrl: true } });
		if (!existing) return NextResponse.json({ error: 'News post not found' }, { status: 404 });

		const content = parseContent(parsed.data.content);
		if (content.blocks.length === 0) return NextResponse.json({ error: 'Write something before publishing' }, { status: 400 });

		// An untouched blurb that was auto-derived keeps tracking the first paragraph.
		let blurb: string | undefined;
		if (parsed.data.blurb !== undefined) {
			blurb = parsed.data.blurb.trim() ? blurbFromPlainText(parsed.data.blurb) : deriveBlurb(content);
		} else if (!existing.blurb || (hasEditorContent(existing.content) && existing.blurb === deriveBlurb(existing.content as unknown as NewsContent))) {
			blurb = deriveBlurb(content);
		}

		const imageUrl = parsed.data.imageUrl === undefined ? undefined : parsed.data.imageUrl || null;

		const post = await db.newsPost.update({
			where: { id },
			data: {
				title: parsed.data.title,
				content: content as unknown as Prisma.InputJsonValue,
				...(blurb !== undefined ? { blurb } : {}),
				...(imageUrl !== undefined ? { imageUrl } : {}),
				...(parsed.data.isFeatured !== undefined ? { isFeatured: parsed.data.isFeatured } : {}),
			},
			select: { id: true },
		});

		if (imageUrl !== undefined && existing.imageUrl && existing.imageUrl !== imageUrl) {
			await deleteBlobsQuietly([existing.imageUrl]);
		}

		return NextResponse.json({ post });
	} catch (error) {
		if (error instanceof ContentError) return NextResponse.json({ error: error.message }, { status: 400 });
		console.error('Error updating news post:', error);
		return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
	}
}

export async function DELETE(_request: Request, { params }: Params) {
	const auth = await requireContentManager();
	if (auth.error) return auth.error;

	const id = parseId((await params).id);
	if (id === null) return NextResponse.json({ error: 'Invalid news post ID' }, { status: 400 });

	try {
		const post = await db.newsPost.delete({ where: { id }, select: { imageUrl: true } }).catch((error: unknown) => {
			if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2025') return null;
			throw error;
		});
		if (!post) return NextResponse.json({ error: 'News post not found' }, { status: 404 });
		await deleteBlobsQuietly([post.imageUrl]);
		return NextResponse.json({ message: 'News post deleted' });
	} catch (error) {
		console.error('Error deleting news post:', error);
		return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
	}
}
