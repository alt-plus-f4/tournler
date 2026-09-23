'use client';

import { useState, type ReactNode } from 'react';
import Image from 'next/image';
import { Check, Copy, Download, ExternalLink, Loader2, Server } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { getMapDisplayName, getMapImage } from '@/lib/tournaments/maps';
import { PlayerAvatar, RoomPanel, SectionLabel, SignalDot } from './room-ui';
import { formatDuration, formatKd, getBestOf, getSideLabels, getStatsBySide, getWinningSide, MAP_STATUS_LABEL, type Match, type MatchMapRow, type PlayerStatRow } from './types';

function useCopy() {
	const [copied, setCopied] = useState<string | null>(null);
	const copy = (key: string, text: string) => {
		navigator.clipboard.writeText(text).then(
			() => {
				setCopied(key);
				setTimeout(() => setCopied((c) => (c === key ? null : c)), 2000);
			},
			() => setCopied(null),
		);
	};
	return { copied, copy };
}

/**
 * Where to connect. Connect info only appears once the server has confirmed loading this match
 * (`matchConfigLoadedAt`) — the container can exist for a minute or two before that.
 */
export function ServerPanel({ match }: { match: Match }) {
	const { copied, copy } = useCopy();
	const server = match.gameServer;
	const ready = !!server?.matchConfigLoadedAt;
	const address = server && ready ? `${server.connectIp}:${server.port}` : null;
	// `password` must be set BEFORE `connect` — it's read during the handshake, so the reverse
	// order is a well-known cause of "Bad Password" even with the right one.
	const command = address ? `${server?.password ? `password ${server.password}; ` : ''}connect ${address}` : null;
	// `rungameid` launches Steam/CS2 if needed and passes `+connect` as a startup command.
	const steamUrl = address ? `steam://rungameid/730/+connect ${address}${server?.password ? `; password ${server.password}` : ''}` : null;

	let statusLine: ReactNode;
	if (address) {
		statusLine = (
			<span className='flex items-center gap-2 text-sm font-medium text-white'>
				<SignalDot tone='ready' pulse /> {match.status === 'SCHEDULED' ? 'Warming up — join early to practice' : 'Server is live'}
			</span>
		);
	} else if (server) {
		statusLine = (
			<span className='flex items-center gap-2 text-sm text-neutral-300'>
				<Loader2 className='h-4 w-4 animate-spin text-muted-foreground' aria-hidden /> Server is starting — this takes a minute or two
			</span>
		);
	} else {
		statusLine = (
			<span className='text-sm text-muted-foreground'>
				{match.status === 'SCHEDULED' ? (match.isPickup ? 'The server opens once an admin starts the match.' : 'The server opens about 5 minutes before the start.') : 'Waiting for a free server — every pool server is in use.'}
			</span>
		);
	}

	return (
		<RoomPanel
			label={
				<>
					<Server className='h-3.5 w-3.5' aria-hidden /> Server
				</>
			}
			bodyClassName='space-y-4'
		>
			{statusLine}
			{address && (
				<dl className='divide-y divide-border rounded-md border border-border bg-black'>
					<div className='flex items-center gap-3 px-3 py-2'>
						<dt className='w-16 text-xs font-bold uppercase tracking-[0.1em] text-muted-foreground'>IP</dt>
						<dd className='flex-1 truncate font-mono text-sm text-white'>{address}</dd>
						<button type='button' onClick={() => copy('ip', address)} className='-my-1 -mr-2 flex h-10 w-10 shrink-0 items-center justify-center rounded-sm text-muted-foreground transition-colors hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring' aria-label={copied === 'ip' ? 'IP copied' : 'Copy IP'}>
							{copied === 'ip' ? <Check className='h-4 w-4 text-signal-ready-text' aria-hidden /> : <Copy className='h-4 w-4' aria-hidden />}
						</button>
					</div>
					{server?.password && (
						<div className='flex items-center gap-3 px-3 py-2'>
							<dt className='w-16 text-xs font-bold uppercase tracking-[0.1em] text-muted-foreground'>Pass</dt>
							<dd className='flex-1 truncate font-mono text-sm text-white'>{server.password}</dd>
							<button
								type='button'
								onClick={() => copy('pw', server.password ?? '')}
								className='-my-1 -mr-2 flex h-10 w-10 shrink-0 items-center justify-center rounded-sm text-muted-foreground transition-colors hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring'
								aria-label={copied === 'pw' ? 'Password copied' : 'Copy password'}
							>
								{copied === 'pw' ? <Check className='h-4 w-4 text-signal-ready-text' aria-hidden /> : <Copy className='h-4 w-4' aria-hidden />}
							</button>
						</div>
					)}
				</dl>
			)}
			{address && (
				<div className='grid grid-cols-[1fr_auto] gap-2'>
					<Button size='lg' disabled={!steamUrl} onClick={() => steamUrl && (window.location.href = steamUrl)} className='gap-2 font-bold'>
						<ExternalLink className='h-4 w-4' aria-hidden /> Connect
					</Button>
					<Button size='lg' variant='outline' disabled={!command} onClick={() => command && copy('cmd', command)} className='gap-2' title='Copy the console command (paste into the CS2 console)'>
						{copied === 'cmd' ? <Check className='h-4 w-4 text-signal-ready-text' aria-hidden /> : <Copy className='h-4 w-4' aria-hidden />}
						<span aria-live='polite'>{copied === 'cmd' ? 'Copied' : 'Console'}</span>
					</Button>
				</div>
			)}
		</RoomPanel>
	);
}

