import Image from 'next/image';
import Link from 'next/link';
import type { Game } from '@prisma/client';
import { HubSubnav } from '@/components/shell/HubSubnav';
import { HubPageGlow } from '@/components/shell/HubPageGlow';
import { GameGlyph } from '@/components/games/GameMark';
import { TeamCard } from '@/components/TeamCard';
import { TeamLogo } from '@/components/TeamLogo';
import { PlayerAvatar } from '@/components/PlayerAvatar';
import { LocalTime } from '@/components/LocalTime';
import { LinkPendingVeil } from '@/components/shell/LinkPending';
import { buttonVariants } from '@/components/ui/button';
import { GAME_ACCENT, GAME_META, gameParam } from '@/lib/games';
import { formatMoney } from '@/lib/helpers/format-money';
import { isOptimizable } from '@/lib/image-hosts';
import { getMapDisplayName, getMapImage } from '@/lib/tournaments/maps';
import type { ExtendedCs2Team } from '@/lib/models/team-model';
import type { RankingRow } from '@/lib/home/standings';
import {
	getHubLiveMatches,
	getHubMatchFeed,
	getHubNews,
	getHubOpenTeams,
	getHubOpenTournaments,
	getHubRanking,
	getHubTopPlayers,
	getNavData,
	type HubFeedMatch,
	type HubLiveMatch,
	type HubTournament,
} from '@/lib/hub/data';
import { cn } from '@/lib/utils';

const FALLBACK_BANNER = '/info-image.png';

const COPY: Record<Game, { title: string }> = {
	CS2: { title: '5v5 for school teams' },
	LOL: { title: "Summoner's Rift, school edition" },
};

const H2 = 'text-xl font-black uppercase tracking-[0.025em] text-white';
const PANEL = 'overflow-hidden rounded-lg border border-border bg-card';
const PANEL_HEAD = 'flex items-center justify-between border-b border-border px-3.5 py-3 text-[15px] font-black uppercase tracking-[0.1em] text-white';
const MORE_LINK =
	'rounded-sm text-[13px] font-medium normal-case tracking-normal text-neutral-300 transition-colors hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring';
const CHIP = 'inline-flex h-[26px] items-center gap-1.5 rounded-full border border-neutral-800 px-2.5 text-xs text-neutral-300';
const LIVE = 'text-[11px] font-bold uppercase tracking-[0.12em] text-signal-live';

/** Never let one failing block take the whole hub page down; it renders its empty state instead. */
async function safe<T>(promise: Promise<T>, fallback: T, label: string): Promise<T> {
	try {
		return await promise;
	} catch (error) {
		console.error(`Hub overview: ${label} failed to load:`, error);
		return fallback;
	}
}

function formatDay(date: Date) {
	return date.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', timeZone: 'UTC' });
}

function EmptyRow({ children }: { children: React.ReactNode }) {
	return <p className='px-3.5 py-5 text-sm text-muted-foreground'>{children}</p>;
}

function SectionHead({ title, href, linkLabel }: { title: string; href: string; linkLabel: string }) {
	return (
		<div className='flex items-baseline justify-between gap-4'>
			<h2 className={H2}>{title}</h2>
			<Link href={href} className={MORE_LINK}>
				{linkLabel} →
			</Link>
		</div>
	);
}

