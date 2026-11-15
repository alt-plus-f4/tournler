import type { ReactNode } from 'react';
import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import { getFleet, integrationConfig, measureDbLatency, SPARK_WEEKS, type OverviewData } from '@/lib/admin/overview';
import { Sparkline } from './Sparkline';

const fmt = (n: number) => n.toLocaleString('en-US');

const FORMAT_LABEL: Record<string, string> = {
	SINGLE_ELIMINATION: 'Single elim',
	DOUBLE_ELIMINATION: 'Double elim',
	ROUND_ROBIN: 'Round robin',
	SWISS: 'Swiss',
};

function timeAgo(date: Date): string {
	const seconds = Math.floor((Date.now() - date.getTime()) / 1000);
	if (seconds < 60) return 'just now';
	const minutes = Math.floor(seconds / 60);
	if (minutes < 60) return `${minutes}m ago`;
	const hours = Math.floor(minutes / 60);
	if (hours < 24) return `${hours}h ago`;
	const days = Math.floor(hours / 24);
	if (days < 30) return `${days}d ago`;
	return date.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
}

function timeUntil(date: Date): string {
	const minutes = Math.round((date.getTime() - Date.now()) / 60000);
	if (minutes <= 0) return 'now';
	if (minutes < 60) return `${minutes}m`;
	const hours = Math.floor(minutes / 60);
	if (hours < 24) return `${hours}h ${minutes % 60}m`;
	return `${Math.floor(hours / 24)}d ${hours % 24}h`;
}

const shortDate = (date: Date) => date.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', timeZone: 'UTC' });

/** Card with a Roboto Black uppercase title row. */
export function Panel({ id, title, aside, children, className }: { id: string; title: ReactNode; aside?: ReactNode; children: ReactNode; className?: string }) {
	return (
		<section aria-labelledby={id} className={cn('overflow-hidden rounded-xl border border-border bg-card', className)}>
			<div className='flex items-center justify-between gap-3 border-b border-border px-[18px] py-3.5'>
				<h2 id={id} className='flex items-center gap-2 text-[13px] font-black uppercase tracking-[0.1em]'>
					{title}
				</h2>
				{aside}
			</div>
			{children}
		</section>
	);
}

function PanelLink({ href, children }: { href: string; children: ReactNode }) {
	return (
		<Link
			href={href}
			className='inline-flex items-center gap-1 text-[13px] text-neutral-300 underline-offset-4 hover:text-foreground hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring'
		>
			{children}
			<ArrowRight aria-hidden size={13} />
		</Link>
	);
}

const rowClass = 'flex items-center gap-3 border-t border-border px-[18px] py-3 text-sm first:border-t-0';

// ── Needs attention ────────────────────────────────────────────────────────────────────────────

function AttentionCard({ href, title, detail, action, tone }: { href: string; title: string; detail: string; action: string; tone: 'bad' | 'warn' | 'neutral' }) {
	return (
		<Link
			href={href}
			className={cn(
				'flex min-w-[240px] flex-1 items-start gap-3 rounded-[10px] border bg-card px-4 py-3.5 transition-colors hover:bg-muted/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
				tone === 'bad' && 'border-signal-live/40',
				tone === 'warn' && 'border-signal-hold/40',
				tone === 'neutral' && 'border-border',
			)}
		>
			<span className='flex min-w-0 flex-col gap-0.5'>
				<strong className={cn('text-sm font-semibold', tone === 'bad' && 'text-signal-live', tone === 'warn' && 'text-signal-hold')}>{title}</strong>
				<span className='text-[13px] text-muted-foreground'>{detail}</span>
			</span>
			<span className='ml-auto whitespace-nowrap text-[13px] text-neutral-300'>{action} →</span>
		</Link>
	);
}

export function NextTournamentAttention({ data }: { data: OverviewData }) {
	const next = data.upcoming[0];
	if (!next) return null;
	return (
		<AttentionCard
			href={`/tournaments/${next.id}`}
			tone='neutral'
			title={`${next.name} starts in ${timeUntil(next.startDate)}`}
			detail={`${next.registered} of ${next.capacity} teams registered`}
			action='Open'
		/>
	);
}

export async function OfflineServersAttention() {
	const fleet = await getFleet();
	if (!fleet.ok) return <AttentionCard href='/admin/servers' tone='warn' title='Servers unreadable' detail='SERVER_SECRET_KEY is missing or changed' action='Servers' />;
	const offline = fleet.servers.filter((s) => !s.live.online);
	if (offline.length === 0) return null;
	const title = offline.length === 1 ? `${offline[0].id} is offline` : `${offline.length} servers offline`;
	const detail = offline.length === 1 ? (offline[0].live.reason ?? 'RCON did not answer') : offline.map((s) => s.id).join(', ');
	return <AttentionCard href='/admin/servers' tone='bad' title={title} detail={detail} action='Open servers' />;
}

