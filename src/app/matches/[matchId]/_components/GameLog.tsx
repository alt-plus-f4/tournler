'use client';

import { Fragment, useEffect, useMemo, useRef, useState } from 'react';
import { Bomb, Clock, Crosshair, Flag, Minus, ShieldCheck, Skull } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
	applyGameLogEvents,
	formatRoundTime,
	isHalfBoundary,
	ROUND_END_LABEL,
	weaponLabel,
	type BombData,
	type GameLogEntry,
	type KillData,
	type LogPlayer,
	type LogSide,
	type MapEndData,
	type RoundEndData,
	type RoundEndKind,
} from '@/lib/tournaments/game-log';
import { RoomPanel, SignalDot } from './room-ui';

const LIVE_POLL_MS = 2000;
const MAX_BACKOFF_MS = 10000;

/**
 * Pulls the game log by cursor: the first request returns the newest events, every later one only
 * what is newer than the last id seen. Polls while the match is live (and the tab visible), and
 * does a final catch-up fetch when it stops being live so the last round isn't missed.
 */
function useGameLog(matchId: number, live: boolean) {
	const [events, setEvents] = useState<GameLogEntry[]>([]);
	const [loaded, setLoaded] = useState(false);
	const lastId = useRef(0);

	useEffect(() => {
		let cancelled = false;
		let timer: ReturnType<typeof setTimeout> | undefined;
		let failures = 0;

		const schedule = (ms: number) => {
			if (cancelled || !live) return;
			timer = setTimeout(tick, ms);
		};

		async function tick() {
			if (cancelled) return;
			if (document.hidden) return schedule(LIVE_POLL_MS);
			try {
				const url = lastId.current ? `/api/matches/${matchId}/events?after=${lastId.current}` : `/api/matches/${matchId}/events`;
				const response = await fetch(url, { cache: 'no-store' });
				if (!response.ok) throw new Error(`HTTP ${response.status}`);
				const body = (await response.json()) as { events: GameLogEntry[]; lastId: number };
				if (cancelled) return;
				failures = 0;
				lastId.current = Math.max(lastId.current, body.lastId);
				if (body.events.length > 0) setEvents((current) => applyGameLogEvents(current, body.events));
				setLoaded(true);
				schedule(LIVE_POLL_MS);
			} catch {
				failures += 1;
				schedule(Math.min(LIVE_POLL_MS * 2 ** failures, MAX_BACKOFF_MS));
			}
		}

		const onVisible = () => {
			if (!document.hidden && live) {
				clearTimeout(timer);
				void tick();
			}
		};
		document.addEventListener('visibilitychange', onVisible);
		void tick();
		return () => {
			cancelled = true;
			clearTimeout(timer);
			document.removeEventListener('visibilitychange', onVisible);
		};
	}, [matchId, live]);

	return { events, loaded };
}

const SIDE_TEXT: Record<LogSide, string> = { ct: 'text-sky-400', t: 'text-amber-400' };
const SIDE_BG: Record<LogSide, string> = { ct: 'bg-sky-500/15 text-sky-300 ring-sky-500/40', t: 'bg-amber-500/15 text-amber-300 ring-amber-500/40' };
const SIDE_NAME: Record<LogSide, string> = { ct: 'Counter-Terrorists', t: 'Terrorists' };

function PlayerName({ player }: { player: LogPlayer }) {
	return <span className={cn('font-semibold', player.side ? SIDE_TEXT[player.side] : 'text-neutral-300')}>{player.name}</span>;
}

const KIND_ICON: Record<RoundEndKind, typeof Skull> = {
	bomb_exploded: Bomb,
	bomb_defused: ShieldCheck,
	elimination: Skull,
	time: Clock,
	surrender: Flag,
	draw: Minus,
	other: Minus,
};