/** Big scoreboard card for the first live match. */
function LiveHero({ match }: { match: HubLiveMatch }) {
	const banner = match.tournament.bannerUrl;
	return (
		<Link
			href={`/matches/${match.id}`}
			className='group relative block overflow-hidden rounded-[10px] border border-border text-white transition-colors hover:border-neutral-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring'
		>
			{banner && <Image src={banner} alt='' fill sizes='(min-width: 1280px) 1280px, 100vw' unoptimized={!isOptimizable(banner)} className='object-cover opacity-35' />}
			<span aria-hidden className='absolute inset-0 bg-[linear-gradient(90deg,rgba(0,0,0,0.85),rgba(0,0,0,0.4)_50%,rgba(0,0,0,0.85))]' />
			<span className='relative flex flex-col gap-5 p-5 sm:px-[30px] sm:py-[26px]'>
				<span className='flex items-center justify-between gap-4'>
					<span className={LIVE}>{match.status === 'PAUSED' ? 'Paused' : 'Live'}</span>
					<span className='truncate text-[13px] text-white/70'>
						{match.tournament.name} · Round {match.round}
					</span>
				</span>
				<span className='grid grid-cols-[1fr_auto_1fr] items-center gap-3 sm:gap-6'>
					<span className='flex min-w-0 items-center gap-3 sm:gap-4'>
						<TeamLogo src={match.teamA?.logo} name={match.teamA?.name} size='lg' decorative className='hidden sm:flex' />
						<span className='truncate text-lg font-black uppercase tracking-[0.025em] sm:text-3xl'>{match.teamA?.name ?? 'TBD'}</span>
					</span>
					<span className='font-mono text-4xl leading-none tabular-nums tracking-tight sm:text-6xl'>
						{match.scoreTeamA ?? 0}
						<span className='mx-2 text-white/35 sm:mx-3.5'>:</span>
						{match.scoreTeamB ?? 0}
					</span>
					<span className='flex min-w-0 items-center justify-end gap-3 sm:gap-4'>
						<span className='truncate text-right text-lg font-black uppercase tracking-[0.025em] sm:text-3xl'>{match.teamB?.name ?? 'TBD'}</span>
						<TeamLogo src={match.teamB?.logo} name={match.teamB?.name} size='lg' decorative className='hidden sm:flex' />
					</span>
				</span>
				<span className='flex justify-end'>
					<span className={cn(buttonVariants({ size: 'sm' }), 'font-semibold')}>Watch live</span>
				</span>
			</span>
			<LinkPendingVeil />
		</Link>
	);
}

/** Banner hero for the soonest tournament taking teams (when nothing is live). */
function TournamentHero({ tournament, game }: { tournament: HubTournament; game: Game }) {
	const banner = tournament.bannerUrl || FALLBACK_BANNER;
	const hex = GAME_ACCENT[game].hex;
	return (
		<Link
			href={`/tournaments/${tournament.id}`}
			className='group relative block overflow-hidden rounded-[10px] border border-border text-white transition-colors hover:border-neutral-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring'
		>
			<Image src={banner} alt='' fill sizes='(min-width: 1280px) 1280px, 100vw' unoptimized={!isOptimizable(banner)} className='object-cover opacity-40' />
			<span aria-hidden className='absolute inset-0 bg-[linear-gradient(90deg,rgba(0,0,0,0.9),rgba(0,0,0,0.45)_60%,rgba(0,0,0,0.2))]' />
			<span className='relative flex flex-col gap-4 p-5 sm:px-[30px] sm:py-7'>
				<span className={CHIP} style={{ alignSelf: 'flex-start', borderColor: `${hex}66`, background: `${hex}26`, color: hex }}>
					Registration open · closes {formatDay(tournament.startDate)}
				</span>
				<span className='max-w-[18ch] text-4xl font-black uppercase leading-[0.95] tracking-[0.025em] sm:text-[52px]'>{tournament.name}</span>
				<span className='flex flex-wrap gap-x-6 gap-y-1 text-[13px] text-white/75'>
					<span>
						Teams{' '}
						<strong className='font-mono font-medium tabular-nums text-white'>
							{tournament.registered}/{tournament.teamCapacity}
						</strong>
					</span>
					<span>{tournament.location}</span>
					{tournament.prizePool != null && <span>Prize {formatMoney(tournament.prizePool)}</span>}
				</span>
			</span>
			<LinkPendingVeil />
		</Link>
	);
}

