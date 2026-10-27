import Image from 'next/image';
import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import { TeamLogo } from '@/components/TeamLogo';
import { formatMoney } from '@/lib/helpers/format-money';
import { getStartLabel } from '@/components/tournament-tabs/schedule';
import { isOptimizable } from '@/lib/image-hosts';
import { cn } from '@/lib/utils';
import { buttonVariants } from '@/components/ui/button-variants';
import type { RankingRow, WeekDay } from '@/lib/home/standings';
import type { SeasonTournament, WeekMatch } from '@/lib/home/data';
import { Countdown, LocalClock } from './HomeClient';

export const FALLBACK_BANNER = '/info-image.png';

export const EYEBROW = 'text-xs font-bold uppercase tracking-[0.2em] text-muted-foreground';
export const PANEL = 'rounded-md border border-border bg-black';

export function Eyebrow({ children, className }: { children: React.ReactNode; className?: string }) {
	return <p className={cn(EYEBROW, className)}>{children}</p>;
}

export function SectionHead({ id, title, href, linkLabel = 'All' }: { id?: string; title: string; href?: string; linkLabel?: string }) {
	return (
		<div className='mb-4 flex items-center justify-between gap-4'>
			<h2 id={id} className='text-xl font-black uppercase tracking-wide text-white'>
				{title}
			</h2>
			{href && (
				<Link href={href} className='shrink-0 text-sm font-medium uppercase text-muted-foreground transition-colors hover:text-white'>
					{linkLabel}
				</Link>
			)}
		</div>
	);
}

export function StatStrip({ stats }: { stats: { teams: number; players: number; tournaments: number; matches: number } }) {
	const items = [
		['Teams', stats.teams],
		['Players', stats.players],
		['Tournaments', stats.tournaments],
		['Matches played', stats.matches],
	] as const;
	return (
		<dl className='grid grid-cols-2 gap-px overflow-hidden rounded-md border border-border bg-border lg:grid-cols-4'>
			{items.map(([label, value]) => (
				<div key={label} className='flex flex-col-reverse gap-1 bg-black px-4 py-3.5 sm:px-5'>
					<dt className='font-mono text-[10px] uppercase tracking-[0.12em] text-muted-foreground'>{label}</dt>
					<dd className='text-2xl font-black tabular-nums text-white sm:text-3xl'>{value.toLocaleString('en-US')}</dd>
				</div>
			))}
		</dl>
	);
}

/** Team ranking. Mobile hides the W-L column, as the mockup does. */
export function RankingTable({ rows, limit }: { rows: RankingRow[]; limit: number }) {
	if (rows.length === 0) {
		return <div className={cn(PANEL, 'px-4 py-6 text-sm text-muted-foreground sm:px-5')}>No completed matches yet. The ranking appears after the first results.</div>;
	}
	const grid = 'grid grid-cols-[28px_minmax(0,1fr)_56px] items-center gap-3 px-4 sm:grid-cols-[34px_minmax(0,1fr)_70px_70px] sm:gap-4 sm:px-5';
	return (
		<div className={cn(PANEL, 'overflow-hidden')}>
			<div className={cn(grid, 'h-9 bg-neutral-950 font-mono text-[10px] uppercase tracking-[0.12em] text-muted-foreground')} aria-hidden>
				<span>#</span>
				<span>Team</span>
				<span className='hidden text-right sm:block'>W-L</span>
				<span className='text-right'>Points</span>
			</div>
			<ol className='divide-y divide-border'>
				{rows.slice(0, limit).map((row, i) => (
					<li key={row.id}>
						<Link
							href={`/teams/${row.id}`}
							className={cn(grid, 'min-h-[60px] py-2.5 transition-colors hover:bg-white/[0.03] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring')}
						>
							<span className={cn('text-xl font-black tabular-nums', i < 3 ? 'text-white' : 'text-neutral-500')}>{i + 1}</span>
							<span className='flex min-w-0 items-center gap-3'>
								<TeamLogo src={row.logo} name={row.name} decorative size='sm' />
								<span className='min-w-0'>
									<span className='block truncate font-black uppercase tracking-wide text-white'>{row.name}</span>
									<span className='block truncate text-xs text-muted-foreground'>
										{row.played} played
										<span className='sm:hidden'>
											{' '}
											· {row.wins}-{row.losses}
										</span>
									</span>
								</span>
							</span>
							<span className='hidden text-right font-mono text-xs tabular-nums text-muted-foreground sm:block'>
								{row.wins}-{row.losses}
							</span>
							<span className='text-right font-mono text-base font-bold tabular-nums text-white'>{row.points}</span>
						</Link>
					</li>
				))}
			</ol>
		</div>
	);
}

