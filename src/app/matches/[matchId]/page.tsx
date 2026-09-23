'use client';

import { useEffect, useRef, useState, type ReactNode } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import useSWR from 'swr';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import Image from 'next/image';
import { useToast } from '@/lib/hooks/use-toast';
import { Gamepad2, Trophy, Users, Clock, Target, Copy, ExternalLink, Hourglass, Play, Pause, Flag, Terminal, RefreshCw, AlertTriangle, BarChart3, RotateCcw, Download, Film, Trash2, X, Check, Star, ShieldCheck, Zap, Settings } from 'lucide-react';
import { ACTIVE_DUTY_MAPS, getMapDisplayName, getMapImage } from '@/lib/tournaments/maps';
import { LevelBadge } from '@/components/LevelBadge';

interface TeamMember {
	id: string;
	name: string | null;
	image: string | null;
	createdAt?: string;
	// Real FACEIT CS2 level (src/lib/faceit.ts), looked up server-side by linked Steam account —
	// null if Steam isn't linked, no FACEIT account exists for CS2, or FACEIT_API_KEY is unset.
	faceitLevel: number | null;
}

interface Team {
	id: number;
	name: string;
	logo: string | null;
	background?: string | null;
	capitanId?: string | null;
	members: TeamMember[];
}

interface MatchMapRow {
	id: number;
	mapName: string;
	order: number;
	scoreTeamA: number | null;
	scoreTeamB: number | null;
	winnerId: number | null;
	status: string;
	demoUrl: string | null;
}

type VetoActionType = 'BAN' | 'PICK' | 'DECIDER';

interface VetoActionRow {
	teamId: number | null;
	side: 'TEAM_A' | 'TEAM_B' | null;
	action: VetoActionType;
	mapName: string;
	order: number;
}

interface VetoState {
	phase: 'NOT_STARTED' | 'IN_PROGRESS' | 'COMPLETE';
	bestOf: 1 | 3;
	sequenceLength: number;
	mapPool: string[];
	availableMaps: string[];
	actions: VetoActionRow[];
	currentTurnTeamId: number | null;
	currentTurnSide: 'TEAM_A' | 'TEAM_B' | null;
	nextActionType: 'BAN' | 'PICK' | null;
	confirmedMaps: string[];
}

interface GameServer {
	id: number;
	matchId: number;
	connectIp: string;
	port: number;
	status: string;
	password?: string | null;
	matchConfigLoadedAt?: string | null;
}

interface Participant {
	userId: string;
	side: 'TEAM_A' | 'TEAM_B' | 'POOL';
	isCaptain: boolean;
	user: { id: string; name: string | null; image: string | null; faceitLevel: number | null };
}

interface DraftState {
	phase: 'NOT_STARTED' | 'IN_PROGRESS' | 'COMPLETE';
	captainAUserId: string | null;
	captainBUserId: string | null;
	poolUserIds: string[];
	picks: { captainSide: 'TEAM_A' | 'TEAM_B'; pickedUserId: string; order: number }[];
	currentTurnSide: 'TEAM_A' | 'TEAM_B' | null;
}

interface PlayerStatRow {
	userId: string;
	teamId: number | null;
	side: 'TEAM_A' | 'TEAM_B' | null;
	kills: number;
	deaths: number;
	assists: number;
	user: { id: string; name: string | null; image: string | null };
}

interface Match {
	id: number;
	tournament: {
		id: number;
		name: string;
		status: string;
	};
	teamA: Team | null;
	teamB: Team | null;
	scoreTeamA: number | null;
	scoreTeamB: number | null;
	winner: Team | null;
	// Pickup-match winner — see Matches.winnerSide. null for non-pickup matches (they use `winner`).
	winnerSide: 'TEAM_A' | 'TEAM_B' | null;
	matchDate: string;
	status: 'SCHEDULED' | 'LIVE' | 'PAUSED' | 'COMPLETED';
	startedAt: string | null;
	pausedAt: string | null;
	completedAt: string | null;
	gameServer: GameServer | null;
	isPickup: boolean;
	pickupMode: 'OPEN' | 'CAPTAIN_DRAFT' | null;
	teamAName: string | null;
	teamBName: string | null;
	bestOf: number | null;
	maps: MatchMapRow[];
	participants: Participant[];
	playerStats: PlayerStatRow[];
	// Fallback demo for matches with no MatchMap rows (pickups/legacy) — series matches store one
	// demo per map on maps[].demoUrl instead.
	demoUrl: string | null;
}

const fillTeamToFive = (members: TeamMember[]) => {
	const placeholdersNeeded = Math.max(0, 5 - members.length);
	const placeholders: TeamMember[] = Array.from({ length: placeholdersNeeded }, (_, i) => ({
		id: `placeholder-${i}`,
		name: 'Open Slot',
		image: null,
		faceitLevel: null,
	}));

	return [...members, ...placeholders].slice(0, 5);
};

function TeamLogo({ logo, name }: { logo: string | null; name: string }) {
	const [failed, setFailed] = useState(false);

	if (!logo || failed) {
		return <span className='text-white font-black text-4xl'>{name.substring(0, 2).toUpperCase()}</span>;
	}

	// eslint-disable-next-line @next/next/no-img-element
	return <img src={logo} alt={name} loading='eager' className='w-[120px] h-[120px] object-contain' onError={() => setFailed(true)} />;
}

function formatDuration(ms: number) {
	const totalSeconds = Math.max(0, Math.floor(ms / 1000));
	const hours = Math.floor(totalSeconds / 3600);
	const minutes = Math.floor((totalSeconds % 3600) / 60);
	const seconds = totalSeconds % 60;
	const pad = (n: number) => n.toString().padStart(2, '0');
	return hours > 0 ? `${hours}:${pad(minutes)}:${pad(seconds)}` : `${minutes}:${pad(seconds)}`;
}

/** Ticks once a second while `active`, forcing the caller to re-render (used to keep a live timer's displayed value current). */
function useTicker(active: boolean) {
	const [, setTick] = useState(0);
	useEffect(() => {
		if (!active) return;
		const id = setInterval(() => setTick((t) => t + 1), 1000);
		return () => clearInterval(id);
	}, [active]);
}

function MatchTimer({ match }: { match: Match }) {
	// Ticks the SCHEDULED countdown too, so "Starts in X" counts down smoothly instead of only
	// jumping when the 4s SWR poll happens to land.
	useTicker(match.status === 'LIVE' || match.status === 'SCHEDULED');

	if (match.status === 'SCHEDULED') {
		const msUntilStart = new Date(match.matchDate).getTime() - Date.now();
		// Pre-warmed (see prewarmUpcomingMatches, ~5 min before start) — the server is already
		// loaded and joinable even though the app hasn't marked the match LIVE yet (that happens
		// on its own once MatchZy reports the series actually began — see goLiveFromServer).
		if (match.gameServer?.matchConfigLoadedAt) {
			return (
				<span className='inline-flex items-center gap-2 text-white text-sm font-bold'>
					<span className='w-2 h-2 rounded-full bg-green-500 animate-pulse' /> Server ready — join now &middot; {msUntilStart > 0 ? `starts in ${formatDuration(msUntilStart)}` : 'starting soon'}
				</span>
			);
		}
		if (msUntilStart <= 0) {
			return (
				<span className='inline-flex items-center gap-2 text-neutral-400 text-sm'>
					<Hourglass className='w-4 h-4' /> Waiting to start
				</span>
			);
		}
		return (
			<span className='inline-flex items-center gap-2 text-neutral-300 text-sm'>
				<Hourglass className='w-4 h-4' /> Starts in {formatDuration(msUntilStart)}
			</span>
		);
	}

	if (match.status === 'LIVE') {
		const elapsed = match.startedAt ? Date.now() - new Date(match.startedAt).getTime() : 0;
		return (
			<span className='inline-flex items-center gap-2 text-white text-sm font-bold'>
				<span className='w-2 h-2 rounded-full bg-red-500 animate-pulse' /> LIVE &middot; {formatDuration(elapsed)}
			</span>
		);
	}

	if (match.status === 'PAUSED') {
		const elapsed = match.startedAt && match.pausedAt ? new Date(match.pausedAt).getTime() - new Date(match.startedAt).getTime() : 0;
		return (
			<span className='inline-flex items-center gap-2 text-yellow-400 text-sm font-bold'>
				<span className='w-2 h-2 rounded-full bg-yellow-400' /> PAUSED &middot; {formatDuration(elapsed)}
			</span>
		);
	}

	if (match.startedAt && match.completedAt) {
		const duration = new Date(match.completedAt).getTime() - new Date(match.startedAt).getTime();
		return <span className='text-neutral-400 text-sm'>Finished in {formatDuration(duration)}</span>;
	}

	return null;
}

/**
 * Replaces the connect-IP/RCON-facing panel once a match is COMPLETED — there's no live server
 * to connect to anymore, just whatever demo(s) got uploaded while it was being played (see
 * POST /api/matches/[matchId]/demo). Series matches (bo1/bo3) show one row per map since each map
 * gets its own demo; pickups/legacy matches (no MatchMap rows) show the single match-level demo.
 */
function MatchDemoPanel({ match }: { match: Match }) {
	const completedMaps = match.maps.filter((m) => m.status === 'COMPLETED');

	return (
		<div className='w-full border border-border rounded-md p-4 mb-6 text-left'>
			<p className='text-neutral-400 uppercase tracking-wide text-xs mb-3 flex items-center gap-2'>
				<Film className='h-3.5 w-3.5' /> Match Demo
			</p>
			{completedMaps.length > 0 ? (
				<div className='space-y-2'>
					{completedMaps.map((m) => (
						<div key={m.id} className='flex items-center justify-between gap-3 text-sm'>
							<span className='text-white'>{getMapDisplayName(m.mapName)}</span>
							{m.demoUrl ? (
								<a href={m.demoUrl} target='_blank' rel='noopener noreferrer' className='inline-flex items-center gap-1.5 text-white hover:underline shrink-0'>
									<Download className='h-3.5 w-3.5' /> Download
								</a>
							) : (
								<span className='text-neutral-600 text-xs shrink-0'>No demo uploaded</span>
							)}
						</div>
					))}
				</div>
			) : match.demoUrl ? (
				<a href={match.demoUrl} target='_blank' rel='noopener noreferrer' className='inline-flex items-center gap-2 text-white hover:underline text-sm'>
					<Download className='h-4 w-4' /> Download demo
				</a>
			) : (
				<p className='text-sm text-neutral-500'>No demo available for this match.</p>
			)}
		</div>
	);
}