function DemoLink({ match }: { match: Match }) {
	if (!match.demoUrl) return <p className='text-sm text-muted-foreground'>No demo was uploaded for this match.</p>;
	return (
		<a href={match.demoUrl} target='_blank' rel='noopener noreferrer' className='inline-flex items-center gap-2 text-sm text-white underline-offset-4 hover:underline'>
			<Download className='h-4 w-4' aria-hidden /> Download demo
		</a>
	);
}

/** Replaces the Server panel once a match is final: who won, and by what margin. */
export function ResultPanel({ match }: { match: Match }) {
	const { teamALabel, teamBLabel } = getSideLabels(match);
	const winningSide = getWinningSide(match);
	const winnerName = winningSide === 'TEAM_A' ? teamALabel : winningSide === 'TEAM_B' ? teamBLabel : null;
	const isSeries = (getBestOf(match) ?? 1) > 1;
	const decided = (match.scoreTeamA ?? 0) !== (match.scoreTeamB ?? 0);
	const winnerScore = winningSide === 'TEAM_A' ? match.scoreTeamA : match.scoreTeamB;
	const loserScore = winningSide === 'TEAM_A' ? match.scoreTeamB : match.scoreTeamA;

	return (
		<RoomPanel bodyClassName='space-y-4'>
			{winnerName ? (
				<div>
					<p className='text-2xl font-black uppercase leading-tight tracking-wide text-white'>{winnerName} won</p>
					<p className='mt-1 text-sm text-muted-foreground'>
						{decided ? (
							<>
								<span className='font-mono tabular-nums text-neutral-200'>
									{winnerScore}–{loserScore}
								</span>{' '}
								{isSeries ? 'on maps' : 'in rounds'}.
							</>
						) : (
							'The server reported no deciding score. An organizer recorded this result.'
						)}
					</p>
				</div>
			) : (
				<p className='text-sm text-muted-foreground'>This match finished without a recorded winner.</p>
			)}
			{/* Series/bo1 demos live on each map row in Match info; only map-less (legacy) matches carry one here. */}
			{match.maps.length === 0 && <DemoLink match={match} />}
		</RoomPanel>
	);
}

/** The quiet facts: format, schedule, timing, map order. */
export function MatchInfoPanel({ match }: { match: Match }) {
	const bestOf = getBestOf(match);
	// Series length is omitted (not guessed) when the match inherits a tournament default we don't have.
	const format = [bestOf ? `Best of ${bestOf}` : null, match.isPickup ? (match.pickupMode === 'CAPTAIN_DRAFT' ? 'captain draft pickup' : 'open pickup') : null].filter(Boolean).join(' · ');
	const rows: { label: string; value: ReactNode }[] = [
		...(format ? [{ label: 'Format', value: format.charAt(0).toUpperCase() + format.slice(1) }] : []),
		{
			label: match.status === 'SCHEDULED' ? 'Starts' : 'Scheduled',
			value: (
				<span className='font-mono tabular-nums' suppressHydrationWarning>
					{new Date(match.matchDate).toLocaleString(undefined, {
						weekday: 'short',
						month: 'short',
						day: 'numeric',
						hour: '2-digit',
						minute: '2-digit',
					})}
				</span>
			),
		},
	];
	if (match.startedAt && match.completedAt) {
		rows.push({
			label: 'Duration',
			value: <span className='font-mono tabular-nums'>{formatDuration(new Date(match.completedAt).getTime() - new Date(match.startedAt).getTime())}</span>,
		});
	}
	if (match.completedAt) {
		rows.push({
			label: 'Finished',
			value: (
				<span className='font-mono tabular-nums' suppressHydrationWarning>
					{new Date(match.completedAt).toLocaleString(undefined, {
						month: 'short',
						day: 'numeric',
						hour: '2-digit',
						minute: '2-digit',
					})}
				</span>
			),
		});
	}

	return (
		<RoomPanel label='Match info' bodyClassName='p-0'>
			<dl className='divide-y divide-border'>
				{rows.map((row) => (
					<div key={row.label} className='flex items-baseline justify-between gap-4 px-4 py-2.5 text-sm'>
						<dt className='text-muted-foreground'>{row.label}</dt>
						<dd className='text-right text-neutral-200'>{row.value}</dd>
					</div>
				))}
			</dl>
			{match.maps.length > 0 && (
				<div className='border-t border-border px-4 py-3'>
					<SectionLabel className='mb-2'>Maps</SectionLabel>
					<MapStrip match={match} />
				</div>
			)}
		</RoomPanel>
	);
}