function teamNames(match: WeekMatch) {
	return [match.teamA?.name ?? 'TBD', match.teamB?.name ?? 'TBD'] as const;
}

function StatePill({ status }: { status: WeekMatch['status'] }) {
	if (status === 'LIVE')
		return (
			<span className='inline-flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-[0.12em] text-white'>
				<span className='h-1.5 w-1.5 rounded-full bg-signal-live motion-safe:animate-pulse' aria-hidden /> Live
			</span>
		);
	if (status === 'PAUSED')
		return (
			<span className='inline-flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-[0.12em] text-signal-hold'>
				<span className='h-1.5 w-1.5 rounded-full bg-signal-hold' aria-hidden /> Paused
			</span>
		);
	if (status === 'COMPLETED') return <span className='text-[10px] font-bold uppercase tracking-[0.12em] text-muted-foreground'>Final</span>;
	return null;
}

function hasScore(status: WeekMatch['status']) {
	return status === 'LIVE' || status === 'PAUSED' || status === 'COMPLETED';
}

function MatchSlot({ match }: { match: WeekMatch }) {
	const showScore = hasScore(match.status);
	const [nameA, nameB] = teamNames(match);
	const rows = [
		{ side: match.teamA, name: nameA, score: match.scoreTeamA },
		{ side: match.teamB, name: nameB, score: match.scoreTeamB },
	];
	return (
		<Link
			href={`/matches/${match.id}`}
			className='flex flex-col gap-1.5 border-b border-border px-3 py-2.5 transition-colors last:border-b-0 hover:bg-white/[0.03] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring'
		>
			<span className='flex items-center justify-between gap-2 font-mono text-[10.5px] uppercase tracking-[0.1em] text-muted-foreground'>
				<LocalClock iso={match.matchDate.toISOString()} />
				<StatePill status={match.status} />
			</span>
			{rows.map((row, i) => (
				<span key={i} className='flex min-w-0 items-center gap-2 text-[13px] font-bold uppercase tracking-wide text-white'>
					<TeamLogo src={row.side?.logo} name={row.name} decorative size='xs' />
					<span className='min-w-0 flex-1 truncate'>{row.name}</span>
					{showScore && <span className='font-mono tabular-nums'>{row.score ?? 0}</span>}
				</span>
			))}
		</Link>
	);
}

function DayCard({ day }: { day: WeekDay<WeekMatch> }) {
	return (
		<section aria-label={`${day.label} ${day.date} ${day.month}`} className={cn('flex min-h-[120px] min-w-0 flex-col rounded-md border bg-black lg:min-h-[300px]', day.isToday ? 'border-white' : 'border-border')}>
			<h3 className='flex items-center justify-between border-b border-border px-3.5 py-3 text-[15px] font-black uppercase tracking-[0.1em] text-white'>
				<span>
					{day.label}
					{day.isToday && <span className='ml-2 rounded-sm bg-white px-1.5 py-0.5 align-middle text-[10px] font-bold tracking-[0.12em] text-black'>Today</span>}
				</span>
				<span className='font-mono text-[11px] font-normal tracking-[0.06em] text-muted-foreground'>
					{day.date} {day.month}
				</span>
			</h3>
			{day.matches.length > 0 ? (
				<div className='flex flex-col'>
					{day.matches.map((match) => (
						<MatchSlot key={match.id} match={match} />
					))}
				</div>
			) : (
				<p className='m-auto px-3.5 py-6 text-center text-[13px] text-muted-foreground'>No matches</p>
			)}
		</section>
	);
}

