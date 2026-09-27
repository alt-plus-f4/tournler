import { NextResponse } from 'next/server';
import { getAuthSession } from '@/lib/auth';
import { userHasPermission } from '@/lib/helpers/permissions';
import { getDashboardData } from '@/lib/admin/dashboard';

/**
 * GET /api/admin/dashboard
 * Consolidates everything the admin overview page needs into one request:
 * plain totals, the existing per-resource chart shapes (kept unchanged so
 * the dashboard's charts keep working as-is), and a merged recent-activity
 * feed. Gated on the coarse `admin:access` permission (same as the layout)
 * rather than per-resource permissions — this is read-only aggregate/overview
 * data, not the management capability itself, which the individual admin
 * pages still gate on their specific `*:manage` permission.
 */
export async function GET() {
	try {
		const session = await getAuthSession();
		if (!session) {
			return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
		}
		if (!(await userHasPermission(session.user.id, 'admin:access'))) {
			return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
		}

		return NextResponse.json(await getDashboardData());
	} catch (error) {
		console.error('Error fetching admin dashboard data:', error);
		return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
	}
}
