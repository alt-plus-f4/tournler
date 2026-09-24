import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getAuthSession } from '@/lib/auth';
import { userHasPermission } from '@/lib/helpers/permissions';
import { FeaturedLayout, FeaturedSource } from '@prisma/client';
import { parseYouTubeId } from '@/components/home/rewatch-config';

const SETTINGS_ID = 1;
const MAX_TEXT = 120;
const MAX_URL = 2048;

type RewatchFields = {
	rewatchVideoId?: string | null;
	rewatchTitle?: string | null;
	rewatchTeamA?: string | null;
	rewatchTeamB?: string | null;
	rewatchTeamALogo?: string | null;
	rewatchTeamBLogo?: string | null;
};

const isBlank = (value: unknown) => value === null || (typeof value === 'string' && value.trim() === '');

function isHttpsUrl(value: string) {
	try {
		return new URL(value).protocol === 'https:';
	} catch {
		return false;
	}
}

/**
 * Validates the optional rewatch fields. Each is `undefined` (leave as-is), `null`/'' (clear back
 * to the built-in default VOD) or a value. rewatchVideoId accepts a bare id or any YouTube URL.
 */
function parseRewatch(body: Record<string, unknown>): { data: RewatchFields } | { error: string } {
	const data: RewatchFields = {};

	const video = body.rewatchVideoId;
	if (video !== undefined) {
		if (isBlank(video)) data.rewatchVideoId = null;
		else {
			const id = typeof video === 'string' ? parseYouTubeId(video) : null;
			if (!id) return { error: 'rewatchVideoId must be a YouTube video id or URL' };
			data.rewatchVideoId = id;
		}
	}

	for (const key of ['rewatchTitle', 'rewatchTeamA', 'rewatchTeamB'] as const) {
		const value = body[key];
		if (value === undefined) continue;
		if (isBlank(value)) data[key] = null;
		else if (typeof value === 'string' && value.trim().length <= MAX_TEXT) data[key] = value.trim();
		else return { error: `${key} must be text of at most ${MAX_TEXT} characters` };
	}

	for (const key of ['rewatchTeamALogo', 'rewatchTeamBLogo'] as const) {
		const value = body[key];
		if (value === undefined) continue;
		if (isBlank(value)) data[key] = null;
		else if (typeof value === 'string' && value.length <= MAX_URL && isHttpsUrl(value.trim())) data[key] = value.trim();
		else return { error: `${key} must be an https URL` };
	}

	return { data };
}

/**
 * GET /api/admin/homepage-settings — read the singleton homepage config, creating the
 * default row on first access.
 * PATCH /api/admin/homepage-settings — update featuredSource/featuredLayout, showForumPosts
 * (homepage "Forum" block) and the rewatch (homepage VOD) fields.
 * Gated on `content:manage`.
 */
export async function GET() {
	try {
		const session = await getAuthSession();
		if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
		if (!(await userHasPermission(session.user.id, 'content:manage'))) {
			return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
		}

		const settings = await db.homepageSettings.upsert({
			where: { id: SETTINGS_ID },
			update: {},
			create: { id: SETTINGS_ID },
		});

		return NextResponse.json({ settings });
	} catch (error) {
		console.error('Error fetching homepage settings:', error);
		return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
	}
}

export async function PATCH(request: Request) {
	try {
		const session = await getAuthSession();
		if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
		if (!(await userHasPermission(session.user.id, 'content:manage'))) {
			return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
		}

		const body = await request.json().catch(() => null);
		if (!body || typeof body !== 'object') return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
		const { featuredSource, featuredLayout, showForumPosts } = body;

		if (featuredSource !== undefined && !Object.values(FeaturedSource).includes(featuredSource)) {
			return NextResponse.json({ error: 'Invalid featuredSource' }, { status: 400 });
		}
		if (featuredLayout !== undefined && !Object.values(FeaturedLayout).includes(featuredLayout)) {
			return NextResponse.json({ error: 'Invalid featuredLayout' }, { status: 400 });
		}

		if (showForumPosts !== undefined && typeof showForumPosts !== 'boolean') {
			return NextResponse.json({ error: 'showForumPosts must be a boolean' }, { status: 400 });
		}

		const rewatch = parseRewatch(body);
		if ('error' in rewatch) return NextResponse.json({ error: rewatch.error }, { status: 400 });

		const changes = {
			...(featuredSource !== undefined ? { featuredSource } : {}),
			...(featuredLayout !== undefined ? { featuredLayout } : {}),
			...(showForumPosts !== undefined ? { showForumPosts } : {}),
			...rewatch.data,
		};

		const settings = await db.homepageSettings.upsert({
			where: { id: SETTINGS_ID },
			update: changes,
			create: { ...changes, id: SETTINGS_ID },
		});

		return NextResponse.json({ settings });
	} catch (error) {
		console.error('Error updating homepage settings:', error);
		return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
	}
}