/** Mon-Fri as columns; Saturday and Sunday join as one compact column only when they hold matches. */
export function WeekGrid({ days }: { days: WeekDay<WeekMatch>[] }) {
	const weekdays = days.filter((d) => !d.isWeekend);
	const weekend = days.filter((d) => d.isWeekend);
	const showWeekend = weekend.some((d) => d.matches.length > 0);
	return (
		<div className={cn('grid grid-cols-1 gap-3 sm:grid-cols-2', showWeekend ? 'lg:grid-cols-[repeat(5,minmax(0,1fr))_minmax(0,0.85fr)]' : 'lg:grid-cols-5')}>
			{weekdays.map((day) => (
				<DayCard key={day.label} day={day} />
			))}
			{showWeekend && (
				<div className='flex min-w-0 flex-col gap-3 sm:col-span-2 sm:grid sm:grid-cols-2 lg:col-span-1 lg:flex'>
					{weekend
						.filter((d) => d.matches.length > 0 || d.isToday)
						.map((day) => (
							<DayCard key={day.label} day={day} />
						))}
				</div>
			)}
		</div>
	);
}

function dayWord(day: WeekDay<WeekMatch>, tomorrowIndex: boolean) {
	if (day.isToday) return 'Today';
	if (tomorrowIndex) return 'Tomorrow';
	return day.label;
}

/** Compact "this week" list: one row per match, day word, teams, then time or score. */
export function ThisWeekList({ days, limit = 7 }: { days: WeekDay<WeekMatch>[]; limit?: number }) {
	const todayIndex = days.findIndex((d) => d.isToday);
	const rows = days.flatMap((day, i) => day.matches.map((match) => ({ match, word: dayWord(day, todayIndex >= 0 && i === todayIndex + 1) })));
	if (rows.length === 0) {
		return <div className={cn(PANEL, 'px-4 py-6 text-sm text-muted-foreground sm:px-5')}>No matches this week.</div>;
	}
	return (
		<ul className={cn(PANEL, 'divide-y divide-border overflow-hidden')}>
			{rows.slice(0, limit).map(({ match, word }) => {
				const [a, b] = teamNames(match);
				return (
					<li key={match.id}>
						<Link
							href={`/matches/${match.id}`}
							className='grid min-h-14 grid-cols-[4.5rem_minmax(0,1fr)_auto] items-center gap-3 px-4 py-2.5 text-sm transition-colors hover:bg-white/[0.03] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring sm:px-5'
						>
							<span className='text-xs font-bold uppercase tracking-[0.12em] text-muted-foreground'>{word}</span>
							<span className='min-w-0 truncate font-bold uppercase tracking-wide text-white'>
								{a} <span className='font-normal normal-case text-muted-foreground'>vs</span> {b}
							</span>
							{hasScore(match.status) ? (
								<span className='flex items-center gap-2 font-mono text-xs tabular-nums text-white'>
									<StatePill status={match.status} />
									{match.scoreTeamA ?? 0}:{match.scoreTeamB ?? 0}
								</span>
							) : (
								<LocalClock iso={match.matchDate.toISOString()} className='font-mono text-xs tabular-nums text-neutral-300' />
							)}
						</Link>
					</li>
				);
			})}
		</ul>
	);
}