function AdminControls({ match, vetoComplete, onChanged }: { match: Match; vetoComplete: boolean; onChanged: () => void }) {
	const [scoreA, setScoreA] = useState(() => String(match.scoreTeamA ?? 0));
	const [scoreB, setScoreB] = useState(() => String(match.scoreTeamB ?? 0));
	const [winnerId, setWinnerId] = useState('');
	const [pendingAction, setPendingAction] = useState<string | null>(null);
	const { toast } = useToast();

	const canEndMatch = (match.isPickup || (match.teamA !== null && match.teamB !== null)) && (match.status === 'LIVE' || match.status === 'PAUSED');
	const teamALabel = match.isPickup ? match.teamAName || 'Side A' : (match.teamA?.name ?? 'Team A');
	const teamBLabel = match.isPickup ? match.teamBName || 'Side B' : (match.teamB?.name ?? 'Team B');

	const patch = async (action: string, body: Record<string, unknown>) => {
		setPendingAction(action);
		try {
			const response = await fetch(`/api/matches/${match.id}`, {
				method: 'PATCH',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify(body),
			});
			const payload = await response.json().catch(() => null);
			if (!response.ok) throw new Error(payload?.error || 'Action failed');
			if (payload?.configPushError) {
				toast({ variant: 'destructive', title: "Saved, but the game server didn't confirm it", description: `${payload.configPushError} — the app's state is updated, but the real server may not match it yet. Use the RCON console below to check/retry.` });
			}
			onChanged();
		} catch (error) {
			console.error(`Failed to ${action}`, error);
			toast({ variant: 'destructive', title: `Could not ${action.toLowerCase()} match`, description: error instanceof Error ? error.message : undefined });
		} finally {
			setPendingAction(null);
		}
	};

	const updateScore = () => patch('update score', { scoreTeamA: Number(scoreA), scoreTeamB: Number(scoreB) });
	const restartMatch = () => {
		if (!window.confirm('Restart this match? Its score, timer, and any map results will be cleared back to zero. Team assignments and the map veto stay as they are.')) return;
		patch('restart', { action: 'RESTART' });
	};
	const endMatch = () => {
		if (!winnerId) {
			toast({ variant: 'destructive', title: 'Pick a winner to end the match' });
			return;
		}
		const winnerField = match.isPickup ? { winnerSide: winnerId } : { winnerId: Number(winnerId) };
		patch('end', { scoreTeamA: Number(scoreA), scoreTeamB: Number(scoreB), ...winnerField });
	};

	if (match.status === 'COMPLETED') return null;

	return (
		<div className='bg-neutral-950 border border-border rounded-lg p-6 mb-12'>
			<p className='text-xs font-bold uppercase tracking-widest text-neutral-500 mb-4'>Admin Controls</p>

			<div className='flex flex-wrap items-center gap-2 mb-5'>
				{match.status === 'SCHEDULED' && (
					<div className='flex flex-col gap-1.5'>
						<Button
							onClick={() => patch('start', { action: 'START' })}
							disabled={pendingAction !== null || (!match.isPickup && (match.teamA === null || match.teamB === null)) || !vetoComplete}
							className='bg-white text-black hover:bg-neutral-200'
						>
							<Play className='h-4 w-4 mr-2' /> Start Match
						</Button>
						{!vetoComplete && <p className='text-xs text-neutral-500'>Map veto must be completed before the match can start.</p>}
					</div>
				)}
				{match.status === 'LIVE' && (
					<Button onClick={() => patch('pause', { action: 'PAUSE' })} disabled={pendingAction !== null} variant='outline' className='border-border text-white hover:bg-neutral-800'>
						<Pause className='h-4 w-4 mr-2' /> Pause
					</Button>
				)}
				{match.status === 'LIVE' && (
					<Button
						onClick={() => patch('force-start', { action: 'FORCE_START' })}
						disabled={pendingAction !== null}
						variant='outline'
						className='border-border text-white hover:bg-neutral-800'
						title="Skips the server's ready-up wait — use if players won't or can't type .ready"
					>
						<Zap className='h-4 w-4 mr-2' /> Force Start
					</Button>
				)}
				{match.status === 'PAUSED' && (
					<Button onClick={() => patch('resume', { action: 'RESUME' })} disabled={pendingAction !== null} className='bg-white text-black hover:bg-neutral-200'>
						<Play className='h-4 w-4 mr-2' /> Resume
					</Button>
				)}
				{(match.status === 'LIVE' || match.status === 'PAUSED') && (
					<Button onClick={restartMatch} disabled={pendingAction !== null} variant='outline' className='border-border text-white hover:bg-neutral-800'>
						<RotateCcw className='h-4 w-4 mr-2' /> Restart
					</Button>
				)}
			</div>

			{(match.status === 'LIVE' || match.status === 'PAUSED') && (
				<div className='grid grid-cols-1 sm:grid-cols-[1fr_1fr_auto] gap-3 items-end'>
					<div className='space-y-1.5'>
						<Label htmlFor='admin-score-a' className='text-neutral-400'>
							{teamALabel} Score
						</Label>
						<Input id='admin-score-a' type='number' value={scoreA} onChange={(e) => setScoreA(e.target.value)} className='bg-black border-border text-white' />
					</div>
					<div className='space-y-1.5'>
						<Label htmlFor='admin-score-b' className='text-neutral-400'>
							{teamBLabel} Score
						</Label>
						<Input id='admin-score-b' type='number' value={scoreB} onChange={(e) => setScoreB(e.target.value)} className='bg-black border-border text-white' />
					</div>
					<Button onClick={updateScore} disabled={pendingAction !== null} variant='outline' className='border-border text-white hover:bg-neutral-800'>
						Update Score
					</Button>
				</div>
			)}

			{canEndMatch && (
				<div className='mt-5 pt-5 border-t border-border grid grid-cols-1 sm:grid-cols-[1fr_auto] gap-3 items-end'>
					<div className='space-y-1.5'>
						<Label className='text-neutral-400'>Winner</Label>
						<Select value={winnerId} onValueChange={setWinnerId}>
							<SelectTrigger className='bg-black border-border text-white'>
								<SelectValue placeholder='Select the winner' />
							</SelectTrigger>
							<SelectContent>
								{match.isPickup ? (
									<>
										<SelectItem value='TEAM_A'>{teamALabel}</SelectItem>
										<SelectItem value='TEAM_B'>{teamBLabel}</SelectItem>
									</>
								) : (
									<>
										{match.teamA && <SelectItem value={String(match.teamA.id)}>{match.teamA.name}</SelectItem>}
										{match.teamB && <SelectItem value={String(match.teamB.id)}>{match.teamB.name}</SelectItem>}
									</>
								)}
							</SelectContent>
						</Select>
					</div>
					<Button onClick={endMatch} disabled={pendingAction !== null || !winnerId} variant='destructive'>
						<Flag className='h-4 w-4 mr-2' /> End Match
					</Button>
				</div>
			)}
		</div>
	);
}

interface ConsoleEntry {
	command: string;
	output: string;
	isError: boolean;
	at: string;
}

/**
 * Admin-only panel for talking to the real CS2 server directly: run arbitrary RCON commands and
 * re-push the match config (map veto result, teams, password) when the automated push
 * (`pushMatchConfigToServer`, triggered on match start) failed or the MatchZy webhook seems stuck.
 */