function Badge({ children, title }: { children: React.ReactNode; title: string }) {
	return (
		<span title={title} className='rounded-sm border border-border px-1 text-[10px] font-bold uppercase leading-4 tracking-wide text-neutral-300'>
			{children}
		</span>
	);
}

function KillRow({ kill }: { kill: KillData }) {
	if (kill.bomb || (kill.suicide && !kill.attacker)) {
		return (
			<span className='flex flex-wrap items-center gap-x-2 gap-y-1'>
				<Skull className='h-3.5 w-3.5 text-muted-foreground' aria-hidden />
				<PlayerName player={kill.victim} />
				<span className='text-muted-foreground'>{kill.bomb ? 'died to the bomb' : 'died'}</span>
			</span>
		);
	}
	return (
		<span className='flex flex-wrap items-center gap-x-2 gap-y-1'>
			{kill.attacker && <PlayerName player={kill.attacker} />}
			{kill.assist && (
				<span className='text-muted-foreground'>
					+ <PlayerName player={kill.assist.player} />
					{kill.assist.flash && <span className='text-xs'> (flash)</span>}
				</span>
			)}
			<span className='inline-flex items-center gap-1 text-neutral-400'>
				<Crosshair className='h-3.5 w-3.5' aria-hidden />
				<span className='text-xs font-medium'>{weaponLabel(kill.weapon)}</span>
			</span>
			{kill.headshot && <Badge title='Headshot'>HS</Badge>}
			{kill.penetrated > 0 && <Badge title='Wallbang'>Wallbang</Badge>}
			{kill.thruSmoke && <Badge title='Through smoke'>Smoke</Badge>}
			{kill.noScope && <Badge title='No scope'>No scope</Badge>}
			{kill.attackerBlind && <Badge title='Attacker was blind'>Blind</Badge>}
			<PlayerName player={kill.victim} />
			{kill.friendlyFire && <Badge title='Team kill'>TK</Badge>}
		</span>
	);
}

function bombText(type: 'bomb_planted' | 'bomb_defused', bomb: BombData) {
	const site = bomb.site ? ` at ${bomb.site.toUpperCase()}` : '';
	if (type === 'bomb_planted') return `planted the bomb${site}`;
	const left = bomb.timeRemaining !== null ? ` (${(bomb.timeRemaining / 1000).toFixed(1)}s left)` : '';
	return `defused the bomb${site}${left}`;
}

interface RoundGroup {
	round: number;
	entries: GameLogEntry[];
	end: RoundEndData | null;
}

function groupByRound(events: GameLogEntry[]): { rounds: RoundGroup[]; mapStart: GameLogEntry[]; mapEnd: MapEndData | null } {
	const byRound = new Map<number, RoundGroup>();
	const mapStart: GameLogEntry[] = [];
	let mapEnd: MapEndData | null = null;
	for (const event of events) {
		if (event.type === 'map_end') {
			mapEnd = event.data;
			continue;
		}
		if (event.round === null) {
			if (event.type === 'live') mapStart.push(event);
			continue;
		}
		let group = byRound.get(event.round);
		if (!group) {
			group = { round: event.round, entries: [], end: null };
			byRound.set(event.round, group);
		}
		if (event.type === 'round_end') group.end = event.data;
		else if (event.type !== 'round_start') group.entries.push(event);
	}
	return { rounds: [...byRound.values()].sort((a, b) => a.round - b.round), mapStart, mapEnd };
}