function mapWinnerSide(match: Match, m: MatchMapRow) {
	if (m.status !== 'COMPLETED') return null;
	if (m.winnerId !== null) return m.winnerId === match.teamA?.id ? 'TEAM_A' : m.winnerId === match.teamB?.id ? 'TEAM_B' : null;
	if (m.scoreTeamA !== null && m.scoreTeamB !== null && m.scoreTeamA !== m.scoreTeamB) return m.scoreTeamA > m.scoreTeamB ? 'TEAM_A' : 'TEAM_B';
	return null;
}

function MapStatus({ match, map }: { match: Match; map: MatchMapRow }) {
	if (map.status === 'LIVE' && match.status === 'LIVE') {
		return (
			<span className='inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-[0.1em] text-white'>
				<SignalDot tone='live' pulse /> Live
			</span>
		);
	}
	if (map.status === 'PAUSED' || (map.status === 'LIVE' && match.status === 'PAUSED')) {
		return (
			<span className='inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-[0.1em] text-signal-hold'>
				<SignalDot tone='hold' /> Paused
			</span>
		);
	}
	return <span className='text-xs uppercase tracking-[0.1em] text-muted-foreground'>{MAP_STATUS_LABEL[map.status] ?? map.status}</span>;
}

/** Compact map order with per-map score — used inside Match info. */
function MapStrip({ match }: { match: Match }) {
	return (
		<ol className='space-y-1.5'>
			{match.maps.map((m, i) => {
				const win = mapWinnerSide(match, m);
				const played = m.scoreTeamA !== null || m.scoreTeamB !== null;
				return (
					<li key={m.id} className='flex items-center gap-3 text-sm'>
						<span className='w-4 font-mono text-xs text-muted-foreground'>{i + 1}</span>
						<span className='flex-1 truncate text-neutral-200'>{getMapDisplayName(m.mapName)}</span>
						{played && (
							<span className='font-mono tabular-nums'>
								<span className={win === 'TEAM_B' ? 'text-muted-foreground' : 'text-white'}>{m.scoreTeamA ?? 0}</span>
								<span className='text-neutral-600' aria-hidden>–</span>
								<span className='sr-only'> to </span>
								<span className={win === 'TEAM_A' ? 'text-muted-foreground' : 'text-white'}>{m.scoreTeamB ?? 0}</span>
							</span>
						)}
						<span className='min-w-[5.5rem] text-right'>
							<MapStatus match={match} map={m} />
						</span>
						<span className='flex w-5 shrink-0 justify-end'>
							{m.status === 'COMPLETED' && m.demoUrl && (
								<a
									href={m.demoUrl}
									target='_blank'
									rel='noopener noreferrer'
									className='rounded-sm text-muted-foreground transition-colors hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring'
									aria-label={`Download ${getMapDisplayName(m.mapName)} demo`}
									title='Download demo'
								>
									<Download className='h-4 w-4' aria-hidden />
								</a>
							)}
						</span>
					</li>
				);
			})}
		</ol>
	);
}