function RconConsole({ matchId, gameServer }: { matchId: string; gameServer: GameServer }) {
	const [command, setCommand] = useState('');
	const [history, setHistory] = useState<ConsoleEntry[]>([]);
	const [isRunning, setIsRunning] = useState(false);
	const [isSyncing, setIsSyncing] = useState(false);
	const historyContainerRef = useRef<HTMLDivElement>(null);
	const { toast } = useToast();

	useEffect(() => {
		// Scroll only the console's own box — not scrollIntoView, which walks up and can also
		// scroll the whole page to bring this box into view instead of staying put.
		const el = historyContainerRef.current;
		if (el) el.scrollTop = el.scrollHeight;
	}, [history]);

	const runCommand = async (cmd: string) => {
		const trimmed = cmd.trim();
		if (!trimmed || isRunning) return;
		setIsRunning(true);
		try {
			const response = await fetch(`/api/matches/${matchId}/game-server/rcon`, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ command: trimmed }),
			});
			const payload = await response.json().catch(() => null);
			if (!response.ok) throw new Error(payload?.error || 'Command failed');
			setHistory((prev) => [...prev, { command: trimmed, output: String(payload?.output ?? ''), isError: false, at: new Date().toISOString() }]);
			setCommand('');
		} catch (error) {
			setHistory((prev) => [...prev, { command: trimmed, output: error instanceof Error ? error.message : 'Command failed', isError: true, at: new Date().toISOString() }]);
		} finally {
			setIsRunning(false);
		}
	};

	const resync = async () => {
		setIsSyncing(true);
		try {
			const response = await fetch(`/api/matches/${matchId}/game-server/sync`, { method: 'POST' });
			const payload = await response.json().catch(() => null);
			if (!response.ok) throw new Error(payload?.error || 'Sync failed');
			setHistory((prev) => [...prev, { command: '(resync match config)', output: String(payload?.serverStatus ?? 'Config re-pushed successfully.'), isError: false, at: new Date().toISOString() }]);
			toast({ title: 'Match config re-pushed to the game server' });
		} catch (error) {
			toast({ variant: 'destructive', title: 'Could not re-sync', description: error instanceof Error ? error.message : undefined });
		} finally {
			setIsSyncing(false);
		}
	};

	return (
		<div className='bg-neutral-950 border border-border rounded-lg p-6 mb-12'>
			<div className='flex items-center justify-between mb-4'>
				<p className='text-xs font-bold uppercase tracking-widest text-neutral-500 flex items-center gap-2'>
					<Terminal className='w-4 h-4' /> RCON Console
				</p>
				<Button size='sm' variant='outline' onClick={resync} disabled={isSyncing} className='border-border text-white hover:bg-neutral-800'>
					<RefreshCw className={`h-4 w-4 mr-2 ${isSyncing ? 'animate-spin' : ''}`} /> Re-sync match config
				</Button>
			</div>

			{!gameServer.matchConfigLoadedAt && (
				<div className='flex items-start gap-2 text-yellow-400 text-xs bg-yellow-500/10 border border-yellow-500/30 rounded-md p-3 mb-4'>
					<AlertTriangle className='w-4 h-4 shrink-0 mt-0.5' />
					<span>The server hasn&apos;t confirmed loading this match&apos;s config yet (maps/teams/password). If players can&apos;t connect or the veto result isn&apos;t live, use &quot;Re-sync match config&quot; or run <code>status</code> below.</span>
				</div>
			)}

			<div ref={historyContainerRef} className='bg-black border border-border rounded-md p-3 h-56 overflow-y-auto font-mono text-xs mb-3 space-y-2'>
				{history.length === 0 ? (
					<p className='text-neutral-600'>No commands run yet. Try `status`.</p>
				) : (
					history.map((entry, i) => (
						<div key={i}>
							<p className='text-neutral-500'>
								$ <span className='text-white'>{entry.command}</span>
							</p>
							<p className={`whitespace-pre-wrap break-all ${entry.isError ? 'text-red-400' : 'text-neutral-300'}`}>{entry.output || '(no output)'}</p>
						</div>
					))
				)}
			</div>

			<div className='flex gap-2'>
				<Input
					value={command}
					onChange={(e) => setCommand(e.target.value)}
					onKeyDown={(e) => {
						if (e.key === 'Enter') runCommand(command);
					}}
					placeholder='Enter RCON command, e.g. status'
					disabled={isRunning}
					className='bg-black border-border text-white font-mono text-sm'
				/>
				<Button onClick={() => runCommand(command)} disabled={isRunning || !command.trim()} className='bg-white text-black hover:bg-neutral-200 shrink-0'>
					{isRunning ? 'Running...' : 'Run'}
				</Button>
			</div>
		</div>
	);
}

/** Lets a pickup lobby side's captain (its first joiner) rename it from the default "Side A"/"Side B" label. */
function LobbyNameEditor({ matchId, side, name, canEdit, onRenamed }: { matchId: string; side: 'TEAM_A' | 'TEAM_B'; name: string; canEdit: boolean; onRenamed: () => void }) {
	const [isEditing, setIsEditing] = useState(false);
	const [value, setValue] = useState(name);
	const [isSaving, setIsSaving] = useState(false);
	const { toast } = useToast();

	if (!canEdit) return null;

	if (!isEditing) {
		return (
			<button
				type='button'
				onClick={() => {
					setValue(name);
					setIsEditing(true);
				}}
				className='text-xs text-neutral-500 hover:text-white underline'
			>
				Rename
			</button>
		);
	}

	const save = async () => {
		const trimmed = value.trim();
		if (!trimmed) return;
		setIsSaving(true);
		try {
			const response = await fetch(`/api/matches/${matchId}/team-name`, {
				method: 'PATCH',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ side, name: trimmed }),
			});
			const payload = await response.json().catch(() => null);
			if (!response.ok) throw new Error(payload?.error || 'Failed to rename');
			setIsEditing(false);
			onRenamed();
		} catch (error) {
			console.error('Failed to rename lobby side', error);
			toast({ variant: 'destructive', title: 'Could not rename', description: error instanceof Error ? error.message : undefined });
		} finally {
			setIsSaving(false);
		}
	};

	return (
		<div className='flex items-center gap-2 mt-1'>
			<Input value={value} onChange={(e) => setValue(e.target.value)} maxLength={30} className='h-8 bg-black border-border text-white text-sm w-40' />
			<Button size='sm' onClick={save} disabled={isSaving || !value.trim()}>
				Save
			</Button>
			<Button size='sm' variant='outline' onClick={() => setIsEditing(false)}>
				Cancel
			</Button>
		</div>
	);
}

function PickupRosterPanel({
	side,
	participants,
	currentUserId,
	canJoin,
	isDraftMode,
	pendingSide,
	onJoin,
	onLeave,
}: {
	side: 'TEAM_A' | 'TEAM_B';
	participants: Participant[];
	currentUserId: string | null;
	canJoin: boolean;
	// CAPTAIN_DRAFT pickups fill this side via draft picks, not a per-side "join this side" click
	// (see DraftPanel/the join route) — empty slots here are just informational.
	isDraftMode: boolean;
	pendingSide: string | null;
	onJoin: (side: 'TEAM_A' | 'TEAM_B') => void;
	onLeave: () => void;
}) {
	const slots: Array<Participant | null> = Array.from({ length: 5 }, (_, i) => participants[i] ?? null);
	const isPending = pendingSide !== null;

	return (
		<div className='divide-y divide-border min-h-[360px]'>
			{slots.map((participant, index) => {
				if (!participant) {
					return (
						<div key={`empty-${index}`} className='px-8 py-5 flex items-center gap-4'>
							<span className='text-neutral-600 font-bold text-sm w-6'>{String(index + 1).padStart(2, '0')}</span>
							<div className='w-10 h-10 rounded-full border border-dashed border-border' />
							{isDraftMode ? (
								<span className='text-neutral-500 font-medium flex-1'>Awaiting draft pick</span>
							) : canJoin ? (
								<button type='button' onClick={() => onJoin(side)} disabled={isPending} className='text-white font-medium flex-1 text-left hover:underline disabled:opacity-50'>
									{pendingSide === side ? 'Joining...' : 'Join this side'}
								</button>
							) : (
								<span className='text-neutral-500 font-medium flex-1'>Open Slot</span>
							)}
						</div>
					);
				}

				const isMe = participant.user.id === currentUserId;
				return (
					<div key={participant.user.id} className='px-8 py-5 flex items-center gap-4'>
						<span className='text-neutral-600 font-bold text-sm w-6'>{String(index + 1).padStart(2, '0')}</span>
						{participant.user.image ? (
							<Image src={participant.user.image} alt={participant.user.name || 'Player'} width={40} height={40} className='rounded-full border border-border' />
						) : (
							<div className='w-10 h-10 rounded-full border border-border flex items-center justify-center text-xs text-neutral-400'>{(participant.user.name || 'P').charAt(0).toUpperCase()}</div>
						)}
						<Link href={`/profile/${participant.user.id}`} className='text-white font-medium flex-1 hover:underline'>
							{participant.user.name || 'Unknown Player'}
							{isMe && <span className='text-neutral-500'> (You)</span>}
							{participant.isCaptain && <span className='text-yellow-500 text-xs font-bold uppercase ml-1.5'>Captain</span>}
						</Link>
						{participant.user.faceitLevel !== null && <LevelBadge level={participant.user.faceitLevel} size='sm' />}
						{isMe && canJoin && (
							<Button variant='ghost' size='sm' onClick={onLeave} disabled={isPending} className='text-red-400 hover:text-red-300 hover:bg-red-500/10'>
								Leave
							</Button>
						)}
					</div>
				);
			})}
		</div>
	);
}

/**
 * Old-FPL-style captain draft (see draft.ts): the first 2 joiners are auto-assigned as captains,
 * everyone after that joins a shared pool until picked. Sits above the roster/veto panels while
 * the draft's still in progress — join.tsx/the join route puts new joiners in the pool
 * automatically, this panel is only for the actual pick actions.
 */
