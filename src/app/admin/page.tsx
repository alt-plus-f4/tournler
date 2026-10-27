import { Suspense } from 'react';
import Link from 'next/link';
import { Skeleton } from '@/components/ui/skeleton';
import { Trophy, UserCog, Users } from 'lucide-react';
import { AccessDenied } from '@/components/AccessDenied';
import { getAuthSession } from '@/lib/auth';
import { getDashboardData, type DashboardData } from '@/lib/admin/dashboard';
import { userHasPermission } from '@/lib/helpers/permissions';
import { AdminPage, AdminHeader, AdminEyebrow, AdminEmpty } from '@/components/admin/AdminPage';

// Live counts; never prerender.
export const dynamic = 'force-dynamic';

const ACTIVITY_ICON = { user: Users, team: UserCog, tournament: Trophy };

function timeAgo(isoDate: string): string {
	const seconds = Math.floor((Date.now() - new Date(isoDate).getTime()) / 1000);
	if (seconds < 60) return 'just now';
	const minutes = Math.floor(seconds / 60);
	if (minutes < 60) return `${minutes}m ago`;
	const hours = Math.floor(minutes / 60);
	if (hours < 24) return `${hours}h ago`;
	const days = Math.floor(hours / 24);
	if (days < 30) return `${days}d ago`;
	return new Date(isoDate).toLocaleDateString();
}

/**
 * Server-rendered admin overview (it used to fetch /api/admin/dashboard from the browser after
 * hydration). The heading paints first; the numbers stream in.
 */
export default async function AdminDashboard() {
	// The proxy already requires a staff role; this is the page-level check (same gate as the API).
	const session = await getAuthSession();
	const allowed = session ? await userHasPermission(session.user.id, 'admin:access') : false;
	if (!allowed) return <AccessDenied resource='the admin area' />;

	return (
		<AdminPage>
			<AdminHeader title='Dashboard' subtitle='Live counts across users, teams and tournaments.' />
			<Suspense fallback={<DashboardSkeleton />}>
				<DashboardBody />
			</Suspense>
		</AdminPage>
	);
}

function DashboardSkeleton() {
	return (
		<div role='status' aria-busy='true'>
			<span className='sr-only'>Loading dashboard…</span>
			<Skeleton className='mb-8 h-[184px] w-full bg-muted md:h-[88px]' />
			<div className='grid gap-8 lg:grid-cols-[1fr_1.4fr]'>
				<Skeleton className='h-64 w-full bg-muted' />
				<Skeleton className='h-64 w-full bg-muted' />
			</div>
		</div>
	);
}

async function DashboardBody() {
	let data: DashboardData;
	try {
		data = await getDashboardData();
	} catch (err) {
		console.error('Error fetching admin dashboard data:', err);
		return (
			<div role='alert' className='rounded-lg border border-signal-live/40 bg-card p-4'>
				<p className='font-medium text-foreground'>Couldn&apos;t load the dashboard.</p>
				<p className='text-sm text-muted-foreground'>Failed to load dashboard data. Reload the page to try again.</p>
			</div>
		);
	}

	const kpis = [
		{ label: 'Users', value: data.totals.users, href: '/admin/users' },
		{ label: 'Teams', value: data.totals.teams, href: '/admin/teams' },
		{ label: 'Tournaments', value: data.totals.tournaments, href: '/admin/tournaments' },
		{ label: 'Ongoing', value: data.totals.ongoingTournaments, href: '/admin/tournaments', live: data.totals.ongoingTournaments > 0 },
	];

	const breakdown = [
		{
			group: 'Users',
			href: '/admin/users',
			rows: [
				{ label: 'In a team', value: data.usersInTeam },
				{ label: 'Not in a team', value: data.usersNotInTeam },
			],
		},
		{
			group: 'Teams',
			href: '/admin/teams',
			rows: [
				{ label: 'Verified', value: data.verifiedTeams },
				{ label: 'Not full', value: data.notFullTeams },
			],
		},
		{
			group: 'Tournaments',
			href: '/admin/tournaments',
			rows: [
				{ label: 'Upcoming', value: data.upcoming },
				{ label: 'Ended', value: data.ended },
			],
		},
	];

	return (
		<>
			<dl className='mb-8 grid grid-cols-2 gap-3 md:grid-cols-4'>
				{kpis.map((kpi) => (
					<div key={kpi.label}>
						<Link
							href={kpi.href}
							className='flex flex-col gap-2 rounded-lg border border-border bg-card px-4 py-4 transition-colors hover:border-neutral-600 hover:bg-muted/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring'
						>
							<dt className='order-2 flex items-center gap-1.5 font-mono text-[10.5px] font-medium uppercase tracking-[0.14em] text-muted-foreground'>
								{kpi.live && <span aria-hidden className='h-1.5 w-1.5 rounded-full bg-signal-live' />}
								{kpi.label}
							</dt>
							<dd className='order-1 font-mono text-3xl font-extrabold tabular-nums text-foreground'>{kpi.value.toLocaleString()}</dd>
						</Link>
					</div>
				))}
			</dl>

			<div className='grid gap-8 lg:grid-cols-[1fr_1.4fr]'>
				<section aria-labelledby='breakdown-heading'>
					<AdminEyebrow id='breakdown-heading' className='mb-3'>
						Breakdown
					</AdminEyebrow>
					<div className='overflow-hidden rounded-lg border border-border bg-card'>
						<table className='w-full text-sm'>
							<tbody className='divide-y divide-border'>
								{breakdown.map((b) =>
									b.rows.map((row, i) => (
										<tr key={`${b.group}-${row.label}`}>
											{i === 0 && (
												<th scope='rowgroup' rowSpan={b.rows.length} className='border-r border-border px-4 py-3 text-left align-top font-medium'>
													<Link href={b.href} className='underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring'>
														{b.group}
													</Link>
												</th>
											)}
											<td className='px-4 py-3 text-neutral-300'>{row.label}</td>
											<td className='px-4 py-3 text-right font-mono tabular-nums'>{row.value.toLocaleString()}</td>
										</tr>
									)),
								)}
							</tbody>
						</table>
					</div>
				</section>

				<section aria-labelledby='activity-heading'>
					<AdminEyebrow id='activity-heading' className='mb-3'>
						Recent activity
					</AdminEyebrow>
					{data.recentActivity.length === 0 ? (
						<AdminEmpty>Nothing has been created yet.</AdminEmpty>
					) : (
						<ul className='divide-y divide-border overflow-hidden rounded-lg border border-border bg-card'>
							{data.recentActivity.map((item) => {
								const Icon = ACTIVITY_ICON[item.type];
								return (
									<li key={`${item.type}-${item.id}`}>
										<Link
											href={item.href}
											className='flex items-center gap-3 px-4 py-3 text-sm transition-colors hover:bg-muted/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring'
										>
											<Icon aria-hidden size='1em' className='shrink-0 text-muted-foreground' />
											<span className='flex-1 truncate'>{item.name}</span>
											<span className='rounded bg-muted px-2 py-1 font-mono text-[10.5px] font-semibold uppercase leading-none tracking-widest text-muted-foreground'>{item.type}</span>
											<span className='w-16 shrink-0 text-right font-mono text-xs tabular-nums text-muted-foreground'>{timeAgo(item.createdAt)}</span>
										</Link>
									</li>
								);
							})}
						</ul>
					)}
				</section>
			</div>
		</>
	);
}
