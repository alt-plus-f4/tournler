import { Suspense } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import { TeamLogo } from '@/components/TeamLogo';
import { GameGlyph, GameTag } from '@/components/games/GameMark';
import type { LiveMatch } from '@/components/OnAirPanel';
import { buttonVariants } from '@/components/ui/button-variants';
import { GAME_ACCENT, GAME_META } from '@/lib/games';
import { formatMoney } from '@/lib/helpers/format-money';
import { isOptimizable } from '@/lib/image-hosts';
import { cn } from '@/lib/utils';
import { bucketWeek } from '@/lib/home/standings';
import {
	getCuratedFeaturedTournaments,
	getCurrentWeekMatches,
	getFallbackFeaturedTournaments,
	getFeaturedNews,
	getHomepageSettings,
	getSeasonTournament,
	getTeamRanking,
	type SeasonTournament,
} from '@/lib/home/data';
import { getLive } from './blocks';
import { FALLBACK_BANNER } from './parts';
import { ModernCountdown, ModernWeekTabs } from './ModernClient';
import { buildWeekTabs, formatLabel, tournamentBadge, type TournamentBadge } from './modern-helpers';
import { ModernFeaturedSkeleton, ModernNewsSkeleton, ModernWeekSkeleton, RankingSkeleton } from './skeletons';

// MODERN ("Classic redesign"): on-air strip, a full-bleed next-tournament hero with a countdown,
// this week's matches beside the standings, featured tournaments (one large, two stacked) and news
// (a lead story plus a list). Same rules as the other layouts: no per-viewer data, each streamed
// section in its own Suspense boundary, the hero (LCP image) awaited up front.

const H2 = 'text-3xl font-black uppercase tracking-wide text-white sm:text-4xl';
const LBL = 'font-mono text-xs uppercase tracking-[0.08em] text-muted-foreground';
const WRAP = 'mx-auto w-full max-w-[1280px] px-4 sm:px-8';

function SectionHead({ id, title, href, linkLabel, aside }: { id: string; title: string; href?: string; linkLabel?: string; aside?: React.ReactNode }) {
	return (
		<div className='flex items-baseline justify-between gap-4'>
			<h2 id={id} className={H2}>
				{title}
			</h2>
			{href && (
				<Link href={href} className='inline-flex shrink-0 items-center gap-1 text-sm font-medium text-neutral-300 transition-colors hover:text-white'>
					{linkLabel}
					<ArrowRight className='h-3.5 w-3.5' aria-hidden />
				</Link>
			)}
			{aside}
		</div>
	);
}

/* ---------- On air strip ---------- */

function sideNames(match: LiveMatch): [string, string] {
	if (match.isPickup) return [match.teamAName || 'Side A', match.teamBName || 'Side B'];
	return [match.teamA?.name ?? 'TBD', match.teamB?.name ?? 'TBD'];
}

function mapLabel(mapName: string) {
	return mapName.replace(/^de_/, '').replace(/^\w/, (c) => c.toUpperCase());
}

/** Plain red "ON AIR" text (no dots), then each live match as teams around a boxed score. Null when nothing is live. */
function OnAirStrip({ matches }: { matches: LiveMatch[] }) {
	if (matches.length === 0) return null;
	return (
		<section aria-labelledby='modern-on-air' className='border-b border-border bg-card'>
			<div className={cn(WRAP, 'flex flex-wrap items-center gap-x-6 gap-y-3 py-3')}>
				<h2 id='modern-on-air' className='font-mono text-xs font-semibold tracking-[0.1em] text-signal-live'>
					ON AIR
				</h2>
				<ul className='flex min-w-0 flex-wrap items-center gap-x-6 gap-y-2'>
					{matches.slice(0, 3).map((match) => {
						const [a, b] = sideNames(match);
						const map = match.maps[0];
						const meta = [GAME_META[match.tournament.game].short, map ? mapLabel(map.mapName) : match.tournament.name].join(' · ');
						return (
							<li key={match.id} className='min-w-0'>
								<Link href={`/matches/${match.id}`} className='flex min-w-0 items-center gap-3 text-sm text-white transition-colors hover:text-neutral-300'>
									<span className='truncate font-bold uppercase tracking-wide'>{a}</span>
									<span
										className='shrink-0 rounded-md border border-neutral-800 bg-neutral-900 px-2.5 py-0.5 font-mono text-[15px] tabular-nums'
										aria-label={`${match.scoreTeamA ?? 0} to ${match.scoreTeamB ?? 0}`}
									>
										{match.scoreTeamA ?? 0} : {match.scoreTeamB ?? 0}
									</span>
									<span className='truncate font-bold uppercase tracking-wide'>{b}</span>
									{match.status === 'PAUSED' && <span className='font-mono text-[11px] font-semibold tracking-[0.08em] text-signal-hold'>PAUSED</span>}
									<span className={cn(LBL, 'hidden text-[11px] md:inline')}>{meta}</span>
								</Link>
							</li>
						);
					})}
				</ul>
				<Link href='/matches' className='ml-auto inline-flex items-center gap-1 text-[13px] font-medium text-neutral-300 transition-colors hover:text-white'>
					All live matches
					<ArrowRight className='h-3.5 w-3.5' aria-hidden />
				</Link>
			</div>
		</section>
	);
}