function DraftPanel({
	matchId,
	match,
	draft,
	currentUserId,
	canManage,
	canJoinPool,
	isJoiningPool,
	onJoinPool,
	onDraftUpdated,
}: {
	matchId: string;
	match: Match;
	draft: DraftState;
	currentUserId: string | null;
	canManage: boolean;
	canJoinPool: boolean;
	isJoiningPool: boolean;
	onJoinPool: () => void;
	onDraftUpdated: (next: DraftState) => void;
}) {
	const [pendingUserId, setPendingUserId] = useState<string | null>(null);
	const { toast } = useToast();

	const teamALabel = match.teamAName || 'Side A';
	const teamBLabel = match.teamBName || 'Side B';
	const isComplete = draft.phase === 'COMPLETE';

	const isActingCaptain =
		(draft.currentTurnSide === 'TEAM_A' && draft.captainAUserId === currentUserId) || (draft.currentTurnSide === 'TEAM_B' && draft.captainBUserId === currentUserId);
	const isMyTurn = isActingCaptain || canManage;
	const actingAsAdmin = canManage && !isActingCaptain;

	const poolPlayers = draft.poolUserIds.map((userId) => match.participants.find((p) => p.userId === userId)).filter((p): p is Participant => !!p);
	const captainA = match.participants.find((p) => p.userId === draft.captainAUserId);
	const captainB = match.participants.find((p) => p.userId === draft.captainBUserId);
	const pickedFor = (side: 'TEAM_A' | 'TEAM_B') => draft.picks.filter((pick) => pick.captainSide === side).map((pick) => match.participants.find((p) => p.userId === pick.pickedUserId)).filter((p): p is Participant => !!p);

	const pick = async (pickedUserId: string) => {
		if (!draft.currentTurnSide || pendingUserId) return;
		setPendingUserId(pickedUserId);
		try {
			const response = await fetch(`/api/matches/${matchId}/draft`, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ pickedUserId }),
			});
			const payload = await response.json().catch(() => null);
			if (!response.ok) throw new Error(payload?.error || 'Failed to record pick');
			onDraftUpdated(payload as DraftState);
		} catch (error) {
			console.error('Failed to record draft pick', error);
			toast({ variant: 'destructive', title: 'Could not record pick', description: error instanceof Error ? error.message : undefined });
		} finally {
			setPendingUserId(null);
		}
	};

	if (draft.phase === 'NOT_STARTED' && (!draft.captainAUserId || !draft.captainBUserId)) {
		return (
			<div className='bg-neutral-950 border border-border rounded-lg p-6 mb-12 text-center'>
				<p className='text-xs font-bold uppercase tracking-widest text-neutral-500 mb-2'>Captain Draft</p>
				<p className='text-sm text-neutral-400 mb-4'>Waiting for both captains to join before the draft can start. The first 2 to join become captains.</p>
				{canJoinPool && (
					<Button onClick={onJoinPool} disabled={isJoiningPool} className='bg-white text-black hover:bg-neutral-200'>
						{isJoiningPool ? 'Joining...' : 'Join Lobby'}
					</Button>
				)}
			</div>
		);
	}

	return (
		<div className='bg-neutral-950 border border-border rounded-lg p-6 mb-12'>
			<div className='flex items-center justify-between mb-4'>
				<p className='text-xs font-bold uppercase tracking-widest text-neutral-500'>Captain Draft {isComplete && '· Complete'}</p>
				{canJoinPool && !isComplete && (
					<Button size='sm' onClick={onJoinPool} disabled={isJoiningPool} className='bg-white text-black hover:bg-neutral-200'>
						{isJoiningPool ? 'Joining...' : 'Join Pool'}
					</Button>
				)}
			</div>

			<div className='flex items-center justify-center gap-6 mb-5'>
				{(['TEAM_A', 'TEAM_B'] as const).map((side) => {
					const captain = side === 'TEAM_A' ? captainA : captainB;
					const label = side === 'TEAM_A' ? teamALabel : teamBLabel;
					const picks = pickedFor(side);
					const isActive = !isComplete && draft.currentTurnSide === side;
					return (
						<div key={side} className={`flex-1 max-w-xs transition-opacity ${isActive ? 'opacity-100' : 'opacity-60'}`}>
							<div className='flex items-center gap-2 mb-2'>
								{captain?.user.image ? <Image src={captain.user.image} alt={label} width={32} height={32} className='rounded-full border border-border' /> : <div className='h-8 w-8 rounded-full bg-neutral-800 border border-border' />}
								<div className='min-w-0'>
									<p className='text-white font-bold text-sm truncate'>{captain?.user.name || 'Waiting...'}</p>
									<p className='text-[10px] text-neutral-500 uppercase'>{label} Captain</p>
								</div>
								{isActive && <span className='ml-auto inline-flex items-center gap-1 text-[10px] text-green-400 font-bold uppercase'><span className='h-1.5 w-1.5 rounded-full bg-green-400 animate-pulse' />Picking</span>}
							</div>
							<div className='flex flex-wrap gap-1.5'>
								{picks.map((p) => (
									<span key={p.userId} className='text-xs bg-black border border-border rounded px-2 py-1 text-neutral-300'>
										{p.user.name || 'Player'}
									</span>
								))}
							</div>
						</div>
					);
				})}
			</div>

			{!isComplete && (
				<p className='text-white text-sm text-center mb-4 flex items-center justify-center gap-1.5'>
					{actingAsAdmin && <ShieldCheck className='h-4 w-4 text-amber-400' />}
					{actingAsAdmin
						? 'Acting as admin: picking from the pool'
						: isMyTurn
							? 'Your turn to pick from the pool'
							: `Waiting for ${draft.currentTurnSide === 'TEAM_A' ? teamALabel : teamBLabel} to pick`}
				</p>
			)}

			{poolPlayers.length > 0 && (
				<div>
					<p className='text-xs uppercase tracking-widest text-neutral-500 mb-2'>Pool ({poolPlayers.length} left)</p>
					<div className='grid grid-cols-2 sm:grid-cols-4 gap-2'>
						{poolPlayers.map((p) => {
							const clickable = !isComplete && isMyTurn;
							return (
								<button
									key={p.userId}
									type='button'
									disabled={!clickable || pendingUserId !== null}
									onClick={() => pick(p.userId)}
									className={`border rounded-md p-2.5 flex items-center gap-2 text-left transition-colors ${clickable ? 'border-border hover:border-white cursor-pointer' : 'border-border cursor-default opacity-70'}`}
								>
									{p.user.image ? <Image src={p.user.image} alt={p.user.name || 'Player'} width={28} height={28} className='rounded-full border border-border shrink-0' /> : <div className='h-7 w-7 rounded-full bg-neutral-800 shrink-0' />}
									<span className='text-sm text-white truncate'>{pendingUserId === p.userId ? 'Picking...' : p.user.name || 'Player'}</span>
								</button>
							);
						})}
					</div>
				</div>
			)}
		</div>
	);
}