/** Maps tab: every map in the series as a broadcast lower-third, with its result and demo. */
export function MapsTab({ match, onGoToVeto }: { match: Match; onGoToVeto?: () => void }) {
	const { teamALabel, teamBLabel } = getSideLabels(match);
	if (match.maps.length === 0) {
		return (
			<EmptyState title='No maps yet' body='Maps are locked in when the veto finishes. Both sides ban and pick from the active-duty pool on the Overview tab.'>
				{onGoToVeto && (
					<Button variant='outline' onClick={onGoToVeto}>
						Go to veto
					</Button>
				)}
			</EmptyState>
		);
	}
	return (
		<ol className='grid gap-3 md:grid-cols-2 xl:grid-cols-3'>
			{match.maps.map((m, i) => {
				const image = getMapImage(m.mapName);
				const win = mapWinnerSide(match, m);
				const played = m.scoreTeamA !== null || m.scoreTeamB !== null;
				const isFinalMap = m.status === 'COMPLETED';
				return (
					<li key={m.id} className='overflow-hidden rounded-md border border-border bg-neutral-950/90'>
						<div className='relative aspect-[21/9]'>
							{image && <Image src={image} alt='' fill sizes='(min-width: 1280px) 400px, (min-width: 768px) 50vw, 100vw' className={cn('object-cover', isFinalMap ? 'opacity-40 grayscale' : 'opacity-60')} />}
							<div className='absolute inset-0 bg-gradient-to-t from-black via-black/50 to-transparent' />
							<div className='absolute inset-x-0 bottom-0 flex items-end justify-between gap-3 p-4'>
								<p className='text-xl font-black uppercase tracking-wide text-white'>{getMapDisplayName(m.mapName)}</p>
								<span className='flex shrink-0 items-center gap-2'>
									<span className='font-mono text-xs text-neutral-300'>Map {i + 1}</span>
									<span className='text-neutral-600' aria-hidden>
										·
									</span>
									<MapStatus match={match} map={m} />
								</span>
							</div>
						</div>
						<div className='grid grid-cols-[1fr_auto_1fr] items-center gap-3 px-4 py-3'>
							<span className={cn('truncate text-sm font-bold uppercase', win === 'TEAM_B' ? 'text-muted-foreground' : 'text-white')}>{teamALabel}</span>
							<span className='font-mono text-lg tabular-nums'>
								{played ? (
									<>
										<span className={win === 'TEAM_B' ? 'text-muted-foreground' : 'text-white'}>{m.scoreTeamA ?? 0}</span>
										<span className='mx-1 text-neutral-600' aria-hidden>:</span>
										<span className='sr-only'> to </span>
								<span className={win === 'TEAM_A' ? 'text-muted-foreground' : 'text-white'}>{m.scoreTeamB ?? 0}</span>
									</>
								) : (
									<span className='text-muted-foreground'>
											<span aria-hidden>– : –</span>
											<span className='sr-only'>Not played yet</span>
										</span>
								)}
							</span>
							<span className={cn('truncate text-right text-sm font-bold uppercase', win === 'TEAM_A' ? 'text-muted-foreground' : 'text-white')}>{teamBLabel}</span>
						</div>
						{isFinalMap && (
							<div className='border-t border-border px-4 py-2.5 text-sm'>
								{m.demoUrl ? (
									<a href={m.demoUrl} target='_blank' rel='noopener noreferrer' className='inline-flex items-center gap-1.5 text-white underline-offset-4 hover:underline'>
										<Download className='h-3.5 w-3.5' aria-hidden /> Download demo
									</a>
								) : (
									<span className='text-muted-foreground'>No demo uploaded</span>
								)}
							</div>
						)}
					</li>
				);
			})}
		</ol>
	);
}