/* ---------- Hero ---------- */

function startLine(date: Date) {
	return date.toLocaleString('en-GB', { weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit', hour12: false, timeZone: 'UTC' }).replace(',', ' ·') + ' UTC';
}

function HeroEmpty() {
	return (
		<section aria-labelledby='modern-hero' className='border-b border-border bg-gradient-to-b from-neutral-950 to-black'>
			<div className={cn(WRAP, 'flex flex-col gap-6 py-16 sm:py-24')}>
				<p className={cn(LBL, 'text-white')}>Next tournament</p>
				<h1 id='modern-hero' className='max-w-[16ch] text-5xl font-black uppercase leading-[0.9] tracking-wide text-white sm:text-7xl'>
					No tournament scheduled yet
				</h1>
				<p className='max-w-[52ch] text-base leading-relaxed text-neutral-300 sm:text-lg'>The next tournament shows up here with a countdown and open team slots. Meanwhile, get your team ready.</p>
				<div className='flex flex-wrap gap-3'>
					<Link href='/teams' className={cn(buttonVariants({ size: 'lg' }), 'h-12 px-6 font-bold')}>
						Find or create a team
					</Link>
					<Link href='/tournaments' className={cn(buttonVariants({ variant: 'outline', size: 'lg' }), 'h-12 px-6')}>
						Browse tournaments
					</Link>
				</div>
			</div>
		</section>
	);
}

function Hero({ tournament }: { tournament: SeasonTournament | null }) {
	if (!tournament) return <HeroEmpty />;
	const banner = tournament.bannerUrl || FALLBACK_BANNER;
	const upcoming = tournament.status === 'UPCOMING' && tournament.startDate.getTime() > Date.now();
	const pct = tournament.teamCapacity > 0 ? Math.min(100, Math.round((tournament.registered / tournament.teamCapacity) * 100)) : 0;
	const eyebrow = upcoming ? 'Next tournament' : tournament.status === 'ONGOING' ? 'Now playing' : 'Start pending';
	const blurb = [`${tournament.teamCapacity} teams`, tournament.prizePool != null ? `${formatMoney(tournament.prizePool)} prize pool` : null, tournament.location].filter(Boolean).join(' · ');

	return (
		<section aria-labelledby='modern-hero' className='relative overflow-hidden border-b border-border bg-black'>
			<Image src={banner} alt='' fill priority sizes='100vw' unoptimized={!isOptimizable(banner)} className='object-cover opacity-30' />
			<div aria-hidden className='absolute inset-0 bg-gradient-to-r from-black via-black/90 to-black/35' />
			<div className={cn(WRAP, 'relative grid items-end gap-10 py-16 sm:py-24 lg:grid-cols-[minmax(0,7fr)_minmax(0,5fr)] lg:gap-12')}>
				<div className='flex flex-col gap-6'>
					<div className='flex flex-wrap items-center gap-2.5'>
						<span className={cn(LBL, 'text-white')}>{eyebrow}</span>
						<span aria-hidden className='h-px w-6 bg-neutral-700' />
						<span className={LBL}>
							<span style={{ color: GAME_ACCENT[tournament.game].hex }}>{GAME_META[tournament.game].short}</span> · {formatLabel(tournament.format)}
						</span>
					</div>
					<h1 id='modern-hero' className='text-balance text-5xl font-black uppercase leading-[0.9] tracking-wide text-white sm:text-7xl lg:text-[96px]'>
						{tournament.name}
					</h1>
					<p className='max-w-[52ch] text-base leading-relaxed text-neutral-300 sm:text-lg'>{blurb}</p>
					<div className='flex flex-wrap gap-3'>
						<Link href={`/tournaments/${tournament.id}`} className={cn(buttonVariants({ size: 'lg' }), 'h-12 px-6 font-bold')}>
							{upcoming ? 'Register your team' : 'View tournament'}
						</Link>
						<Link href='/tournaments' className={cn(buttonVariants({ variant: 'outline', size: 'lg' }), 'h-12 bg-transparent px-6')}>
							All tournaments
						</Link>
					</div>
				</div>
				<div className='flex flex-col gap-4 rounded-2xl border border-neutral-800 bg-card/85 p-6 backdrop-blur-sm'>
					{upcoming ? (
						<>
							<span className={LBL}>Starts in</span>
							<ModernCountdown target={tournament.startDate.toISOString()} />
						</>
					) : (
						<>
							<span className={LBL}>Status</span>
							<p className='text-2xl font-black uppercase tracking-wide text-white'>{tournament.status === 'ONGOING' ? 'In progress' : 'Start pending'}</p>
						</>
					)}
					<div aria-hidden className='h-px bg-neutral-800' />
					<div className='flex justify-between text-sm'>
						<span className='text-muted-foreground'>Teams registered</span>
						<span className='font-mono tabular-nums text-white'>
							{tournament.registered} / {tournament.teamCapacity}
						</span>
					</div>
					<div
						className='h-1.5 overflow-hidden rounded-full bg-neutral-800'
						role='progressbar'
						aria-label='Teams registered'
						aria-valuemin={0}
						aria-valuemax={tournament.teamCapacity}
						aria-valuenow={tournament.registered}
					>
						<div className='h-full bg-white' style={{ width: `${pct}%` }} />
					</div>
					<div className='flex justify-between gap-4 text-sm'>
						<time dateTime={tournament.startDate.toISOString()} className='text-muted-foreground'>
							{startLine(tournament.startDate)}
						</time>
						<span className='truncate text-white'>{tournament.location}</span>
					</div>
				</div>
			</div>
		</section>
	);
}

/* ---------- This week + standings ---------- */

async function WeekBlock() {
	const { days, initialKey } = buildWeekTabs(bucketWeek(await getCurrentWeekMatches(), new Date()));
	if (days.length === 0) return <p className='rounded-xl border border-border bg-black px-5 py-6 text-sm text-muted-foreground'>No matches this week.</p>;
	return <ModernWeekTabs days={days} initialKey={initialKey} />;
}

async function StandingsBlock({ limit = 5 }: { limit?: number }) {
	const rows = (await getTeamRanking()).slice(0, limit);
	if (rows.length === 0)
		return <p className='rounded-xl border border-border bg-black px-5 py-6 text-sm text-muted-foreground'>No completed matches yet. The standings appear after the first results.</p>;
	return (
		<div className='overflow-hidden rounded-xl border border-border bg-black'>
			<table className='w-full border-collapse text-sm'>
				<thead>
					<tr className='bg-neutral-900'>
						<th scope='col' className={cn(LBL, 'px-4 py-3 text-left font-medium')}>
							#
						</th>
						<th scope='col' className={cn(LBL, 'px-2 py-3 text-left font-medium')}>
							Team
						</th>
						<th scope='col' className={cn(LBL, 'px-2 py-3 text-right font-medium')}>
							W–L
						</th>
						<th scope='col' className={cn(LBL, 'px-4 py-3 text-right font-medium')}>
							Pts
						</th>
					</tr>
				</thead>
				<tbody>
					{rows.map((row, i) => (
						<tr key={row.id} className='border-t border-border transition-colors hover:bg-white/[0.03]'>
							<td className={cn('px-4 py-3.5 font-mono tabular-nums', i === 0 ? 'text-white' : 'text-muted-foreground')}>{i + 1}</td>
							<td className='max-w-0 px-2 py-3.5'>
								<Link href={`/teams/${row.id}`} className='flex min-w-0 items-center gap-2.5 font-bold uppercase tracking-wide text-white hover:text-neutral-300'>
									<TeamLogo src={row.logo} name={row.name} decorative size='xs' />
									<span className='truncate'>{row.name}</span>
								</Link>
							</td>
							<td className='px-2 py-3.5 text-right font-mono tabular-nums text-neutral-300'>
								{row.wins}–{row.losses}
							</td>
							<td className='px-4 py-3.5 text-right font-mono tabular-nums text-white'>{row.points}</td>
						</tr>
					))}
				</tbody>
			</table>
		</div>
	);
}

/* ---------- Featured tournaments ---------- */

type FeaturedRow = Awaited<ReturnType<typeof getCuratedFeaturedTournaments>>[number];

function Badge({ badge }: { badge: TournamentBadge }) {
	return (
		<span
			className={cn(
				'rounded px-2 py-1 font-mono text-[11px] font-semibold uppercase tracking-[0.08em]',
				badge.tone === 'solid' && 'bg-white text-black',
				badge.tone === 'outline' && 'border border-white/60 bg-black/60 text-white',
				badge.tone === 'muted' && 'border border-neutral-700 bg-black/60 text-neutral-300',
			)}
		>
			{badge.label}
		</span>
	);
}

function FeaturedCard({ tournament, large = false }: { tournament: FeaturedRow; large?: boolean }) {
	const badge = tournamentBadge({ status: tournament.status, startDate: tournament.startDate, teamCapacity: tournament.teamCapacity, registered: tournament.teams.length });
	const banner = tournament.bannerUrl;
	const facts = [
		tournament.prizePool != null ? `${formatMoney(tournament.prizePool)} prize pool` : null,
		`${tournament.teams.length}/${tournament.teamCapacity} teams`,
		tournament.startDate.toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short', timeZone: 'UTC' }),
	].filter(Boolean);

	return (
		<Link
			href={`/tournaments/${tournament.id}`}
			className={cn(
				'group relative flex flex-col overflow-hidden rounded-2xl border border-neutral-800 bg-neutral-900 text-white transition-colors hover:border-neutral-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
				banner ? 'justify-end' : 'justify-between p-5 sm:p-6',
				large ? 'min-h-[360px] lg:min-h-[440px]' : 'min-h-[210px]',
			)}
		>
			{banner ? (
				<>
					<Image src={banner} alt='' fill sizes={large ? '(max-width: 1024px) 100vw, 760px' : '(max-width: 1024px) 100vw, 500px'} unoptimized={!isOptimizable(banner)} className='object-cover' />
					<div aria-hidden className='absolute inset-0 bg-gradient-to-b from-black/10 via-black/40 to-black/95' />
				</>
			) : (
				<span className='flex h-10 w-10 items-center justify-center rounded-lg border border-neutral-700 bg-black' title={GAME_META[tournament.game].label}>
					<GameGlyph game={tournament.game} className='h-6 w-6' />
				</span>
			)}
			<div className={cn('relative flex flex-col', banner && (large ? 'p-6 sm:p-7' : 'p-5 sm:p-6'), large ? 'gap-3.5' : 'gap-2')}>
				<div className='flex flex-wrap gap-2'>
					<Badge badge={badge} />
					<GameTag game={tournament.game} className='bg-black/60' />
				</div>
				<h3 className={cn('font-black uppercase tracking-wide', large ? 'text-4xl leading-[0.95] sm:text-5xl' : 'text-2xl sm:text-3xl')}>{tournament.name}</h3>
				<p className={cn('flex flex-wrap gap-x-6 gap-y-1 text-neutral-300', large ? 'text-sm' : 'text-[13px]')}>
					{facts.map((fact) => (
						<span key={fact}>{fact}</span>
					))}
				</p>
			</div>
		</Link>
	);
}

/** One large card plus up to two stacked; curated first, falling back to the most valuable active tournaments. */
async function FeaturedBlock() {
	const curated = await getCuratedFeaturedTournaments();
	const [lead, ...rest] = (curated.length > 0 ? curated : await getFallbackFeaturedTournaments()).slice(0, 3);
	if (!lead) return <p className='rounded-xl border border-border bg-black px-5 py-6 text-sm text-muted-foreground'>No tournaments yet. Check back soon.</p>;
	return (
		<div className={cn('grid grid-cols-1 gap-5', rest.length > 0 && 'lg:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]')}>
			<FeaturedCard tournament={lead} large />
			{rest.length > 0 && (
				<div className='grid grid-cols-1 gap-5 lg:grid-rows-2'>
					{rest.map((t) => (
						<FeaturedCard key={t.id} tournament={t} />
					))}
				</div>
			)}
		</div>
	);
}

/* ---------- News ---------- */

type NewsRow = Awaited<ReturnType<typeof getFeaturedNews>>[number];

function newsHref(post: NewsRow) {
	return post.content != null || !post.link ? `/news/${post.id}` : post.link;
}

function newsDate(post: NewsRow) {
	return post.publishedAt.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', timeZone: 'UTC' });
}

function NewsLink({ post, className, children }: { post: NewsRow; className: string; children: React.ReactNode }) {
	const href = newsHref(post);
	if (/^https?:\/\//.test(href)) {
		return (
			<a href={href} target='_blank' rel='noopener noreferrer' className={className}>
				{children}
				<span className='sr-only'>(opens in a new tab)</span>
			</a>
		);
	}
	return (
		<Link href={href} className={className}>
			{children}
		</Link>
	);
}

async function NewsBlock() {
	const [lead, ...rest] = await getFeaturedNews();
	if (!lead) return <p className='rounded-xl border border-border bg-black px-5 py-6 text-sm text-muted-foreground'>No news yet. Check back soon.</p>;
	const image = lead.imageUrl || FALLBACK_BANNER;
	return (
		<div className='flex flex-wrap gap-10'>
			<NewsLink post={lead} className='group flex min-w-0 flex-[999_1_520px] flex-col gap-4 text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring'>
				<span className='relative block aspect-video w-full overflow-hidden rounded-xl bg-neutral-900'>
					<Image src={image} alt='' fill sizes='(max-width: 1024px) 100vw, 760px' unoptimized={!isOptimizable(image)} className='object-cover' />
				</span>
				<time dateTime={lead.publishedAt.toISOString()} className={LBL}>
					{newsDate(lead)}
				</time>
				<h3 className='text-balance text-2xl font-black uppercase leading-tight tracking-wide group-hover:text-neutral-300 sm:text-[28px]'>{lead.title}</h3>
				{lead.blurb && <p className='max-w-[62ch] text-base leading-relaxed text-neutral-300'>{lead.blurb}</p>}
			</NewsLink>
			{rest.length > 0 && (
				<ul className='flex min-w-0 flex-[1_1_360px] flex-col'>
					{rest.slice(0, 4).map((post) => (
						<li key={post.id} className='border-t border-border py-5 last:border-b'>
							<NewsLink post={post} className='flex flex-col gap-2 text-white hover:text-neutral-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring'>
								<time dateTime={post.publishedAt.toISOString()} className={cn(LBL, 'text-[11px]')}>
									{newsDate(post)}
								</time>
								<span className='text-lg font-bold leading-snug'>{post.title}</span>
							</NewsLink>
						</li>
					))}
				</ul>
			)}
		</div>
	);
}

/* ---------- Layout ---------- */

export async function ModernHome() {
	// The hero holds the LCP image, and the on-air strip sits above it (streaming it in would shove the
	// hero down). Both are cached queries, so they are awaited up front, in parallel.
	const [allLive, settings, season] = await Promise.all([getLive(), getHomepageSettings(), getSeasonTournament()]);
	const live = settings?.showLiveMatches === false ? [] : allLive;

	return (
		<div className='pb-16 sm:pb-24'>
			<OnAirStrip matches={live} />
			<Hero tournament={season} />

			<div className={cn(WRAP, 'flex flex-wrap gap-10 pb-10 pt-14 sm:pt-20')}>
				<section aria-labelledby='modern-week' className='flex min-w-0 flex-[999_1_560px] flex-col gap-5'>
					<SectionHead id='modern-week' title='This week' href='/matches' linkLabel='Full schedule' />
					<Suspense fallback={<ModernWeekSkeleton />}>
						<WeekBlock />
					</Suspense>
				</section>
				<section aria-labelledby='modern-standings' className='flex min-w-0 flex-[1_1_360px] flex-col gap-5'>
					<SectionHead id='modern-standings' title='Standings' aside={<span className={LBL}>By points</span>} />
					<Suspense fallback={<RankingSkeleton rows={5} />}>
						<StandingsBlock />
					</Suspense>
				</section>
			</div>

			<section aria-labelledby='modern-featured' className={cn(WRAP, 'flex flex-col gap-6 py-10 sm:py-12')}>
				<SectionHead id='modern-featured' title='Featured tournaments' href='/tournaments' linkLabel='Browse all' />
				<Suspense fallback={<ModernFeaturedSkeleton />}>
					<FeaturedBlock />
				</Suspense>
			</section>

			<section aria-labelledby='modern-news' className={cn(WRAP, 'flex flex-col gap-6 py-10 sm:py-12')}>
				<SectionHead id='modern-news' title='From the desk' href='/news' linkLabel='All news' />
				<Suspense fallback={<ModernNewsSkeleton />}>
					<NewsBlock />
				</Suspense>
			</section>
		</div>
	);
}