function TournamentCard({ tournament }: { tournament: HubTournament }) {
	const banner = tournament.bannerUrl || FALLBACK_BANNER;
	return (
		<Link
			href={`/tournaments/${tournament.id}`}
			className='group relative flex flex-col overflow-hidden rounded-lg border border-border bg-card transition-colors hover:border-neutral-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring'
		>
			<span className='relative h-[150px] overflow-hidden bg-black'>
				<Image src={banner} alt='' fill sizes='(min-width: 1024px) 420px, 100vw' unoptimized={!isOptimizable(banner)} className='object-cover' />
				<span aria-hidden className='absolute inset-0 bg-[linear-gradient(0deg,rgba(0,0,0,0.85),transparent_60%)]' />
				<span className={cn(CHIP, 'absolute left-3 top-3 border-white/20 bg-black/60 text-white')}>Registration open</span>
				<span className='absolute inset-x-3.5 bottom-2.5 text-[22px] font-black uppercase leading-[1.05] tracking-[0.025em] text-white underline-offset-4 group-hover:underline'>
					{tournament.name}
				</span>
			</span>
			<span className='grid grid-cols-3 gap-2 px-3.5 py-3 text-xs text-muted-foreground'>
				<span>
					Starts<strong className='block text-[13px] font-medium text-white'>{formatDay(tournament.startDate)}</strong>
				</span>
				<span>
					Teams
					<strong className='block font-mono text-[13px] font-medium tabular-nums text-white'>
						{tournament.registered}/{tournament.teamCapacity}
					</strong>
				</span>
				<span>
					Prize<strong className='block text-[13px] font-medium text-white'>{tournament.prizePool != null ? formatMoney(tournament.prizePool) : 'None'}</strong>
				</span>
			</span>
			<LinkPendingVeil />
		</Link>
	);
}

function MatchRow({ match }: { match: HubFeedMatch }) {
	const done = match.status === 'COMPLETED';
	const live = match.status === 'LIVE' || match.status === 'PAUSED';
	return (
		<Link
			href={`/matches/${match.id}`}
			className='relative grid grid-cols-[minmax(0,1fr)_88px_minmax(0,1fr)] items-center gap-2.5 border-t border-border px-3.5 py-2.5 text-sm text-white transition-colors first:border-t-0 hover:bg-neutral-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring'
		>
			<span className='flex min-w-0 items-center gap-2.5'>
				<TeamLogo src={match.teamA?.logo} name={match.teamA?.name} size='xs' decorative />
				<span className='truncate font-semibold'>{match.teamA?.name ?? 'TBD'}</span>
			</span>
			<span className='flex flex-col items-center gap-0.5 text-center'>
				{done || live ? (
					<span className='font-mono text-[15px] tabular-nums'>{match.scoreTeamA == null && match.scoreTeamB == null ? 'vs' : `${match.scoreTeamA ?? 0} – ${match.scoreTeamB ?? 0}`}</span>
				) : (
					<LocalTime iso={match.matchDate.toISOString()} className='text-[11px] leading-tight text-neutral-200' />
				)}
				{(done || live) && <span className={live ? LIVE : 'text-[11px] text-muted-foreground'}>{live ? 'Live' : 'Final'}</span>}
			</span>
			<span className='flex min-w-0 items-center justify-end gap-2.5'>
				<span className='truncate text-right font-semibold'>{match.teamB?.name ?? 'TBD'}</span>
				<TeamLogo src={match.teamB?.logo} name={match.teamB?.name} size='xs' decorative />
			</span>
			<LinkPendingVeil />
		</Link>
	);
}

