import { NextResponse } from 'next/server';
import { put } from '@vercel/blob';
import { db } from '@/lib/db';
import { safeEqual } from '@/lib/helpers/safe-equal';

/**
 * POST /api/matches/[matchId]/demo
 *
 * Receives a recorded CS2 demo from MatchZy (`matchzy_demo_upload_url`, set dynamically per
 * match — see `src/lib/cs2/match-config.ts` — rather than the stale static value this project
 * used to have) once a map ends, and stores it via Vercel Blob.
 *
 * CAVEAT: MatchZy's demo-upload request shape (multipart field name vs. a raw binary body) was
 * not verified against a live server for the pinned version — this handles both a multipart
 * `demo`/`file` field and a raw binary body defensively. Also note demo files can be tens to
 * hundreds of MB; Vercel serverless functions have a request body size limit (4.5MB on the
 * default plan) that a real demo will likely exceed — this route works for local/self-hosted
 * Next.js but will need a direct-to-Blob upload flow (or a larger-body-limit plan) before it
 * can be relied on in a Vercel production deployment.
 */
export async function POST(request: Request, { params }: { params: Promise<{ matchId: string }> }) {
	try {
		const token = request.headers.get('x-game-server-token');
		const expectedToken = process.env.GAME_SERVER_TOKEN;
		if (!token || !expectedToken || !safeEqual(token, expectedToken)) {
			return NextResponse.json({ error: 'Invalid game server token' }, { status: 401 });
		}

		const { matchId } = await params;
		const id = Number.parseInt(matchId, 10);
		if (Number.isNaN(id)) return NextResponse.json({ error: 'Invalid match ID' }, { status: 400 });

		const match = await db.matches.findUnique({ where: { id } });
		if (!match) return NextResponse.json({ error: 'Match not found' }, { status: 404 });

		const contentType = request.headers.get('content-type') ?? '';
		let arrayBuffer: ArrayBuffer;

		if (contentType.includes('multipart/form-data')) {
			const formData = await request.formData();
			const file = formData.get('demo') ?? formData.get('file');
			if (!(file instanceof Blob)) return NextResponse.json({ error: 'Missing demo file' }, { status: 400 });
			arrayBuffer = await file.arrayBuffer();
		} else {
			arrayBuffer = await request.arrayBuffer();
		}

		if (arrayBuffer.byteLength === 0) {
			return NextResponse.json({ error: 'Empty demo upload' }, { status: 400 });
		}

		const blob = await put(`demos/match-${id}-${Date.now()}.dem`, arrayBuffer, {
			access: 'public',
			token: process.env.BLOB_READ_WRITE_TOKEN,
		});

		return NextResponse.json({ success: true, url: blob.url });
	} catch (error) {
		console.error('Error uploading match demo:', error);
		return NextResponse.json({ error: error instanceof Error ? error.message : 'Internal server error' }, { status: 500 });
	}
}