// ── KPI tiles ──────────────────────────────────────────────────────────────────────────────────

function Kpi({ label, value, note, spark, href }: { label: string; value: number; note: ReactNode; spark?: number[]; href: string }) {
	return (
		<Link
			href={href}
			className='relative flex flex-col gap-2.5 overflow-hidden rounded-xl border border-border bg-card p-[18px] transition-colors hover:border-neutral-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring'
		>
			<span className='font-mono text-[11px] uppercase tracking-[0.08em] text-muted-foreground'>{label}</span>
			<span className='font-mono text-4xl leading-none tracking-tight tabular-nums text-foreground'>{fmt(value)}</span>
			<span className='relative z-10 text-xs text-muted-foreground'>{note}</span>
			{spark && <Sparkline values={spark} className='absolute bottom-4 right-4 hidden text-foreground sm:block' />}
		</Link>
	);
}

export function KpiTiles({ data }: { data: OverviewData }) {
	const { users, teams, matchesPlayed, live } = data.kpis;
	const spanNote = `${SPARK_WEEKS}-week trend`;
	return (
		<div className='grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4'>
			<Kpi
				label='Users'
				value={users.total}
				href='/admin/users'
				spark={users.weekly}
				note={
					<>
						<span className='font-mono text-foreground'>+{fmt(users.lastWeek)}</span> this week<span className='sr-only'> · {spanNote}</span>
					</>
				}
			/>
			<Kpi
				label='Teams'
				value={teams.total}
				href='/admin/teams'
				spark={teams.weekly}
				note={
					<>
						<span className='font-mono text-foreground'>+{fmt(teams.lastWeek)}</span> this week · {fmt(teams.fullRosters)} full rosters
					</>
				}
			/>
			<Kpi
				label='Matches played'
				value={matchesPlayed.total}
				href='/admin/matches'
				spark={matchesPlayed.weekly}
				note={
					<>
						<span className='font-mono text-foreground'>+{fmt(matchesPlayed.lastWeek)}</span> last 7 days
					</>
				}
			/>
			<Kpi
				label='Live now'
				value={live.live}
				href='/admin/matches'
				note={
					<>
						{live.paused > 0 && <>{fmt(live.paused)} paused · </>}
						{fmt(live.scheduled)} scheduled
					</>
				}
			/>
		</div>
	);
}

// ── Live matches ───────────────────────────────────────────────────────────────────────────────

export function LiveMatches({ data, serverNames }: { data: OverviewData; serverNames: Map<string, string> | null }) {
	const count = data.kpis.live.live + data.kpis.live.paused;
	return (
		<Panel
			id='admin-live'
			title={
				<>
					Live matches
					{count > 0 && <span className='rounded-full bg-signal-live/15 px-1.5 py-px font-mono text-[11px] font-medium tracking-normal text-signal-live'>{count}</span>}
				</>
			}
			aside={<PanelLink href='/admin/matches'>All matches</PanelLink>}
		>
			{data.liveMatches.length === 0 ? (
				<p className='px-[18px] py-8 text-center text-sm text-muted-foreground'>No matches are being played right now.</p>
			) : (
				<ul>
					{data.liveMatches.map((m) => {
						const server = m.serverKey ? (serverNames?.get(m.serverKey) ?? null) : null;
						return (
							<li key={m.id} className='border-t border-border first:border-t-0'>
								<Link
									href={`/matches/${m.id}`}
									className='flex flex-wrap items-center gap-x-3 gap-y-1 px-[18px] py-3 text-sm transition-colors hover:bg-muted/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring'
								>
									<span className='flex min-w-0 flex-1 items-center gap-3'>
										<strong className='min-w-0 flex-1 truncate text-right font-semibold'>{m.teamA}</strong>
										<span className='shrink-0 font-mono text-lg tabular-nums text-foreground'>
											{m.scoreA} – {m.scoreB}
										</span>
										<strong className='min-w-0 flex-1 truncate font-semibold'>{m.teamB}</strong>
									</span>
									<span className='flex shrink-0 items-center gap-2'>
										<span className={cn('font-mono text-[11px] font-semibold uppercase tracking-widest', m.status === 'LIVE' ? 'text-signal-live' : 'text-signal-hold')}>
											{m.status === 'LIVE' ? 'Live' : 'Paused'}
										</span>
										<span className='max-w-[180px] truncate font-mono text-xs text-muted-foreground'>{m.map ? `${m.map.name} · ${m.map.scoreA}–${m.map.scoreB}` : m.context}</span>
										{server && <span className='rounded-full border border-border px-1.5 py-px font-mono text-[11px] text-neutral-300'>{server}</span>}
									</span>
								</Link>
							</li>
						);
					})}
				</ul>
			)}
		</Panel>
	);
}