function RankingPanel({ rows, game }: { rows: RankingRow[]; game: Game }) {
	const grid = 'grid grid-cols-[28px_minmax(0,1fr)_40px_40px_48px] items-center gap-2 px-3.5';
	return (
		<section className={PANEL} aria-labelledby={`ranking-${game}`}>
			<h2 id={`ranking-${game}`} className={PANEL_HEAD}>
				Team ranking
				<Link href={`/teams?game=${gameParam(game)}`} className={MORE_LINK}>
					All teams →
				</Link>
			</h2>
			{rows.length === 0 ? (
				<EmptyRow>No completed matches yet. The table fills in after the first results.</EmptyRow>
			) : (
				<table className='w-full text-sm'>
					<thead>
						<tr className={cn(grid, 'py-2 text-[11px] font-bold uppercase tracking-[0.1em] text-muted-foreground')}>
							<th scope='col' className='text-left font-bold'>
								#
							</th>
							<th scope='col' className='text-left font-bold'>
								Team
							</th>
							<th scope='col' className='text-right font-bold'>
								<abbr title='Wins' className='no-underline'>
									W
								</abbr>
							</th>
							<th scope='col' className='text-right font-bold'>
								<abbr title='Losses' className='no-underline'>
									L
								</abbr>
							</th>
							<th scope='col' className='text-right font-bold'>
								<abbr title='Points' className='no-underline'>
									Pts
								</abbr>
							</th>
						</tr>
					</thead>
					<tbody>
						{rows.map((row, i) => (
							<tr key={row.id} className={cn(grid, 'border-t border-border py-2')}>
								<td className='font-mono tabular-nums text-muted-foreground'>{i + 1}</td>
								<td className='min-w-0'>
									<Link
										href={`/teams/${row.id}`}
										className='flex min-w-0 items-center gap-2.5 rounded-sm font-semibold text-white hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring'
									>
										<TeamLogo src={row.logo} name={row.name} size='xs' decorative />
										<span className='truncate'>{row.name}</span>
									</Link>
								</td>
								<td className='text-right font-mono tabular-nums'>{row.wins}</td>
								<td className='text-right font-mono tabular-nums text-muted-foreground'>{row.losses}</td>
								<td className='text-right font-mono font-semibold tabular-nums text-white'>{row.points}</td>
							</tr>
						))}
					</tbody>
				</table>
			)}
		</section>
	);
}

type TopPlayer = Awaited<ReturnType<typeof getHubTopPlayers>>[number];

function TopPlayersPanel({ players, game }: { players: TopPlayer[]; game: Game }) {
	return (
		<section className={PANEL} aria-labelledby={`players-${game}`}>
			<h2 id={`players-${game}`} className={PANEL_HEAD}>
				{game === 'CS2' ? 'Top fraggers' : 'Top players'}
			</h2>
			{players.length === 0 ? (
				<EmptyRow>Player stats appear here once tournament matches are played.</EmptyRow>
			) : (
				<ul>
					{players.map((p) => (
						<li key={p.id} className='group/player border-t border-border first:border-t-0'>
							<Link
								href={`/profile/${p.id}`}
								className='flex items-center gap-3 px-3.5 py-2.5 text-white transition-colors hover:bg-neutral-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring'
							>
								<PlayerAvatar src={p.image} name={p.name} size={36} />
								<span className='min-w-0 flex-1'>
									<span className='block truncate font-semibold'>{p.name ?? 'Player'}</span>
									<span className='text-xs text-muted-foreground'>
										{p.kills} kills · {p.matches} {p.matches === 1 ? 'match' : 'matches'}
									</span>
								</span>
								<span className='text-right'>
									<span className='block font-mono tabular-nums text-white'>{p.kd.toFixed(2)}</span>
									<span className='text-[11px] text-muted-foreground'>K/D</span>
								</span>
							</Link>
						</li>
					))}
				</ul>
			)}
		</section>
	);
}

type NewsRow = Awaited<ReturnType<typeof getHubNews>>[number];