/** Horizontal strip of this week's matches (the mockup's score ticker). */
export function MatchTicker({ matches }: { matches: WeekMatch[] }) {
	if (matches.length === 0) return null;
	return (
		<ul className='flex gap-2.5 overflow-x-auto pb-3' aria-label='Matches this week'>
			{matches.map((match) => {
				const [a, b] = teamNames(match);
				const showScore = hasScore(match.status);
				return (
					<li key={match.id} className='shrink-0'>
						<Link
							href={`/matches/${match.id}`}
							className='flex min-h-[92px] min-w-[230px] flex-col gap-2 rounded-md border border-border bg-black px-3 py-2.5 transition-colors hover:border-neutral-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring'
						>
							<span className='flex items-center justify-between font-mono text-[10.5px] uppercase tracking-[0.1em] text-muted-foreground'>
								{match.status === 'SCHEDULED' ? <LocalClock iso={match.matchDate.toISOString()} /> : <StatePill status={match.status} />}
								<span>{match.tournament.game === 'LOL' ? 'LoL' : 'CS2'}</span>
							</span>
							{[
								[match.teamA, a, match.scoreTeamA],
								[match.teamB, b, match.scoreTeamB],
							].map(([side, name, score], i) => (
								<span key={i} className='flex items-center gap-2 text-[13px] font-bold uppercase tracking-wide text-white'>
									<TeamLogo src={(side as WeekMatch['teamA'])?.logo} name={name as string} decorative size='xs' />
									<span className='min-w-0 flex-1 truncate'>{name as string}</span>
									<span className='font-mono tabular-nums'>{showScore ? ((score as number | null) ?? 0) : '-'}</span>
								</span>
							))}
						</Link>
					</li>
				);
			})}
		</ul>
	);
}

export function RegistrationMeter({ registered, capacity }: { registered: number; capacity: number }) {
	const pct = capacity > 0 ? Math.min(100, Math.round((registered / capacity) * 100)) : 0;
	return (
		<div>
			<div className='mb-2 flex items-center justify-between text-xs'>
				<span className='text-muted-foreground'>Teams registered</span>
				<b className='font-mono tabular-nums text-white'>
					{registered} / {capacity}
				</b>
			</div>
			<div className='h-1.5 overflow-hidden rounded-full bg-neutral-800' role='progressbar' aria-valuemin={0} aria-valuemax={capacity} aria-valuenow={registered} aria-label='Teams registered'>
				<div className='h-full rounded-full bg-white' style={{ width: `${pct}%` }} />
			</div>
		</div>
	);
}