function VetoPanel({ matchId, match, veto, currentUserId, canManage, onVetoUpdated }: { matchId: string; match: Match; veto: VetoState; currentUserId: string | null; canManage: boolean; onVetoUpdated: (next: VetoState) => void }) {
	const [pendingMap, setPendingMap] = useState<string | null>(null);
	const { toast } = useToast();

	const teamALabel = match.teamAName || match.teamA?.name || 'Side A';
	const teamBLabel = match.teamBName || match.teamB?.name || 'Side B';

	const actingTeam = match.isPickup ? null : veto.currentTurnTeamId === match.teamA?.id ? match.teamA : veto.currentTurnTeamId === match.teamB?.id ? match.teamB : null;
	const actingSideLabel = match.isPickup ? (veto.currentTurnSide === 'TEAM_A' ? teamALabel : veto.currentTurnSide === 'TEAM_B' ? teamBLabel : null) : (actingTeam?.name ?? null);
	const isSideTurn = match.isPickup
		? match.participants.some((p) => p.userId === currentUserId && p.side === veto.currentTurnSide)
		: (actingTeam?.members.some((member) => member.id === currentUserId) ?? false);
	// Admins/organizers can act on behalf of either side (matches the backend's own check) —
	// they just aren't the ones the "your side's turn" copy below is written for.
	const isMyTurn = isSideTurn || canManage;
	const actingAsAdmin = canManage && !isSideTurn;
	const isComplete = veto.phase === 'COMPLETE';

	const act = async (mapName: string) => {
		if (!veto.nextActionType || pendingMap) return;
		setPendingMap(mapName);
		try {
			const response = await fetch(`/api/matches/${matchId}/veto`, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ action: veto.nextActionType, mapName }),
			});
			const payload = await response.json().catch(() => null);
			if (!response.ok) throw new Error(payload?.error || 'Failed to record veto action');
			onVetoUpdated(payload as VetoState);
		} catch (error) {
			console.error('Failed to record veto action', error);
			toast({ variant: 'destructive', title: 'Could not record action', description: error instanceof Error ? error.message : undefined });
		} finally {
			setPendingMap(null);
		}
	};

	const actorNameFor = (action: VetoActionRow) => {
		if (match.isPickup) {
			if (action.side === 'TEAM_A') return teamALabel;
			if (action.side === 'TEAM_B') return teamBLabel;
			return 'System';
		}
		if (action.teamId === match.teamA?.id) return match.teamA?.name ?? 'Team A';
		if (action.teamId === match.teamB?.id) return match.teamB?.name ?? 'Team B';
		return 'System';
	};

	const sideAActive = veto.currentTurnSide === 'TEAM_A' || (!match.isPickup && veto.currentTurnTeamId === match.teamA?.id);
	const sideBActive = veto.currentTurnSide === 'TEAM_B' || (!match.isPickup && veto.currentTurnTeamId === match.teamB?.id);

	const captainA = match.isPickup ? match.participants.filter((p) => p.side === 'TEAM_A')[0] : null;
	const captainB = match.isPickup ? match.participants.filter((p) => p.side === 'TEAM_B')[0] : null;
	const avatarA = match.isPickup ? captainA?.user.image : match.teamA?.logo;
	const avatarB = match.isPickup ? captainB?.user.image : match.teamB?.logo;

	// Faceit-style veto sequence strip: one pip per BAN/PICK step (the DECIDER isn't chosen by
	// either side, so it isn't part of the turn order and doesn't get its own pip), filled in as
	// each happens and colored by which side acted, with the current step pulsing.
	const banPickActions = veto.actions.filter((a) => a.action !== 'DECIDER');
	const sequenceSteps = Array.from({ length: veto.sequenceLength }, (_, i) => {
		const done = banPickActions[i];
		const isCurrent = !isComplete && i === banPickActions.length;
		const stepType = done?.action ?? (i < banPickActions.length ? null : ['BAN', 'BAN', 'PICK', 'PICK', 'BAN', 'BAN'][i] ?? 'BAN');
		return { done, isCurrent, stepType };
	});

	return (
		<div className='bg-neutral-950 border border-border rounded-lg p-6 mb-12'>
			<p className='text-xs font-bold uppercase tracking-widest text-neutral-500 mb-4'>Map Veto &middot; Best of {veto.bestOf}</p>

			{/* FACEIT-style vs header: both sides with their avatar/logo, the active side highlighted and pulsing while it's their turn. */}
			<div className='flex items-center justify-center gap-4 mb-3'>
				<div className={`flex-1 flex items-center justify-end gap-2.5 transition-opacity ${!isComplete && sideAActive ? 'opacity-100' : 'opacity-50'}`}>
					<div className='text-right'>
						<p className='text-white font-black uppercase tracking-wide truncate'>{teamALabel}</p>
						{!isComplete && sideAActive && <span className='inline-flex items-center gap-1 text-[10px] text-green-400 font-bold uppercase justify-end'><span className='h-1.5 w-1.5 rounded-full bg-green-400 animate-pulse' />On the clock</span>}
					</div>
					{avatarA ? <Image src={avatarA} alt={teamALabel} width={40} height={40} className='rounded-full border border-border object-cover shrink-0' /> : <div className='h-10 w-10 rounded-full bg-neutral-800 border border-border shrink-0' />}
				</div>
				<div className='shrink-0 rounded-full border border-border bg-black px-3 py-1 text-xs font-bold text-neutral-400'>VS</div>
				<div className={`flex-1 flex items-center gap-2.5 transition-opacity ${!isComplete && sideBActive ? 'opacity-100' : 'opacity-50'}`}>
					{avatarB ? <Image src={avatarB} alt={teamBLabel} width={40} height={40} className='rounded-full border border-border object-cover shrink-0' /> : <div className='h-10 w-10 rounded-full bg-neutral-800 border border-border shrink-0' />}
					<div className='text-left'>
						<p className='text-white font-black uppercase tracking-wide truncate'>{teamBLabel}</p>
						{!isComplete && sideBActive && <span className='inline-flex items-center gap-1 text-[10px] text-green-400 font-bold uppercase'><span className='h-1.5 w-1.5 rounded-full bg-green-400 animate-pulse' />On the clock</span>}
					</div>
				</div>
			</div>

			{/* Veto sequence pips — ban/pick order at a glance, FACEIT-style. */}
			<div className='flex items-center justify-center gap-1.5 mb-5'>
				{sequenceSteps.map((step, i) => (
					<div
						key={i}
						title={step.done ? `${step.done.action === 'BAN' ? 'Ban' : 'Pick'} ${i + 1}` : `${step.stepType === 'PICK' ? 'Pick' : 'Ban'} ${i + 1}`}
						className={`h-1.5 w-6 rounded-full transition-colors ${
							step.done
								? step.done.action === 'BAN'
									? 'bg-red-500/70'
									: 'bg-green-500/70'
								: step.isCurrent
									? 'bg-white animate-pulse'
									: 'bg-neutral-800'
						}`}
					/>
				))}
			</div>

			{!isComplete && (
				<p className='text-white text-sm text-center mb-4 flex items-center justify-center gap-1.5'>
					{actingAsAdmin && <ShieldCheck className='h-4 w-4 text-amber-400' />}
					{actingAsAdmin
						? `Acting as admin: ${actingSideLabel ?? 'a side'} to ${veto.nextActionType?.toLowerCase()}`
						: isMyTurn
							? `Your ${match.isPickup ? 'side' : "team's"} turn to ${veto.nextActionType?.toLowerCase()}`
							: `Waiting for ${actingSideLabel ?? 'the other side'} to ${veto.nextActionType?.toLowerCase() ?? 'act'}`}
				</p>
			)}

			<div className='grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4'>
				{ACTIVE_DUTY_MAPS.filter((map) => veto.mapPool.includes(map.id)).map((map) => {
					const acted = veto.actions.find((a) => a.mapName === map.id);
					const clickable = !isComplete && isMyTurn && !acted;

					let label = 'Available';
					let className = 'border-border';
					let overlay: ReactNode = null;
					if (acted?.action === 'BAN') {
						label = `Banned by ${actorNameFor(acted)}`;
						className = 'border-red-500/40 bg-red-500/5 opacity-60';
						overlay = <X className='h-8 w-8 text-red-500/80' strokeWidth={3} />;
					} else if (acted?.action === 'PICK') {
						label = `Picked by ${actorNameFor(acted)}`;
						className = 'border-green-500/50 bg-green-500/10';
						overlay = <Check className='h-8 w-8 text-green-500/80' strokeWidth={3} />;
					} else if (acted?.action === 'DECIDER') {
						label = 'Decider';
						className = 'border-white bg-white/10';
						overlay = <Star className='h-8 w-8 text-white/80' strokeWidth={2.5} />;
					}

					return (
						<button
							key={map.id}
							type='button'
							disabled={!clickable || pendingMap !== null}
							onClick={() => act(map.id)}
							className={`relative border rounded-md text-left text-sm transition-colors overflow-hidden aspect-video ${className} ${clickable ? 'hover:border-white cursor-pointer' : 'cursor-default'}`}
						>
							<Image src={map.image} alt='' fill sizes='200px' className={`object-cover transition-opacity ${acted ? 'opacity-30' : 'opacity-60'}`} />
							<div className='absolute inset-0 bg-gradient-to-t from-black via-black/40 to-transparent' />
							{overlay && <div className='absolute inset-0 flex items-center justify-center pointer-events-none'>{overlay}</div>}
							<div className='absolute bottom-0 left-0 right-0 p-2.5'>
								<p className='text-white font-semibold relative'>{map.name}</p>
								<p className='text-xs text-neutral-300 mt-0.5 relative'>{pendingMap === map.id ? 'Submitting...' : label}</p>
							</div>
						</button>
					);
				})}
			</div>

			{veto.actions.length > 0 && (
				<div className='text-xs text-neutral-500 space-y-1 mb-4'>
					{veto.actions.map((a) => {
						const verb = a.action === 'BAN' ? 'banned' : a.action === 'PICK' ? 'picked' : 'left as decider';
						const Icon = a.action === 'BAN' ? X : a.action === 'PICK' ? Check : Star;
						return (
							<p key={a.order} className='flex items-center gap-1.5'>
								<Icon className={`h-3 w-3 shrink-0 ${a.action === 'BAN' ? 'text-red-500' : a.action === 'PICK' ? 'text-green-500' : 'text-white'}`} />
								{actorNameFor(a)} {verb} {getMapDisplayName(a.mapName)}
							</p>
						);
					})}
				</div>
			)}

			{isComplete && (
				<div>
					<p className='text-xs uppercase tracking-widest text-neutral-500 mb-2'>Maps</p>
					<div className='flex flex-wrap gap-2'>
						{veto.confirmedMaps.map((mapId, i) => (
							<Badge key={mapId} className='bg-black border border-border text-white'>
								{i + 1}. {getMapDisplayName(mapId)}
							</Badge>
						))}
					</div>
				</div>
			)}
		</div>
	);
}

const MAP_STATUS_LABEL: Record<string, string> = { SCHEDULED: 'Upcoming', LIVE: 'Live', PAUSED: 'Paused', COMPLETED: 'Final' };

/**
 * Per-map score breakdown (bo1/bo3 series, non-pickup only — pickups have no MatchMap rows, see
 * finalizeVeto) plus the player K/D/A table fed by the game server's playerStats payload
 * (upsertPlayerMatchStats). Renders nothing if there's simply no data yet (e.g. match hasn't
 * started, or the server hasn't posted any stats).
 */
function Scoreboard({ match, teamALabel, teamBLabel }: { match: Match; teamALabel: string; teamBLabel: string }) {
	const maps = match.maps;
	// Pickups have no Cs2Team to group by — their rows carry `side` instead of `teamId` (see
	// PlayerMatchStat.side). Real matches do the reverse, so branch on match type once here rather
	// than threading the distinction through every row.
	let teamAStats: PlayerStatRow[];
	let teamBStats: PlayerStatRow[];
	if (match.isPickup) {
		teamAStats = match.playerStats.filter((s) => s.side === 'TEAM_A');
		teamBStats = match.playerStats.filter((s) => s.side === 'TEAM_B');
	} else {
		const statsByTeam = new Map<number, PlayerStatRow[]>();
		for (const stat of match.playerStats) {
			if (stat.teamId === null) continue;
			const list = statsByTeam.get(stat.teamId) ?? [];
			list.push(stat);
			statsByTeam.set(stat.teamId, list);
		}
		teamAStats = match.teamA ? (statsByTeam.get(match.teamA.id) ?? []) : [];
		teamBStats = match.teamB ? (statsByTeam.get(match.teamB.id) ?? []) : [];
	}

	if (maps.length === 0 && match.playerStats.length === 0) return null;

	return (
		<div className='bg-neutral-950 border border-border rounded-lg p-6 mb-12'>
			<p className='text-xs font-bold uppercase tracking-widest text-neutral-500 mb-4 flex items-center gap-2'>
				<BarChart3 className='w-4 h-4' /> Scoreboard
			</p>

			{maps.length > 0 && (
				<div className='mb-6'>
					<table className='w-full text-sm'>
						<thead>
							<tr className='text-neutral-500 text-xs uppercase tracking-wide text-left'>
								<th className='pb-2 font-medium'>Map</th>
								<th className='pb-2 font-medium text-right'>{teamALabel}</th>
								<th className='pb-2 font-medium text-right'>{teamBLabel}</th>
								<th className='pb-2 font-medium text-right'>Status</th>
							</tr>
						</thead>
						<tbody className='divide-y divide-border'>
							{maps.map((m) => (
								<tr key={m.id}>
									<td className='py-2 text-white font-medium'>{getMapDisplayName(m.mapName)}</td>
									<td className={`py-2 text-right font-mono ${m.winnerId !== null && m.winnerId === match.teamA?.id ? 'text-white font-bold' : 'text-neutral-400'}`}>{m.scoreTeamA ?? '-'}</td>
									<td className={`py-2 text-right font-mono ${m.winnerId !== null && m.winnerId === match.teamB?.id ? 'text-white font-bold' : 'text-neutral-400'}`}>{m.scoreTeamB ?? '-'}</td>
									<td className='py-2 text-right text-neutral-500 text-xs uppercase'>{MAP_STATUS_LABEL[m.status] ?? m.status}</td>
								</tr>
							))}
						</tbody>
					</table>
				</div>
			)}

			{match.playerStats.length > 0 && (
				<div className='grid grid-cols-1 lg:grid-cols-2 gap-6'>
					{[
						{ label: teamALabel, stats: teamAStats },
						{ label: teamBLabel, stats: teamBStats },
					].map(({ label, stats }) => (
						<div key={label}>
							<p className='text-white font-semibold text-sm mb-2'>{label}</p>
							{stats.length === 0 ? (
								<p className='text-neutral-600 text-xs'>No stats yet</p>
							) : (
								<table className='w-full text-sm'>
									<thead>
										<tr className='text-neutral-500 text-xs uppercase tracking-wide text-left'>
											<th className='pb-2 font-medium'>Player</th>
											<th className='pb-2 font-medium text-right'>K</th>
											<th className='pb-2 font-medium text-right'>D</th>
											<th className='pb-2 font-medium text-right'>A</th>
											<th className='pb-2 font-medium text-right'>K/D</th>
										</tr>
									</thead>
									<tbody className='divide-y divide-border'>
										{stats.map((s) => (
											<tr key={s.userId}>
												<td className='py-2 text-white'>{s.user.name || 'Unknown Player'}</td>
												<td className='py-2 text-right font-mono text-neutral-300'>{s.kills}</td>
												<td className='py-2 text-right font-mono text-neutral-300'>{s.deaths}</td>
												<td className='py-2 text-right font-mono text-neutral-300'>{s.assists}</td>
												<td className='py-2 text-right font-mono text-neutral-300'>{(s.deaths > 0 ? s.kills / s.deaths : s.kills).toFixed(2)}</td>
											</tr>
										))}
									</tbody>
								</table>
							)}
						</div>
					))}
				</div>
			)}
		</div>
	);
}