function StatTable({ label, stats, result }: { label: string; stats: PlayerStatRow[]; result: 'win' | 'loss' | null }) {
	const sorted = [...stats].sort((a, b) => b.kills - a.kills || a.deaths - b.deaths);
	const totals = stats.reduce(
		(acc, s) => ({
			k: acc.k + s.kills,
			d: acc.d + s.deaths,
			a: acc.a + s.assists,
		}),
		{ k: 0, d: 0, a: 0 },
	);
	const topKills = sorted[0]?.kills ?? 0;
	return (
		<section className='overflow-hidden rounded-md border border-border bg-neutral-950/90'>
			<header className='flex items-center justify-between gap-3 border-b border-border px-4 py-3'>
				<h3 className={cn('truncate text-sm font-black uppercase tracking-wide', result === 'loss' ? 'text-neutral-400' : 'text-white')}>{label}</h3>
				{result === 'win' && <span className='rounded-sm bg-white px-1.5 py-0.5 text-xs font-black uppercase tracking-[0.12em] text-black'>Win</span>}
			</header>
			{stats.length === 0 ? (
				<p className='px-4 py-6 text-sm text-muted-foreground'>No stats reported for this side yet.</p>
			) : (
				<div className='overflow-x-auto'>
					<table className='w-full min-w-[420px] text-sm'>
						<thead>
							<tr className='text-left text-xs font-bold uppercase tracking-[0.1em] text-muted-foreground'>
								<th scope='col' className='px-4 py-2 font-bold'>
									Player
								</th>
								{['K', 'D', 'A', '+/−', 'K/D'].map((h) => (
									<th key={h} scope='col' className='w-14 px-2 py-2 text-right font-bold last:pr-4'>
										{h}
									</th>
								))}
							</tr>
						</thead>
						<tbody className='divide-y divide-border/60'>
							{sorted.map((s) => {
								const diff = s.kills - s.deaths;
								return (
									<tr key={s.userId} className='transition-colors duration-150 hover:bg-white/[0.03]'>
										<td className='px-4 py-2.5'>
											<span className='flex items-center gap-2.5'>
												<PlayerAvatar src={s.user.image} name={s.user.name || 'P'} size={24} />
												<span className='truncate text-white'>{s.user.name || 'Unknown player'}</span>
											</span>
										</td>
										<td className={cn('px-2 py-2.5 text-right font-mono tabular-nums', s.kills === topKills && topKills > 0 ? 'font-bold text-white' : 'text-neutral-200')}>{s.kills}</td>
										<td className='px-2 py-2.5 text-right font-mono tabular-nums text-neutral-200'>{s.deaths}</td>
										<td className='px-2 py-2.5 text-right font-mono tabular-nums text-neutral-200'>{s.assists}</td>
										<td className={cn('px-2 py-2.5 text-right font-mono tabular-nums', diff > 0 ? 'text-neutral-100' : 'text-muted-foreground')}>{diff > 0 ? `+${diff}` : diff}</td>
										<td className='px-2 py-2.5 pr-4 text-right font-mono tabular-nums text-neutral-200'>{formatKd(s.kills, s.deaths)}</td>
									</tr>
								);
							})}
						</tbody>
						<tfoot>
							<tr className='border-t border-border text-muted-foreground'>
								<td className='px-4 py-2 text-xs uppercase tracking-[0.1em]'>Team</td>
								<td className='px-2 py-2 text-right font-mono tabular-nums'>{totals.k}</td>
								<td className='px-2 py-2 text-right font-mono tabular-nums'>{totals.d}</td>
								<td className='px-2 py-2 text-right font-mono tabular-nums'>{totals.a}</td>
								<td className='px-2 py-2' />
								<td className='px-2 py-2 pr-4 text-right font-mono tabular-nums'>{formatKd(totals.k, totals.d)}</td>
							</tr>
						</tfoot>
					</table>
				</div>
			)}
		</section>
	);
}

/** Scoreboard tab: per-player K/D/A from the server's playerStats payload, one table per side. */
export function ScoreboardTab({ match }: { match: Match }) {
	const { teamALabel, teamBLabel } = getSideLabels(match);
	const stats = getStatsBySide(match);
	const winningSide = getWinningSide(match);
	if (match.playerStats.length === 0) {
		return (
			<EmptyState
				title={match.status === 'COMPLETED' ? 'No stats were reported' : 'No stats yet'}
				body={match.status === 'COMPLETED' ? 'The game server didn’t send player stats for this match.' : 'Kills, deaths and assists appear here as the game server reports each round.'}
			/>
		);
	}
	return (
		<div className='grid gap-4 lg:grid-cols-2'>
			<StatTable label={teamALabel} stats={stats.TEAM_A} result={winningSide ? (winningSide === 'TEAM_A' ? 'win' : 'loss') : null} />
			<StatTable label={teamBLabel} stats={stats.TEAM_B} result={winningSide ? (winningSide === 'TEAM_B' ? 'win' : 'loss') : null} />
		</div>
	);
}

export function EmptyState({ title, body, children }: { title: string; body: string; children?: ReactNode }) {
	return (
		<div className='flex flex-col items-center rounded-md border border-dashed border-border px-6 py-14 text-center'>
			<p className='text-base font-bold text-white'>{title}</p>
			<p className='mt-1.5 max-w-sm text-sm text-muted-foreground'>{body}</p>
			{children && <div className='mt-5'>{children}</div>}
		</div>
	);
}