function NewsPanel({ posts }: { posts: NewsRow[] }) {
	return (
		<section className={PANEL} aria-labelledby='hub-news'>
			<h2 id='hub-news' className={PANEL_HEAD}>
				News
				<Link href='/news' className={MORE_LINK}>
					News →
				</Link>
			</h2>
			{posts.length === 0 ? (
				<EmptyRow>No news yet. Check back soon.</EmptyRow>
			) : (
				<ul>
					{posts.map((post) => {
						const href = post.content != null || !post.link ? `/news/${post.id}` : post.link;
						const external = /^https?:\/\//.test(href);
						const image = post.imageUrl || FALLBACK_BANNER;
						const body = (
							<>
								<span className='relative h-[64px] w-[100px] shrink-0 overflow-hidden rounded-md bg-neutral-900'>
									<Image src={image} alt='' fill sizes='100px' unoptimized={!isOptimizable(image)} className='object-cover' />
								</span>
								<span className='min-w-0'>
									<span className='font-mono text-[11px] uppercase tracking-[0.08em] text-muted-foreground'>{formatDay(post.publishedAt)}</span>
									<span className='mt-1 line-clamp-2 block text-sm font-semibold leading-snug'>{post.title}</span>
									{external && <span className='sr-only'>(opens in a new tab)</span>}
								</span>
							</>
						);
						const cls =
							'flex items-start gap-3.5 border-t border-border px-3.5 py-3 text-white transition-colors hover:bg-neutral-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring';
						return (
							<li key={post.id} className='[&:first-child>*]:border-t-0'>
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
			)}
		</section>
	);
}

function MapPool({ tournament }: { tournament: HubTournament }) {
	const maps = tournament.mapPool.map((id) => ({ id, name: getMapDisplayName(id), image: getMapImage(id) }));
	return (
		<section className='flex flex-col gap-4' aria-labelledby='hub-map-pool'>
			<div className='flex items-baseline justify-between gap-4'>
				<h2 id='hub-map-pool' className={H2}>
					Map pool
				</h2>
				<span className='truncate text-[13px] text-muted-foreground'>
					{tournament.name} · Bo{tournament.bestOf}
				</span>
			</div>
			<ul className='grid grid-cols-3 gap-2.5 sm:grid-cols-4 lg:grid-cols-6'>
				{maps.map((m) => (
					<li key={m.id} className='relative h-24 overflow-hidden rounded-md border border-border bg-neutral-900'>
						{m.image && <Image src={m.image} alt='' fill sizes='160px' className='object-cover' />}
						<span aria-hidden className='absolute inset-0 bg-[linear-gradient(0deg,rgba(0,0,0,0.8),transparent)]' />
						<span className='absolute bottom-2 left-2.5 text-sm font-black uppercase tracking-[0.025em] text-white'>{m.name}</span>
					</li>
				))}
			</ul>
		</section>
	);
}

/**
 * A game hub's Overview page (/cs2, /lol): what's live, what's open for registration, the next
 * matches, the ranking, top players, news and teams with an open slot — all from tagged data-cache
 * entries (src/lib/hub/data.ts), so the page is cheap to serve and refreshes on writes.
 */
export async function HubOverview({ game }: { game: Game }) {
	const [nav, live, feed, tournaments, ranking, players, news, openTeams] = await Promise.all([
		safe(getNavData(), null, 'nav data'),
		safe(getHubLiveMatches(game), [], 'live matches'),
		safe(getHubMatchFeed(game), [], 'match feed'),
		safe(getHubOpenTournaments(game), [], 'open tournaments'),
		safe(getHubRanking(game), [], 'ranking'),
		safe(getHubTopPlayers(game), [], 'top players'),
		safe(getHubNews(), [], 'news'),
		safe(getHubOpenTeams(game), [], 'open teams'),
	]);

	const meta = GAME_META[game];
	const q = gameParam(game);
	const stats = nav?.games[game];
	const heroTournament = live.length === 0 ? tournaments[0] : undefined;
	const listedTournaments = heroTournament ? tournaments.slice(1, 3) : tournaments.slice(0, 2);
	const mapPoolSource = game === 'CS2' ? tournaments.find((t) => t.mapPool.length > 0) : undefined;

	return (
		<>
			<HubPageGlow game={game} />
			<HubSubnav game={game} active='home' />
			<div className='mx-auto flex w-full max-w-[1280px] flex-col gap-10 px-4 pb-16 pt-8 lg:px-8'>
				<div className='flex flex-wrap items-end justify-between gap-6'>
					<div>
						<span className='inline-flex items-center gap-2 font-mono text-xs uppercase tracking-[0.08em]' style={{ color: GAME_ACCENT[game].hex }}>
							<GameGlyph game={game} className={cn('h-3.5 w-3.5', game === 'LOL' && 'rounded-sm')} />
							{meta.label} hub
						</span>
						<h1 className='mt-2 text-4xl font-black uppercase leading-none tracking-[0.025em] sm:text-[56px]'>{COPY[game].title}</h1>
					</div>
					<div className='flex flex-wrap gap-2'>
						{live.length > 0 && <span className={cn(CHIP, LIVE, 'text-[10px]')}>{live.length} Live</span>}
						{stats && (
							<span className={CHIP}>
								{stats.teams} {stats.teams === 1 ? 'team' : 'teams'}
							</span>
						)}
						{stats && (
							<span className={CHIP}>
								{stats.openTournaments} open {stats.openTournaments === 1 ? 'tournament' : 'tournaments'}
							</span>
						)}
					</div>
				</div>

				{live[0] ? <LiveHero match={live[0]} /> : heroTournament ? <TournamentHero tournament={heroTournament} game={game} /> : null}

				<div className='grid grid-cols-1 items-start gap-5 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]'>
					<div className='flex flex-col gap-5'>
						<SectionHead title='Open tournaments' href={`/tournaments?game=${q}`} linkLabel='All tournaments' />
						{listedTournaments.length > 0 ? (
							<div className='grid grid-cols-1 gap-4 sm:grid-cols-2'>
								{listedTournaments.map((t) => (
									<TournamentCard key={t.id} tournament={t} />
								))}
							</div>
						) : (
							<div className='rounded-lg border border-border bg-card px-4 py-8 text-center text-sm text-muted-foreground'>
								{heroTournament ? 'No other tournaments are taking teams right now.' : `No ${meta.label} tournaments are open for registration right now.`}
							</div>
						)}

						<section className={PANEL} aria-labelledby={`up-next-${game}`}>
							<h2 id={`up-next-${game}`} className={PANEL_HEAD}>
								Up next
								<Link href={`/matches?game=${q}`} className={MORE_LINK}>
									Matches →
								</Link>
							</h2>
							{feed.length === 0 ? (
								<EmptyRow>No matches scheduled yet.</EmptyRow>
							) : (
								<div>
									{feed.map((m) => (
										<MatchRow key={m.id} match={m} />
									))}
								</div>
							)}
						</section>

						{mapPoolSource && <MapPool tournament={mapPoolSource} />}
					</div>

					<div className='flex flex-col gap-5'>
						<RankingPanel rows={ranking} game={game} />
						<TopPlayersPanel players={players} game={game} />
						<NewsPanel posts={news} />
					</div>
				</div>

				<section className='flex flex-col gap-4' aria-labelledby={`open-teams-${game}`}>
					<div className='flex items-baseline justify-between gap-4'>
						<h2 id={`open-teams-${game}`} className={H2}>
							Teams looking for players
						</h2>
						<Link href={`/teams?game=${q}`} className={MORE_LINK}>
							All teams →
						</Link>
					</div>
					{openTeams.length === 0 ? (
						<div className='rounded-lg border border-border bg-card px-4 py-8 text-center text-sm text-muted-foreground'>No {meta.label} teams have an open slot right now.</div>
					) : (
						<div className='grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4'>
							{openTeams.map((team) => (
								<TeamCard key={team.id} team={team as unknown as ExtendedCs2Team} />
							))}
						</div>
					)}
				</section>
			</div>
		</>
	);
}