// ── Server fleet ───────────────────────────────────────────────────────────────────────────────

export async function ServerFleet() {
	const fleet = await getFleet();
	return (
		<Panel id='admin-fleet' title='Server fleet' aside={<PanelLink href='/admin/servers'>Manage</PanelLink>}>
			{!fleet.ok ? (
				<p className='px-[18px] py-8 text-center text-sm text-muted-foreground'>The server list could not be read. Check SERVER_SECRET_KEY.</p>
			) : fleet.servers.length === 0 ? (
				<p className='px-[18px] py-8 text-center text-sm text-muted-foreground'>No servers configured.</p>
			) : (
				<ul className='grid grid-cols-1 gap-2.5 p-3.5 sm:grid-cols-2'>
					{fleet.servers.map((s) => {
						const players = s.live.humans ?? 0;
						const max = s.live.maxPlayers ?? 0;
						const fill = s.live.online && max > 0 ? Math.min(100, Math.round((players / max) * 100)) : 0;
						const state = !s.live.online ? 'Offline' : s.match ? 'In match' : 'Idle';
						return (
							<li key={s.id} className='flex flex-col gap-2.5 rounded-[10px] border border-border bg-background p-3.5'>
								<div className='flex items-center gap-2'>
									<strong className='truncate font-mono text-[13px]'>{s.id}</strong>
									<span className={cn('ml-auto shrink-0 text-xs', s.live.online ? 'text-muted-foreground' : 'text-signal-live')}>{state}</span>
								</div>
								<div className='h-1 rounded-full bg-border' role='meter' aria-label={`${s.id} players`} aria-valuemin={0} aria-valuemax={max || 0} aria-valuenow={s.live.online ? players : 0}>
									<div className='h-full rounded-full bg-neutral-400' style={{ width: `${fill}%` }} />
								</div>
								<div className='flex justify-between gap-2 font-mono text-[11px] text-muted-foreground'>
									<span className='truncate'>{s.live.online ? (s.live.map ?? '—') : (s.live.reason ?? 'No answer')}</span>
									<span className='shrink-0'>{s.live.online && max > 0 ? `${players}/${max}` : '—'}</span>
								</div>
							</li>
						);
					})}
				</ul>
			)}
		</Panel>
	);
}

// ── Tournament pipeline ────────────────────────────────────────────────────────────────────────

export function TournamentPipeline({ data, canCreate }: { data: OverviewData; canCreate: boolean }) {
	const stages = [
		{ label: 'Upcoming', value: data.pipeline.UPCOMING, bar: 'bg-neutral-300' },
		{ label: 'Ongoing', value: data.pipeline.ONGOING, bar: 'bg-foreground' },
		{ label: 'Completed', value: data.pipeline.COMPLETED, bar: 'bg-neutral-600' },
	];
	const total = stages.reduce((sum, s) => sum + s.value, 0);
	return (
		<Panel id='admin-pipeline' title='Tournament pipeline' aside={<PanelLink href={canCreate ? '/admin/tournaments' : '/tournaments'}>Manage</PanelLink>}>
			<div className='flex gap-2 p-[18px]'>
				{stages.map((s) => (
					<div key={s.label} className='flex min-w-[72px] flex-col gap-2' style={{ flex: total > 0 ? Math.max(s.value, 1) : 1 }}>
						<div className={cn('h-2 rounded-[3px]', s.value > 0 ? s.bar : 'bg-border')} />
						<span className='flex justify-between gap-2 text-xs text-muted-foreground'>
							<span>{s.label}</span>
							<span className='font-mono text-foreground'>{fmt(s.value)}</span>
						</span>
					</div>
				))}
			</div>
			{data.upcoming.length === 0 ? (
				<p className='border-t border-border px-[18px] py-6 text-center text-sm text-muted-foreground'>No upcoming tournaments.</p>
			) : (
				<ul>
					{data.upcoming.map((t) => {
						const pct = t.capacity > 0 ? Math.min(100, Math.round((t.registered / t.capacity) * 100)) : 0;
						return (
							<li key={t.id} className={rowClass}>
								<span className='min-w-0 flex-1'>
									<Link
										href={`/tournaments/${t.id}`}
										className='block truncate font-semibold underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring'
									>
										{t.name}
									</Link>
									<span className='block text-xs text-muted-foreground'>
										Starts {shortDate(t.startDate)} · {FORMAT_LABEL[t.format] ?? t.format}
									</span>
								</span>
								<span className='w-[120px] shrink-0'>
									<span className='block h-1 rounded-full bg-border'>
										<span className='block h-full rounded-full bg-foreground' style={{ width: `${pct}%` }} />
									</span>
									<span className='mt-1 block text-right font-mono text-[11px] text-muted-foreground'>
										{t.registered}/{t.capacity} teams
									</span>
								</span>
							</li>
						);
					})}
				</ul>
			)}
		</Panel>
	);
}