/** The season banner: the next open tournament with a countdown to its start, or a composed empty state. */
export function SeasonBanner({ tournament }: { tournament: SeasonTournament | null }) {
	if (!tournament) {
		return (
			<section aria-labelledby='season-heading' className='relative overflow-hidden rounded-lg border border-border bg-gradient-to-b from-neutral-900 to-black p-6 sm:p-10'>
				<div aria-hidden className='pointer-events-none absolute inset-0 bg-[radial-gradient(70%_120%_at_80%_0,rgba(255,255,255,0.08),transparent_60%)]' />
				<div className='relative max-w-2xl'>
					<Eyebrow className='mb-3.5'>School tournaments</Eyebrow>
					<h1 id='season-heading' className='text-4xl font-black uppercase tracking-wide text-white sm:text-6xl'>
						No tournament scheduled yet
					</h1>
					<p className='mt-4 max-w-[46ch] text-[15px] leading-relaxed text-muted-foreground'>The next tournament shows up here with a countdown and open team slots. Meanwhile, get your team ready.</p>
					<div className='mt-6 flex flex-wrap gap-3'>
						<Link href='/teams' className={cn(buttonVariants({ size: 'lg' }), 'font-bold')}>
							Find or create a team
						</Link>
						<Link href='/information#organizers' className={cn(buttonVariants({ variant: 'outline', size: 'lg' }))}>
							Organize a tournament
						</Link>
					</div>
				</div>
			</section>
		);
	}

	const banner = tournament.bannerUrl || FALLBACK_BANNER;
	const start = getStartLabel(tournament.startDate.toISOString(), tournament.status);
	const upcoming = tournament.status === 'UPCOMING' && tournament.startDate.getTime() > Date.now();
	const details = [start.value, tournament.location, tournament.prizePool != null ? `${formatMoney(tournament.prizePool)} prize` : null].filter(Boolean);

	return (
		<section aria-labelledby='season-heading' className='relative overflow-hidden rounded-lg border border-neutral-700 bg-gradient-to-b from-neutral-900 to-black'>
			<Image src={banner} alt='' fill priority sizes='(max-width: 1400px) 100vw, 1400px' unoptimized={!isOptimizable(banner)} className='object-cover opacity-20' />
			<div aria-hidden className='pointer-events-none absolute inset-0 bg-[radial-gradient(70%_120%_at_80%_0,rgba(255,255,255,0.08),transparent_60%)]' />
			<div className='relative grid items-end gap-6 p-6 sm:p-10 lg:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)] lg:gap-8'>
				<div>
					<Eyebrow className='mb-3.5'>{upcoming ? 'Next tournament' : tournament.status === 'ONGOING' ? 'Now playing' : 'Start pending'}</Eyebrow>
					<h1 id='season-heading' className='text-4xl font-black uppercase tracking-wide text-white sm:text-6xl'>
						{tournament.name}
					</h1>
					<p className='mt-4 max-w-[52ch] text-[15px] leading-relaxed text-muted-foreground'>{details.join(' · ')}</p>
					<div className='mt-6 flex flex-wrap gap-3'>
						<Link href={`/tournaments/${tournament.id}`} className={cn(buttonVariants({ size: 'lg' }), 'font-bold')}>
							{upcoming ? 'Register your team' : 'View tournament'}
						</Link>
						<Link href='/tournaments' className={cn(buttonVariants({ variant: 'outline', size: 'lg' }))}>
							All tournaments
						</Link>
					</div>
				</div>
				<div className='flex flex-col gap-4 rounded-md border border-neutral-700 bg-black/70 p-4 backdrop-blur-sm sm:p-5'>
					{upcoming ? (
						<>
							<Eyebrow>Starts in</Eyebrow>
							<Countdown target={tournament.startDate.toISOString()} />
						</>
					) : (
						<>
							<Eyebrow>Status</Eyebrow>
							<p className='text-xl font-black uppercase tracking-wide text-white'>{start.value}</p>
						</>
					)}
					<RegistrationMeter registered={tournament.registered} capacity={tournament.teamCapacity} />
				</div>
			</div>
		</section>
	);
}

/** Mockup's "tc hero" card for the week planner: banner, key facts and a register link. */
export function TournamentSpotlight({ tournament }: { tournament: SeasonTournament | null }) {
	if (!tournament) {
		return (
			<div className={cn(PANEL, 'flex min-h-[300px] flex-col justify-center gap-3 p-6')}>
				<Eyebrow>Next tournament</Eyebrow>
				<h3 className='text-2xl font-black uppercase tracking-wide text-white'>Nothing scheduled yet</h3>
				<p className='max-w-[42ch] text-sm text-muted-foreground'>Announced tournaments appear here with their start date and open team slots.</p>
				<Link href='/tournaments' className={cn(buttonVariants({ variant: 'outline' }), 'mt-2 w-fit')}>
					Browse tournaments
				</Link>
			</div>
		);
	}
	const banner = tournament.bannerUrl || FALLBACK_BANNER;
	const start = getStartLabel(tournament.startDate.toISOString(), tournament.status);
	const facts = [
		[start.label, start.value],
		['Teams', `${tournament.registered} / ${tournament.teamCapacity}`],
		['Prize', tournament.prizePool != null ? formatMoney(tournament.prizePool) : 'None'],
	];
	return (
		<div className={cn(PANEL, 'overflow-hidden')}>
			<div className='relative h-48 w-full bg-neutral-900 sm:h-60'>
				<Image src={banner} alt='' fill sizes='(max-width: 1024px) 100vw, 60vw' unoptimized={!isOptimizable(banner)} className='object-cover' />
				<div aria-hidden className='absolute inset-x-0 bottom-0 h-20 bg-gradient-to-t from-black to-transparent' />
			</div>
			<div className='space-y-4 p-4 sm:p-5'>
				<h3 className='text-2xl font-black uppercase tracking-wide text-white'>{tournament.name}</h3>
				<dl className='grid grid-cols-3 gap-2'>
					{facts.map(([label, value]) => (
						<div key={label} className='flex min-w-0 flex-col-reverse'>
							<dt className='truncate text-xs text-muted-foreground'>{label}</dt>
							<dd className='truncate text-sm font-bold text-white'>{value}</dd>
						</div>
					))}
				</dl>
				<div className='flex flex-wrap gap-3'>
					<Link href={`/tournaments/${tournament.id}`} className={cn(buttonVariants(), 'font-bold')}>
						{tournament.status === 'UPCOMING' ? 'Register your team' : 'View tournament'}
					</Link>
					<Link href='/information' className={buttonVariants({ variant: 'outline' })}>
						How it works
					</Link>
				</div>
			</div>
		</div>
	);
}

