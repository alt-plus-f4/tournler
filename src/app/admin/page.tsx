import { Suspense } from 'react';
import Link from 'next/link';
import { Plus } from 'lucide-react';
import { AccessDenied } from '@/components/AccessDenied';
import { getAuthSession } from '@/lib/auth';
import { userHasPermission } from '@/lib/helpers/permissions';
import { getOverviewData, type OverviewData } from '@/lib/admin/overview';
import { connectKey, loadPool } from '@/lib/admin/servers';
import { cn } from '@/lib/utils';
import { KpiTiles, LiveMatches, NextTournamentAttention, OfflineServersAttention, PanelSkeleton, RecentActivity, ServerFleet, SystemStatus, TournamentPipeline } from './_components/OverviewSections';

// Live counts; never prerender.
export const dynamic = 'force-dynamic';

const buttonBase =
	'inline-flex h-[38px] items-center gap-2 rounded-md px-4 text-sm font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background';

/**
 * Server-rendered admin overview. The heading paints first; the database-backed sections stream in
 * together (one cached query), and the RCON-backed server sections stream separately so a slow or
 * offline game server never holds up the rest of the page.
 */
export default async function AdminDashboard() {
	// The proxy already requires a session; this is the page-level check (same gate as the API).
	const session = await getAuthSession();
	const allowed = session ? await userHasPermission(session.user.id, 'admin:access') : false;
	if (!session || !allowed) return <AccessDenied resource='the admin area' />;

	const [canServers, canMatches, canTournaments] = await Promise.all([
		userHasPermission(session.user.id, 'servers:manage'),
		userHasPermission(session.user.id, 'matches:manage'),
		userHasPermission(session.user.id, 'tournaments:manage'),
	]);

	const today = new Date().toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', timeZone: 'UTC' });

	return (
		<div className='mx-4 mb-16 mt-8 flex max-w-[1240px] flex-col gap-5 md:mx-8'>
			<header className='flex flex-wrap items-end justify-between gap-4 pt-3'>
				<div className='flex flex-col gap-1.5'>
					<p className='font-mono text-xs uppercase tracking-[0.08em] text-muted-foreground'>{today}</p>
					<h1 className='text-4xl font-black uppercase leading-none tracking-wide md:text-[44px]'>Dashboard</h1>
				</div>
				{(canMatches || canTournaments) && (
					<div className='flex flex-wrap gap-2'>
						{canMatches && (
							<Link href='/admin/matches' className={cn(buttonBase, 'border border-neutral-700 text-foreground hover:border-neutral-400')}>
								Create match
							</Link>
						)}
						{canTournaments && (
							<Link href='/admin/tournaments?create=1' className={cn(buttonBase, 'bg-foreground text-background hover:bg-neutral-300')}>
								<Plus aria-hidden size={16} />
								New tournament
							</Link>
						)}
					</div>
				)}
			</header>

			<Suspense fallback={<OverviewSkeleton canServers={canServers} />}>
				<OverviewBody canServers={canServers} canTournaments={canTournaments} />
			</Suspense>
		</div>
	);
}

function OverviewSkeleton({ canServers }: { canServers: boolean }) {
	return (
		<div role='status' aria-busy='true' className='flex flex-col gap-5'>
			<span className='sr-only'>Loading dashboard…</span>
			<div className='grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4'>
				{[0, 1, 2, 3].map((i) => (
					<PanelSkeleton key={i} className='h-[124px]' />
				))}
			</div>
			<div className={cn('grid gap-4', canServers && 'lg:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)]')}>
				<PanelSkeleton className='h-64' />
				{canServers && <PanelSkeleton className='h-64' />}
			</div>
		</div>
	);
}

async function OverviewBody({ canServers, canTournaments }: { canServers: boolean; canTournaments: boolean }) {
	let data: OverviewData;
	try {
		data = await getOverviewData();
	} catch (err) {
		console.error('Error fetching admin overview data:', err instanceof Error ? err.message : 'unknown error');
		return (
			<div role='alert' className='rounded-xl border border-signal-live/40 bg-card p-4'>
				<p className='font-medium text-foreground'>Couldn&apos;t load the dashboard.</p>
				<p className='text-sm text-muted-foreground'>Failed to load dashboard data. Reload the page to try again.</p>
			</div>
		);
	}

	// Pool ids for the live-match server pills: read from config only (no RCON round trip).
	let serverNames: Map<string, string> | null = null;
	if (canServers) {
		const pool = await loadPool();
		if (pool.ok) serverNames = new Map(pool.pool.map((s) => [connectKey(s.ip, s.port), s.id]));
	}

	return (
		<>
			<section aria-label='Needs attention' className='flex flex-wrap gap-3 empty:hidden'>
				{canServers && (
					<Suspense fallback={null}>
						<OfflineServersAttention />
					</Suspense>
				)}
				<NextTournamentAttention data={data} />
			</section>

			<KpiTiles data={data} />

			<div className={cn('grid items-start gap-4', canServers && 'lg:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)]')}>
				<LiveMatches data={data} serverNames={serverNames} />
				{canServers && (
					<Suspense fallback={<PanelSkeleton className='h-64' />}>
						<ServerFleet />
					</Suspense>
				)}
			</div>

			<div className='grid items-start gap-4 lg:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)]'>
				<TournamentPipeline data={data} canCreate={canTournaments} />
				<Suspense fallback={<PanelSkeleton className='h-64' />}>
					<SystemStatus includeServers={canServers} />
				</Suspense>
			</div>

			<RecentActivity data={data} />
		</>
	);
}