function RoundHistory({ rounds, teamAName, teamBName }: { rounds: RoundGroup[]; teamAName: string; teamBName: string }) {
	const finished = rounds.filter((r) => r.end);
	if (finished.length === 0) return null;
	const cell = (group: RoundGroup, team: 'A' | 'B') => {
		const end = group.end;
		if (!end) return null;
		const won = end.winnerTeam === team;
		const Icon = KIND_ICON[end.kind];
		const label = `Round ${group.round + 1}: ${ROUND_END_LABEL[end.kind]}${end.winnerSide ? ` (${SIDE_NAME[end.winnerSide]})` : ''}`;
		return (
			<span
				title={label}
				className={cn('flex h-6 w-6 items-center justify-center rounded-sm ring-1 ring-inset', won && end.winnerSide ? SIDE_BG[end.winnerSide] : 'text-neutral-700 ring-transparent')}
			>
				{won ? <Icon className='h-3.5 w-3.5' aria-label={label} /> : <span className='h-1 w-1 rounded-full bg-neutral-800' aria-hidden />}
			</span>
		);
	};
	const row = (team: 'A' | 'B', name: string) => (
		<div className='flex items-center gap-2'>
			<span className='w-24 shrink-0 truncate text-xs font-bold uppercase tracking-wide text-neutral-300 sm:w-32'>{name}</span>
			<div className='flex flex-wrap items-center gap-1'>
				{finished.map((group) => (
					<Fragment key={group.round}>
						{cell(group, team)}
						{isHalfBoundary(group.round + 1) && <span className='mx-1 h-6 w-px bg-border' aria-hidden />}
					</Fragment>
				))}
			</div>
		</div>
	);
	return (
		<div className='space-y-1.5 overflow-x-auto' aria-label='Round history'>
			{row('A', teamAName)}
			{row('B', teamBName)}
		</div>
	);
}

interface GameLogProps {
	matchId: number;
	teamAName: string;
	teamBName: string;
	status: 'SCHEDULED' | 'LIVE' | 'PAUSED' | 'COMPLETED';
}

/**
 * HLTV-style live game log for a CS2 match: running score, round-by-round history (who won each
 * round and how) and a feed of kills and bomb events grouped by round, newest first. Fed by the
 * game server's MatchZy webhook (see src/lib/tournaments/game-log.ts).
 */