type NewsItem = { id: number; title: string; imageUrl: string | null; link: string | null; content: unknown; publishedAt: Date };

/** Compact announcement rows (image left, title and date right). */
export function NewsList({ posts }: { posts: NewsItem[] }) {
	if (posts.length === 0) return <div className={cn(PANEL, 'px-4 py-6 text-sm text-muted-foreground')}>No news yet. Check back soon.</div>;
	return (
		<ul className='space-y-3'>
			{posts.map((post) => {
				const href = post.content != null || !post.link ? `/news/${post.id}` : post.link;
				const external = /^https?:\/\//.test(href);
				const body = (
					<>
						<span className='relative h-20 w-[88px] shrink-0 overflow-hidden rounded-sm bg-neutral-900 sm:w-[110px]'>
							<Image src={post.imageUrl || FALLBACK_BANNER} alt='' fill sizes='110px' className='object-cover' />
						</span>
						<span className='min-w-0'>
							<span className='line-clamp-2 text-sm font-black uppercase tracking-wide text-white'>{post.title}</span>
							<span className='mt-1.5 block font-mono text-[11px] uppercase tracking-[0.06em] text-muted-foreground'>
								{post.publishedAt.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric', timeZone: 'UTC' })}
							</span>
							{external && <span className='sr-only'>(opens in a new tab)</span>}
						</span>
					</>
				);
				const cls = cn(PANEL, 'flex min-h-[106px] items-center gap-3.5 p-3 transition-colors hover:border-neutral-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring');
				return (
					<li key={post.id}>
						{external ? (
							<a href={href} target='_blank' rel='noopener noreferrer' className={cls}>
								{body}
							</a>
						) : (
							<Link href={href} className={cls}>
								{body}
							</Link>
						)}
					</li>
				);
			})}
		</ul>
	);
}

/** The organizer call-to-action. Links stay static so the page remains cacheable for every viewer. */
export function OrganizerCta({ className }: { className?: string }) {
	return (
		<section aria-labelledby='organizer-cta-heading' className={cn('flex flex-col gap-3 self-start rounded-md border border-neutral-600 bg-gradient-to-b from-neutral-900 to-black p-5 sm:p-6', className)}>
			<Eyebrow>Organizers</Eyebrow>
			<h2 id='organizer-cta-heading' className='text-2xl font-black uppercase tracking-wide text-white'>
				Run a tournament for your school
			</h2>
			<p className='text-sm text-muted-foreground'>Pick a format, open registration and let teams sign up. Brackets, match servers and results are handled for you.</p>
			<Link href='/information#organizers' className={cn(buttonVariants({ size: 'lg' }), 'mt-1 w-fit font-bold')}>
				Get started
				<ArrowRight aria-hidden />
			</Link>
		</section>
	);
}