// ── System status ──────────────────────────────────────────────────────────────────────────────

export async function SystemStatus({ includeServers }: { includeServers: boolean }) {
	const [latency, fleet] = await Promise.all([measureDbLatency(), includeServers ? getFleet() : Promise.resolve(null)]);
	const config = integrationConfig();
	const up = fleet?.ok ? fleet.servers.filter((s) => s.live.online).length : 0;
	const total = fleet?.ok ? fleet.servers.length : 0;

	const rows: { label: string; value: string; tone: 'ok' | 'warn' | 'bad' }[] = [
		{ label: 'Database', value: latency === null ? 'Unreachable' : `${latency} ms`, tone: latency === null ? 'bad' : 'ok' },
		...config.map((c) => ({ label: c.label, value: c.ok ? 'Configured' : 'Not set', tone: c.ok ? ('ok' as const) : ('warn' as const) })),
	];
	if (fleet) {
		rows.push(fleet.ok ? { label: 'Game servers', value: `${up} / ${total} up`, tone: up < total ? 'warn' : 'ok' } : { label: 'Game servers', value: 'Unreadable', tone: 'warn' });
	}
	const issues = rows.filter((r) => r.tone !== 'ok').length;

	return (
		<Panel
			id='admin-system'
			title='System'
			aside={
				issues > 0 ? (
					<span className='rounded-full bg-signal-hold/15 px-2 py-px font-mono text-[11px] text-signal-hold'>
						{issues} {issues === 1 ? 'issue' : 'issues'}
					</span>
				) : (
					<span className='font-mono text-[11px] uppercase tracking-widest text-muted-foreground'>All OK</span>
				)
			}
		>
			<dl>
				{rows.map((r) => (
					<div key={r.label} className='flex items-center gap-3 border-t border-border px-[18px] py-2.5 text-sm first:border-t-0'>
						<dt className='flex-1'>{r.label}</dt>
						<dd className={cn('font-mono text-xs', r.tone === 'ok' && 'text-muted-foreground', r.tone === 'warn' && 'text-signal-hold', r.tone === 'bad' && 'text-signal-live')}>{r.value}</dd>
					</div>
				))}
			</dl>
		</Panel>
	);
}

// ── Recent activity ────────────────────────────────────────────────────────────────────────────

const KIND_LABEL = { user: 'User', team: 'Team', tournament: 'Tournament', result: 'Result' } as const;

export function RecentActivity({ data }: { data: OverviewData }) {
	return (
		<Panel id='admin-activity' title='Recent activity'>
			{data.activity.length === 0 ? (
				<p className='px-[18px] py-8 text-center text-sm text-muted-foreground'>Nothing has happened yet.</p>
			) : (
				<ul>
					{data.activity.map((a) => (
						<li key={a.key} className='border-t border-border first:border-t-0'>
							<Link
								href={a.href}
								className='flex items-center gap-3 px-[18px] py-3 text-sm transition-colors hover:bg-muted/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring'
							>
								<span className='w-[78px] shrink-0 font-mono text-[10.5px] font-semibold uppercase tracking-widest text-muted-foreground'>{KIND_LABEL[a.kind]}</span>
								<span className='min-w-0 flex-1 truncate text-neutral-300'>
									<strong className='font-semibold text-foreground'>{a.subject}</strong> {a.text}
								</span>
								<span className='shrink-0 font-mono text-xs tabular-nums text-neutral-500'>{timeAgo(a.at)}</span>
							</Link>
						</li>
					))}
				</ul>
			)}
		</Panel>
	);
}

export function PanelSkeleton({ className }: { className?: string }) {
	return <Skeleton className={cn('w-full rounded-xl bg-muted', className)} />;
}
