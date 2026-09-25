import { Suspense } from 'react';
import Link from 'next/link';
import { Skeleton } from '@/components/ui/skeleton';
import { Trophy, UserCog, Users } from 'lucide-react';
import { AccessDenied } from '@/components/AccessDenied';
import { getAuthSession } from '@/lib/auth';
import { getDashboardData, type DashboardData } from '@/lib/admin/dashboard';
import { userHasPermission } from '@/lib/helpers/permissions';

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
		<div className='mx-4 mb-12 mt-12 max-w-6xl md:mx-12'>
			<h1 className='mb-6 text-2xl font-bold'>Dashboard</h1>
			<Suspense fallback={<DashboardSkeleton />}>
				<DashboardBody />
			</Suspense>
		</div>
	);
}

function DashboardSkeleton() {
	return (
		<div role='status' aria-busy='true'>
			<span className='sr-only'>Loading dashboard…</span>
			<Skeleton className='mb-8 h-[146px] w-full bg-muted md:h-[74px]' />
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
			<div role='alert' className='rounded-md border border-signal-live/40 p-4'>
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
		{ group: 'Users', href: '/admin/users', rows: [{ label: 'In a team', value: data.usersInTeam }, { label: 'Not in a team', value: data.usersNotInTeam }] },
		{ group: 'Teams', href: '/admin/teams', rows: [{ label: 'Verified', value: data.verifiedTeams }, { label: 'Not full', value: data.notFullTeams }] },
		{ group: 'Tournaments', href: '/admin/tournaments', rows: [{ label: 'Upcoming', value: data.upcoming }, { label: 'Ended', value: data.ended }] },
	];

	return (
		<>
			<dl className='mb-8 grid grid-cols-2 divide-x divide-y divide-border rounded-md border border-border md:grid-cols-4 md:divide-y-0'>
				{kpis.map((kpi) => (
					<div key={kpi.label} className='relative'>
						<Link href={kpi.href} className='block p-4 transition-colors hover:bg-muted/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring'>
							<dt className='flex items-center gap-1.5 text-xs font-bold uppercase tracking-widest text-muted-foreground'>
								{kpi.live && <span aria-hidden className='h-1.5 w-1.5 rounded-full bg-signal-live' />}
								{kpi.label}
							</dt>
							<dd className='mt-1 font-mono text-2xl tabular-nums text-foreground'>{kpi.value.toLocaleString()}</dd>
						</Link>
					</div>
				))}
			</dl>

			<div className='grid gap-8 lg:grid-cols-[1fr_1.4fr]'>
				<section aria-labelledby='breakdown-heading'>
					<h2 id='breakdown-heading' className='mb-3 text-xs font-bold uppercase tracking-widest text-muted-foreground'>
						Breakdown
					</h2>
					<div className='overflow-hidden rounded-md border border-border'>
						<table className='w-full text-sm'>
							<tbody className='divide-y divide-border'>
								{breakdown.map((b) =>
									b.rows.map((row, i) => (
										<tr key={`${b.group}-${row.label}`}>
											{i === 0 && (
												<th scope='rowgroup' rowSpan={b.rows.length} className='border-r border-border px-3 py-2 text-left align-top font-medium'>
													<Link href={b.href} className='underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring'>
														{b.group}
													</Link>
												</th>
											)}
											<td className='px-3 py-2 text-neutral-300'>{row.label}</td>
											<td className='px-3 py-2 text-right font-mono tabular-nums'>{row.value.toLocaleString()}</td>
										</tr>
									)),
								)}
							</tbody>
						</table>
					</div>
				</section>

				<section aria-labelledby='activity-heading'>
					<h2 id='activity-heading' className='mb-3 text-xs font-bold uppercase tracking-widest text-muted-foreground'>
						Recent activity
					</h2>
					{data.recentActivity.length === 0 ? (
						<p className='rounded-md border border-border p-4 text-sm text-muted-foreground'>Nothing has been created yet.</p>
					) : (
						<ul className='divide-y divide-border rounded-md border border-border'>
							{data.recentActivity.map((item) => {
								const Icon = ACTIVITY_ICON[item.type];
								return (
									<li key={`${item.type}-${item.id}`}>
										<Link href={item.href} className='flex items-center gap-3 px-3 py-2 text-sm transition-colors hover:bg-muted/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring'>
											<Icon aria-hidden size='1em' className='shrink-0 text-muted-foreground' />
											<span className='flex-1 truncate'>{item.name}</span>
											<span className='text-xs uppercase tracking-widest text-muted-foreground'>{item.type}</span>
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