export function GameLog({ matchId, teamAName, teamBName, status }: GameLogProps) {
	const live = status === 'LIVE' || status === 'PAUSED';
	const { events, loaded } = useGameLog(matchId, live);
	const [selectedMap, setSelectedMap] = useState<number | null>(null);

	const mapOrders = useMemo(() => [...new Set(events.flatMap((e) => (e.mapOrder === null ? [] : [e.mapOrder])))].sort((a, b) => a - b), [events]);
	const activeMap = selectedMap !== null && mapOrders.includes(selectedMap) ? selectedMap : (mapOrders[mapOrders.length - 1] ?? null);
	const { rounds, mapStart, mapEnd } = useMemo(() => groupByRound(events.filter((e) => e.mapOrder === activeMap || (activeMap === null && e.mapOrder === null))), [events, activeMap]);

	const lastEnd = [...rounds].reverse().find((r) => r.end)?.end ?? null;
	const scoreA = mapEnd?.scoreA ?? lastEnd?.scoreA ?? 0;
	const scoreB = mapEnd?.scoreB ?? lastEnd?.scoreB ?? 0;
	const newestFirst = [...rounds].reverse();

	return (
		<RoomPanel
			label={
				<span className='inline-flex items-center gap-2'>
					{live && <SignalDot tone='live' pulse />}
					Live game log
				</span>
			}
			action={
				mapOrders.length > 1 ? (
					<div className='flex items-center gap-1' role='group' aria-label='Map'>
						{mapOrders.map((order) => (
							<button
								key={order}
								type='button'
								onClick={() => setSelectedMap(order)}
								aria-pressed={order === activeMap}
								className={cn('rounded-sm px-2 py-1 text-xs font-bold uppercase tracking-wide', order === activeMap ? 'bg-white text-black' : 'text-muted-foreground hover:text-white')}
							>
								Map {order + 1}
							</button>
						))}
					</div>
				) : undefined
			}
			bodyClassName='space-y-5'
		>
			{!loaded ? (
				<p className='text-sm text-muted-foreground'>Loading game log…</p>
			) : events.length === 0 ? (
				<p className='text-sm text-muted-foreground'>
					{status === 'SCHEDULED'
						? 'The game log fills in here once the match goes live.'
						: 'Waiting for the first events from the server. Kills, bomb plants and round results show up here as they happen.'}
				</p>
			) : (
				<>
					<div className='flex items-center justify-center gap-4 text-center' aria-label={`Score ${scoreA} to ${scoreB}`}>
						<span className='min-w-0 flex-1 truncate text-right text-sm font-bold uppercase tracking-wide text-white'>{teamAName}</span>
						<span className='font-mono text-3xl font-bold tabular-nums text-white'>
							{scoreA}
							<span className='mx-2 text-neutral-600'>:</span>
							{scoreB}
						</span>
						<span className='min-w-0 flex-1 truncate text-left text-sm font-bold uppercase tracking-wide text-white'>{teamBName}</span>
					</div>

					<RoundHistory rounds={rounds} teamAName={teamAName} teamBName={teamBName} />

					<div role='log' aria-label='Game events' className='max-h-[34rem] space-y-4 overflow-y-auto pr-1'>
						{mapEnd && (
							<p className='rounded-sm border border-border bg-neutral-900 px-3 py-2 text-sm font-bold text-white'>
								Map finished {mapEnd.scoreA}–{mapEnd.scoreB}
								{mapEnd.winnerTeam && <span className='font-normal text-muted-foreground'> · {mapEnd.winnerTeam === 'A' ? teamAName : teamBName} won</span>}
							</p>
						)}
						{newestFirst.map((group) => {
							const end = group.end;
							const ongoing = !end;
							return (
								<section key={group.round} aria-label={`Round ${group.round + 1}`}>
									<header className='mb-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 border-b border-border pb-1.5 text-xs'>
										<span className='font-bold uppercase tracking-[0.1em] text-white'>Round {group.round + 1}</span>
										{end ? (
											<span className='text-muted-foreground'>
												{end.winnerSide ? (
													<span className={cn('font-bold', SIDE_TEXT[end.winnerSide])}>{end.winnerSide === 'ct' ? 'CT' : 'T'} win</span>
												) : (
													<span className='font-bold text-neutral-300'>{ROUND_END_LABEL[end.kind]}</span>
												)}
												{end.winnerSide && ` · ${ROUND_END_LABEL[end.kind]}`} ·{' '}
												<span className='font-mono tabular-nums text-neutral-300'>
													{end.scoreA}–{end.scoreB}
												</span>
											</span>
										) : (
											live && <span className='font-bold uppercase tracking-wide text-signal-live'>In progress</span>
										)}
									</header>
									{group.entries.length === 0 && ongoing ? (
										<p className='text-xs text-muted-foreground'>Round started.</p>
									) : (
										<ul className='space-y-1.5 text-sm'>
											{[...group.entries].reverse().map((entry) => (
												<li key={entry.id} className='flex gap-3'>
													<span className='w-10 shrink-0 pt-px text-right font-mono text-xs tabular-nums text-muted-foreground'>{formatRoundTime(entry.roundTime)}</span>
													{entry.type === 'kill' && <KillRow kill={entry.data} />}
													{(entry.type === 'bomb_planted' || entry.type === 'bomb_defused') && (
														<span className='flex flex-wrap items-center gap-x-2'>
															{entry.type === 'bomb_planted' ? <Bomb className='h-3.5 w-3.5 text-amber-400' aria-hidden /> : <ShieldCheck className='h-3.5 w-3.5 text-sky-400' aria-hidden />}
															<PlayerName player={entry.data.player} />
															<span className='text-neutral-300'>{bombText(entry.type, entry.data)}</span>
														</span>
													)}
												</li>
											))}
										</ul>
									)}
								</section>
							);
						})}
						{mapStart.length > 0 && <p className='text-xs font-bold uppercase tracking-[0.1em] text-muted-foreground'>Match is live</p>}
					</div>
				</>
			)}
		</RoomPanel>
	);
}