const fetcher = async (url: string) => {
	const response = await fetch(url);
	if (!response.ok) throw new Error('Failed to fetch match');
	const data = await response.json();
	return data.match as Match;
};

const vetoFetcher = async (url: string) => {
	const response = await fetch(url);
	if (!response.ok) throw new Error('Failed to fetch veto state');
	return response.json() as Promise<VetoState>;
};

const draftFetcher = async (url: string) => {
	const response = await fetch(url);
	if (!response.ok) throw new Error('Failed to fetch draft state');
	return response.json() as Promise<DraftState>;
};

export default function MatchPage() {
	const params = useParams();
	const router = useRouter();
	const matchId = params.matchId as string;
	const [copied, setCopied] = useState(false);
	const [canManage, setCanManage] = useState(false);
	const [currentUserId, setCurrentUserId] = useState<string | null>(null);
	const [pendingSide, setPendingSide] = useState<string | null>(null);
	const [isDeleting, setIsDeleting] = useState(false);
	const [showAdminPanel, setShowAdminPanel] = useState(true);
	const { toast } = useToast();

	const { data: match, error, isLoading, mutate } = useSWR(matchId ? `/api/matches/${matchId}` : null, fetcher, { refreshInterval: 4000 });

	const showDraft = !!match && match.isPickup && match.pickupMode === 'CAPTAIN_DRAFT' && match.status === 'SCHEDULED';
	const { data: draft, mutate: mutateDraft } = useSWR<DraftState>(showDraft ? `/api/matches/${matchId}/draft` : null, draftFetcher, { refreshInterval: 3000 });
	// Veto can't start meaningfully until the draft's actually put people on sides — showing it
	// alongside an in-progress draft would let admins ban/pick maps before anyone's even rostered.
	const showVeto = !!match && match.status === 'SCHEDULED' && (draft ? draft.phase === 'COMPLETE' : match.isPickup || (match.teamA !== null && match.teamB !== null));
	const { data: veto, mutate: mutateVeto } = useSWR<VetoState>(showVeto ? `/api/matches/${matchId}/veto` : null, vetoFetcher, { refreshInterval: 3000 });

	useEffect(() => {
		if (error) {
			toast({ variant: 'destructive', title: 'Error loading match' });
		}
	}, [error, toast]);

	useEffect(() => {
		fetch('/api/user')
			.then((r) => (r.ok ? r.json() : null))
			.then((data) => {
				setCanManage(data?.user?.role === 'ADMIN' || data?.user?.role === 'TOURNAMENT_ADMIN');
				setCurrentUserId(data?.user?.id ?? null);
			})
			.catch(() => {
				setCanManage(false);
				setCurrentUserId(null);
			});
	}, []);

	const joinSide = async (side: 'TEAM_A' | 'TEAM_B') => {
		if (!matchId) return;
		setPendingSide(side);
		try {
			const response = await fetch(`/api/matches/${matchId}/join`, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ side }),
			});
			const payload = await response.json().catch(() => null);
			if (!response.ok) throw new Error(payload?.error || 'Failed to join');
			mutate();
		} catch (e) {
			console.error('Failed to join match', e);
			toast({ variant: 'destructive', title: 'Could not join', description: e instanceof Error ? e.message : undefined });
		} finally {
			setPendingSide(null);
		}
	};

	// CAPTAIN_DRAFT pickups have no side to choose at join time — the first 2 joiners become
	// captains automatically and everyone else lands in the pool (see the join route).
	const joinDraftPool = async () => {
		if (!matchId) return;
		setPendingSide('POOL');
		try {
			const response = await fetch(`/api/matches/${matchId}/join`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({}) });
			const payload = await response.json().catch(() => null);
			if (!response.ok) throw new Error(payload?.error || 'Failed to join');
			mutate();
			mutateDraft();
		} catch (e) {
			console.error('Failed to join draft pool', e);
			toast({ variant: 'destructive', title: 'Could not join', description: e instanceof Error ? e.message : undefined });
		} finally {
			setPendingSide(null);
		}
	};

	const leaveMatch = async () => {
		if (!matchId) return;
		setPendingSide('LEAVE');
		try {
			const response = await fetch(`/api/matches/${matchId}/join`, { method: 'DELETE' });
			if (!response.ok) throw new Error('Failed to leave');
			mutate();
		} catch (e) {
			console.error('Failed to leave match', e);
			toast({ variant: 'destructive', title: 'Could not leave match' });
		} finally {
			setPendingSide(null);
		}
	};

	const deleteMatch = async () => {
		if (!matchId) return;
		if (!window.confirm('Permanently delete this match? This removes its scores, roster, map/veto history, and game server record. This cannot be undone.')) return;
		setIsDeleting(true);
		try {
			const response = await fetch(`/api/matches/${matchId}`, { method: 'DELETE' });
			const payload = await response.json().catch(() => null);
			if (!response.ok) throw new Error(payload?.error || 'Failed to delete match');
			toast({ title: 'Match deleted' });
			router.push('/matches');
		} catch (e) {
			console.error('Failed to delete match', e);
			toast({ variant: 'destructive', title: 'Could not delete match', description: e instanceof Error ? e.message : undefined });
			setIsDeleting(false);
		}
	};

	if (isLoading) {
		return (
			<div className='min-h-screen bg-black py-12'>
				<div className='max-w-7xl mx-auto px-4'>
					<Skeleton className='h-96 w-full bg-neutral-900 rounded-lg mb-6' />
					<Skeleton className='h-40 w-full bg-neutral-900 rounded-lg' />
				</div>
			</div>
		);
	}

	if (!match) {
		return (
			<div className='min-h-screen bg-black py-12 flex items-center justify-center'>
				<div className='text-center max-w-md'>
					<div className='w-16 h-16 rounded-full border-2 border-white mx-auto mb-6 flex items-center justify-center'>
						<Target className='w-8 h-8 text-white' />
					</div>
					<h2 className='text-3xl font-bold text-white mb-2'>Match Not Found</h2>
					<p className='text-neutral-400'>The match you're looking for doesn't exist.</p>
				</div>
			</div>
		);
	}

	const visibleTeamAMembers = match.teamA ? fillTeamToFive(match.teamA.members) : [];
	const visibleTeamBMembers = match.teamB ? fillTeamToFive(match.teamB.members) : [];
	const sideAParticipants = match.participants.filter((p) => p.side === 'TEAM_A');
	const sideBParticipants = match.participants.filter((p) => p.side === 'TEAM_B');
	const canJoinPickup = match.isPickup && match.status === 'SCHEDULED';
	// Participants are already ordered by joinedAt ascending (see the match GET route), so the
	// first entry for a side is that side's "captain" — the only one allowed to rename it.
	const canRenameSideA = canJoinPickup && sideAParticipants[0]?.userId === currentUserId;
	const canRenameSideB = canJoinPickup && sideBParticipants[0]?.userId === currentUserId;
	const teamALabel = match.isPickup ? match.teamAName || 'Side A' : (match.teamA?.name ?? 'Team A');
	const teamBLabel = match.isPickup ? match.teamBName || 'Side B' : (match.teamB?.name ?? 'Team B');
	const winnerName = match.isPickup ? (match.winnerSide === 'TEAM_A' ? teamALabel : match.winnerSide === 'TEAM_B' ? teamBLabel : null) : (match.winner?.name ?? null);
	// The map currently in progress (maps are pre-sorted by order) — its score is kept live by
	// MatchZy's round_end webhook (see updateLiveScore). Pickups get real MatchMap rows too now
	// (finalizeVeto creates one per confirmed map for every match, not just series ones).
	const currentMap = match.maps.find((m) => m.status !== 'COMPLETED');
	// Once every map's done there's no "current" one — fall back to the last map played (the
	// decider, for a finished series) so a completed match still has something to point its map
	// background/name at instead of going blank.
	const lastPlayedMap = match.maps.length > 0 ? match.maps[match.maps.length - 1] : undefined;
	const displayMap = currentMap ?? lastPlayedMap;
	const displayMapId = displayMap?.mapName ?? null;
	const heroMapImage = displayMapId ? getMapImage(displayMapId) : null;
	const isSeries = (match.bestOf ?? 1) > 1;
	// A finished bo3's headline number should be the series result (2-1 maps), not just whatever
	// round score the last map happened to end on — that's still shown as a small subtitle below
	// while the series is actually in progress (see the hero's "Score" section), but the map-win
	// count is what actually matters once it's over. Bo1 has no separate "series" score at all —
	// Matches.scoreTeamA/B and the map's own round score are the same 13-9 by the time it's decided.
	const showSeriesScoreAsHeadline = isSeries && match.status === 'COMPLETED';
	const roundScoreA = showSeriesScoreAsHeadline ? (match.scoreTeamA ?? 0) : displayMap ? (displayMap.scoreTeamA ?? 0) : (match.scoreTeamA ?? 0);
	const roundScoreB = showSeriesScoreAsHeadline ? (match.scoreTeamB ?? 0) : displayMap ? (displayMap.scoreTeamB ?? 0) : (match.scoreTeamB ?? 0);
	// Starting a match restarts its assigned server's container onto the right map (see
	// src/lib/cs2/provisioning.ts's restartServerOntoMap) — that can take a minute or two, during
	// which `gameServer` already exists (created early) but the real server hasn't actually loaded
	// this match yet. Gate the connect info on `matchConfigLoadedAt`, not just `gameServer`
	// existing, so players don't try to connect before there's anything to connect to.
	const serverReady = !!match.gameServer?.matchConfigLoadedAt;
	const connectAddress = match.gameServer && serverReady ? `${match.gameServer.connectIp}:${match.gameServer.port}` : null;
	// The `password` cvar must be set BEFORE `connect` runs — it's read as part of the connection
	// handshake, so `connect ip:port; password x` (setting it after) is a well-known cause of
	// "Bad Password" on Source-engine servers even with the right password.
	const connectCommand = connectAddress ? `${match.gameServer?.password ? `password ${match.gameServer.password}; ` : ''}connect ${connectAddress}` : null;
	// `rungameid` launches Steam/CS2 (starting it if it isn't running) and passes `+connect` as a
	// startup command, unlike the plain `steam://run/730//+...` launch-options form this used to
	// build (launch options only apply the *next* time the game is manually started, so it never
	// actually auto-joined).
	const steamConnectUrl = connectAddress ? `steam://rungameid/730/+connect ${connectAddress}${match.gameServer?.password ? `; password ${match.gameServer.password}` : ''}` : null;

	const copyToClipboard = (text: string) => {
		navigator.clipboard.writeText(text);
		setCopied(true);
		setTimeout(() => setCopied(false), 2000);
	};

	const launchCS2 = () => {
		if (steamConnectUrl) window.location.href = steamConnectUrl;
	};

	const statusConfig = {
		COMPLETED: { badge: 'COMPLETED', borderClass: 'border-white' },
		LIVE: { badge: 'LIVE', borderClass: 'border-white animate-pulse' },
		PAUSED: { badge: 'PAUSED', borderClass: 'border-yellow-500' },
		SCHEDULED: { badge: 'UPCOMING', borderClass: 'border-border' },
	};
	const status = statusConfig[match.status];

	return (
		<div className='min-h-screen bg-black text-white py-12'>
			<div className='max-w-7xl mx-auto px-4'>
				{/* Header — compact single row; admin tools live behind the gear icon, not inline here */}
				<div className='flex items-center justify-between gap-4 mb-6 flex-wrap'>
					<div className='flex items-center gap-3'>
						<div className='w-1 h-10 bg-white shrink-0' />
						<div>
							<p className='text-neutral-400 text-xs tracking-widest uppercase'>{match.tournament.name}</p>
							<div className='flex items-center gap-2'>
								<h1 className='text-2xl font-black tracking-tight'>MATCH {match.id}</h1>
								<Badge className={`${status.borderClass} bg-black border-2 text-white px-2.5 py-0.5 font-bold tracking-wider uppercase text-[10px]`}>{status.badge}</Badge>
							</div>
						</div>
					</div>
					<div className='flex items-center gap-3'>
						<div className='hidden sm:flex items-center gap-1.5 text-neutral-500 text-xs'>
							<Clock className='w-3.5 h-3.5' />
							{new Date(match.matchDate).toLocaleString()}
						</div>
						<MatchTimer match={match} />
						{canManage && (
							<Button
								variant='outline'
								size='icon'
								onClick={() => setShowAdminPanel((v) => !v)}
								className={showAdminPanel ? 'border-white text-white bg-neutral-900' : 'border-border text-neutral-400 hover:text-white hover:border-white'}
								title='Admin tools'
							>
								<Settings className='h-4 w-4' />
							</Button>
						)}
					</div>
				</div>

				{canManage && showAdminPanel && (
					<div className='mb-8 space-y-4 rounded-lg border border-border bg-neutral-950/60 p-4'>
						<AdminControls match={match} vetoComplete={!showVeto || veto?.phase === 'COMPLETE'} onChanged={() => mutate()} />
						{match.gameServer && match.status !== 'COMPLETED' && <RconConsole matchId={matchId} gameServer={match.gameServer} />}
						<div className='flex justify-end'>
							<Button variant='outline' size='sm' disabled={isDeleting} onClick={deleteMatch} className='border-border text-neutral-400 hover:text-red-400 hover:border-red-400'>
								<Trash2 className='h-3.5 w-3.5 mr-2' /> Delete Match
							</Button>
						</div>
					</div>
				)}

				{showDraft && draft && (
					<DraftPanel
						matchId={matchId}
						match={match}
						draft={draft}
						currentUserId={currentUserId}
						canManage={canManage}
						canJoinPool={!match.participants.some((p) => p.userId === currentUserId)}
						isJoiningPool={pendingSide === 'POOL'}
						onJoinPool={joinDraftPool}
						onDraftUpdated={(next) => {
							mutateDraft(next, false);
							if (next.phase === 'COMPLETE') mutate();
						}}
					/>
				)}

				{showVeto && veto && (
					<VetoPanel
						matchId={matchId}
						match={match}
						veto={veto}
						currentUserId={currentUserId}
						canManage={canManage}
						onVetoUpdated={(next) => {
							mutateVeto(next, false);
							if (next.phase === 'COMPLETE') mutate();
						}}
					/>
				)}

				{/* Hero — FACEIT-style: team vs team with the score front and center, decided/current map as a
				    dimmed background rather than its own boxed-off column. */}
				<div className='relative bg-neutral-950 border border-border rounded-lg overflow-hidden mb-6'>
					{heroMapImage && (
						<div className='absolute inset-0'>
							<Image src={heroMapImage} alt='' fill priority sizes='100vw' className='object-cover opacity-25' />
							<div className='absolute inset-0 bg-gradient-to-t from-black via-black/75 to-black/50' />
						</div>
					)}
					<div className='relative grid grid-cols-1 sm:grid-cols-[1fr_auto_1fr] items-center gap-5 sm:gap-8 px-6 sm:px-10 py-10'>
						{/* Team A */}
						<div className='flex items-center gap-4 justify-center sm:justify-end order-1 min-w-0'>
							<div className='text-center sm:text-right min-w-0'>
								<h2 className='text-lg sm:text-2xl font-black uppercase tracking-wide leading-tight truncate'>{teamALabel}</h2>
								{match.isPickup && match.status === 'SCHEDULED' && <p className='text-neutral-500 text-xs mt-1'>{sideAParticipants.length}/5 joined</p>}
							</div>
							<div
								className='w-16 h-16 sm:w-20 sm:h-20 rounded-xl flex items-center justify-center overflow-hidden border-2 border-border bg-black shrink-0'
								style={!match.isPickup && match.teamA ? { backgroundColor: match.teamA.background || '#000000' } : undefined}
							>
								{match.isPickup ? (
									<span className='text-white font-black text-2xl'>{teamALabel.substring(0, 2).toUpperCase()}</span>
								) : match.teamA ? (
									<TeamLogo logo={match.teamA.logo} name={match.teamA.name} />
								) : (
									<span className='text-neutral-600 font-black text-lg'>TBD</span>
								)}
							</div>
						</div>

						{/* Score — while a map's actually being played, the big number is that map's live
						    round score (13-9), not the series map-win count, which would otherwise sit at
						    "0-0" for an entire bo3 map. For a bo3, the map-win count still shows as a small
						    line above it so the series state isn't lost. */}
						<div className='text-center order-3 sm:order-2'>
							{match.status === 'SCHEDULED' && !(showVeto && veto?.phase === 'COMPLETE') ? (
								<div className='text-3xl font-black text-neutral-600'>VS</div>
							) : (
								<>
									{isSeries && !showSeriesScoreAsHeadline && (
										<p className='text-xs text-neutral-500 uppercase tracking-widest mb-1'>
											Maps {match.scoreTeamA ?? 0} - {match.scoreTeamB ?? 0}
										</p>
									)}
									<div className='text-5xl sm:text-6xl font-black tabular-nums'>
										{roundScoreA} <span className='text-neutral-600'>:</span> {roundScoreB}
									</div>
								</>
							)}
							{displayMapId && <p className='text-neutral-400 text-xs uppercase tracking-widest mt-2'>{getMapDisplayName(displayMapId)}</p>}
						</div>

						{/* Team B */}
						<div className='flex items-center gap-4 justify-center sm:justify-start order-2 sm:order-3 min-w-0'>
							<div
								className='w-16 h-16 sm:w-20 sm:h-20 rounded-xl flex items-center justify-center overflow-hidden border-2 border-border bg-black shrink-0'
								style={!match.isPickup && match.teamB ? { backgroundColor: match.teamB.background || '#000000' } : undefined}
							>
								{match.isPickup ? (
									<span className='text-white font-black text-2xl'>{teamBLabel.substring(0, 2).toUpperCase()}</span>
								) : match.teamB ? (
									<TeamLogo logo={match.teamB.logo} name={match.teamB.name} />
								) : (
									<span className='text-neutral-600 font-black text-lg'>TBD</span>
								)}
							</div>
							<div className='text-center sm:text-left min-w-0'>
								<h2 className='text-lg sm:text-2xl font-black uppercase tracking-wide leading-tight truncate'>{teamBLabel}</h2>
								{match.isPickup && match.status === 'SCHEDULED' && <p className='text-neutral-500 text-xs mt-1'>{sideBParticipants.length}/5 joined</p>}
							</div>
						</div>
					</div>
				</div>

				{/* Server / connect strip — one compact row instead of a boxed-off column */}
				{match.status === 'COMPLETED' ? (
					<MatchDemoPanel match={match} />
				) : (
					<div className='flex flex-col sm:flex-row items-stretch gap-3 bg-neutral-950 border border-border rounded-lg p-4 mb-6'>
						<div className='flex-1 min-w-0 flex flex-col justify-center gap-1'>
							{match.status === 'SCHEDULED' && match.gameServer && (
								<div className='flex items-center gap-2 text-xs'>
									{match.gameServer.matchConfigLoadedAt ? (
										<>
											<span className='w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse shrink-0' />
											<span className='text-white'>Warming up with bots — join early to practice</span>
										</>
									) : (
										<>
											<span className='w-1.5 h-1.5 rounded-full bg-yellow-500 shrink-0' />
											<span className='text-neutral-400'>Provisioning server…</span>
										</>
									)}
								</div>
							)}
							{connectAddress ? (
								<div className='flex flex-wrap items-center gap-x-6 gap-y-1 text-sm'>
									<div>
										<span className='text-neutral-500 uppercase text-[10px] tracking-wide mr-2'>IP</span>
										<span className='font-mono text-white'>{connectAddress}</span>
									</div>
									{match.gameServer?.password && (
										<div>
											<span className='text-neutral-500 uppercase text-[10px] tracking-wide mr-2'>Password</span>
											<span className='font-mono text-white'>{match.gameServer.password}</span>
										</div>
									)}
								</div>
							) : match.gameServer && !serverReady ? (
								<div className='flex items-center gap-2 text-sm text-neutral-500'>
									<RefreshCw className='h-4 w-4 animate-spin shrink-0' />
									Server is starting up — this can take a minute or two
								</div>
							) : (
								<p className='text-sm text-neutral-500'>
									{match.status === 'SCHEDULED'
										? match.isPickup
											? 'Server opens once the match is started'
											: 'Server opens ~5 min before match start'
										: 'Waiting for a free server — all pool servers are currently in use'}
								</p>
							)}
						</div>
						<div className='flex gap-2 shrink-0 flex-wrap sm:flex-nowrap'>
							<Button size='sm' disabled={!connectAddress} onClick={() => connectAddress && copyToClipboard(connectAddress)} className='bg-white text-black font-bold hover:bg-neutral-200 disabled:opacity-40'>
								<Copy className='h-3.5 w-3.5 mr-1.5' />
								{copied ? 'Copied!' : 'Copy IP'}
							</Button>
							<Button size='sm' variant='outline' disabled={!connectCommand} onClick={() => connectCommand && copyToClipboard(connectCommand)} className='border-border text-white hover:bg-neutral-800 disabled:opacity-40'>
								<Gamepad2 className='h-3.5 w-3.5 mr-1.5' />
								Command
							</Button>
							<Button size='sm' variant='outline' disabled={!steamConnectUrl} onClick={launchCS2} className='border-border text-white hover:bg-neutral-800 disabled:opacity-40'>
								<ExternalLink className='h-3.5 w-3.5 mr-1.5' />
								Launch
							</Button>
						</div>
					</div>
				)}

				{/* Teams Rosters */}
				<div className='grid grid-cols-1 lg:grid-cols-2 gap-8 mb-12'>
					{/* Team A Roster */}
					<div className='bg-neutral-950 border border-border rounded-lg overflow-hidden'>
						<div className='bg-black px-8 py-6 border-b border-border'>
							<div className='flex items-center gap-3 mb-1'>
								<Users className='w-5 h-5' />
								<h3 className='text-lg font-black uppercase tracking-wider'>{match.isPickup ? match.teamAName || 'Side A' : (match.teamA?.name ?? 'TBD')}</h3>
							</div>
							{!match.isPickup && <p className='text-neutral-400 text-sm mb-1'>Roster ({match.teamA?.members.length ?? 0}/5)</p>}
							{match.isPickup && <LobbyNameEditor matchId={matchId} side='TEAM_A' name={match.teamAName || ''} canEdit={canRenameSideA} onRenamed={() => mutate()} />}
						</div>
						{match.isPickup ? (
							<PickupRosterPanel side='TEAM_A' participants={sideAParticipants} currentUserId={currentUserId} canJoin={canJoinPickup} isDraftMode={match.pickupMode === 'CAPTAIN_DRAFT'} pendingSide={pendingSide} onJoin={joinSide} onLeave={leaveMatch} />
						) : (
							<div className='divide-y divide-border min-h-[360px]'>
								{visibleTeamAMembers.map((member, index) => {
									const isPlaceholder = member.id.startsWith('placeholder-');

									if (isPlaceholder) {
										return (
											<div key={member.id} className='px-8 py-5 flex items-center gap-4 opacity-70'>
												<span className='text-neutral-600 font-bold text-sm w-6'>{String(index + 1).padStart(2, '0')}</span>
												<div className='w-10 h-10 rounded-full border border-dashed border-border' />
												<span className='text-neutral-500 font-medium flex-1'>Open Slot</span>
												<Badge className='bg-transparent border border-border text-neutral-500 text-xs'>LVL -</Badge>
											</div>
										);
									}

									return (
										<Link key={member.id} href={`/profile/${member.id}`} className='px-8 py-5 hover:bg-neutral-900 transition-colors flex items-center gap-4 group'>
											<span className='text-neutral-600 font-bold text-sm w-6'>{String(index + 1).padStart(2, '0')}</span>
											{member.image ? (
												<Image src={member.image} alt={member.name || 'Player'} width={40} height={40} className='rounded-full border border-border group-hover:border-white transition-colors' />
											) : (
												<div className='w-10 h-10 rounded-full border border-border flex items-center justify-center text-xs text-neutral-400'>{(member.name || 'P').charAt(0).toUpperCase()}</div>
											)}
											<span className='text-white font-medium flex-1'>{member.name || 'Unknown Player'}</span>
											{member.faceitLevel !== null && <LevelBadge level={member.faceitLevel} size='sm' />}
										</Link>
									);
								})}
							</div>
						)}
					</div>

					{/* Team B Roster */}
					<div className='bg-neutral-950 border border-border rounded-lg overflow-hidden'>
						<div className='bg-black px-8 py-6 border-b border-border'>
							<div className='flex items-center gap-3 mb-1'>
								<Users className='w-5 h-5' />
								<h3 className='text-lg font-black uppercase tracking-wider'>{match.isPickup ? match.teamBName || 'Side B' : (match.teamB?.name ?? 'TBD')}</h3>
							</div>
							{!match.isPickup && <p className='text-neutral-400 text-sm mb-1'>Roster ({match.teamB?.members.length ?? 0}/5)</p>}
							{match.isPickup && <LobbyNameEditor matchId={matchId} side='TEAM_B' name={match.teamBName || ''} canEdit={canRenameSideB} onRenamed={() => mutate()} />}
						</div>
						{match.isPickup ? (
							<PickupRosterPanel side='TEAM_B' participants={sideBParticipants} currentUserId={currentUserId} canJoin={canJoinPickup} isDraftMode={match.pickupMode === 'CAPTAIN_DRAFT'} pendingSide={pendingSide} onJoin={joinSide} onLeave={leaveMatch} />
						) : (
							<div className='divide-y divide-border min-h-[360px]'>
								{visibleTeamBMembers.map((member, index) => {
									const isPlaceholder = member.id.startsWith('placeholder-');

									if (isPlaceholder) {
										return (
											<div key={member.id} className='px-8 py-5 flex items-center gap-4 opacity-70'>
												<span className='text-neutral-600 font-bold text-sm w-6'>{String(index + 1).padStart(2, '0')}</span>
												<div className='w-10 h-10 rounded-full border border-dashed border-border' />
												<span className='text-neutral-500 font-medium flex-1'>Open Slot</span>
												<Badge className='bg-transparent border border-border text-neutral-500 text-xs'>LVL -</Badge>
											</div>
										);
									}

									return (
										<Link key={member.id} href={`/profile/${member.id}`} className='px-8 py-5 hover:bg-neutral-900 transition-colors flex items-center gap-4 group'>
											<span className='text-neutral-600 font-bold text-sm w-6'>{String(index + 1).padStart(2, '0')}</span>
											{member.image ? (
												<Image src={member.image} alt={member.name || 'Player'} width={40} height={40} className='rounded-full border border-border group-hover:border-white transition-colors' />
											) : (
												<div className='w-10 h-10 rounded-full border border-border flex items-center justify-center text-xs text-neutral-400'>{(member.name || 'P').charAt(0).toUpperCase()}</div>
											)}
											<span className='text-white font-medium flex-1'>{member.name || 'Unknown Player'}</span>
											{member.faceitLevel !== null && <LevelBadge level={member.faceitLevel} size='sm' />}
										</Link>
									);
								})}
							</div>
						)}
					</div>
				</div>

				{/* Winner Card */}
				{match.status === 'COMPLETED' && winnerName && (
					<div className='bg-black border-2 border-white rounded-lg overflow-hidden mb-12'>
						<div className='px-8 py-12 text-center'>
							<div className='inline-flex items-center justify-center w-16 h-16 bg-white rounded-full mb-6'>
								<Trophy className='w-8 h-8 text-black' />
							</div>
							<h2 className='text-4xl font-black uppercase tracking-wider mb-4'>{winnerName} Wins!</h2>
							{(match.scoreTeamA ?? 0) !== (match.scoreTeamB ?? 0) ? (
								<div className='flex items-center justify-center gap-6'>
									<div className='text-center'>
										<p className='text-neutral-400 text-xs uppercase tracking-widest mb-1'>Final Score</p>
										<p className='text-3xl font-black font-mono tabular-nums'>
											{match.scoreTeamA} - {match.scoreTeamB}
										</p>
									</div>
								</div>
							) : (
								// A tied/empty score can't have produced this winner — the result was set by hand
								// (End Match / forced result), so say that instead of printing "0 - 0" under a win.
								<p className='text-neutral-400 text-sm max-w-md mx-auto'>No deciding score was reported by the game server. This result was recorded by an organizer.</p>
							)}
						</div>
					</div>
				)}

				<Scoreboard match={match} teamALabel={teamALabel} teamBLabel={teamBLabel} />
			</div>
		</div>
	);
}
