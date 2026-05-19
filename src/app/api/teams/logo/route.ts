import { NextResponse } from 'next/server';
import { getAuthSession } from '@/lib/auth';
import { db } from '@/lib/db';
import { put } from '@vercel/blob';

export async function POST(request: Request) {
	try {
		const session = await getAuthSession();
		if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

		const formData = await request.formData();
		const teamIdRaw = formData.get('teamId');
		const file = formData.get('logoFile');

		if (!teamIdRaw) return NextResponse.json({ error: 'Missing teamId' }, { status: 400 });

		const teamId = Number(teamIdRaw);
		if (Number.isNaN(teamId)) return NextResponse.json({ error: 'Invalid teamId' }, { status: 400 });

		const team = await db.cs2Team.findUnique({ where: { id: teamId }, include: { capitan: true } });
		if (!team) return NextResponse.json({ error: 'Team not found' }, { status: 404 });

		// Only allow captain or admins to update logo
		if (team.capitan?.id !== session.user.id) {
			// you could extend permission check here
			return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
		}

		if (!(file instanceof Blob)) return NextResponse.json({ error: 'Missing file' }, { status: 400 });

		const arrayBuffer = await file.arrayBuffer();
		const now = Date.now();
		const blob = await put(`logos/team-${teamId}-${now}.png`, arrayBuffer, {
			access: 'public',
			token: process.env.BLOB_READ_WRITE_TOKEN,
		});

		const updated = await db.cs2Team.update({ where: { id: teamId }, data: { logo: blob.url } });

		return NextResponse.json({ success: true, team: updated }, { status: 200 });
	} catch (error) {
		console.error('Error uploading team logo:', error);
		return NextResponse.json({ error: error instanceof Error ? error.message : 'Internal server error' }, { status: 500 });
	}
}
