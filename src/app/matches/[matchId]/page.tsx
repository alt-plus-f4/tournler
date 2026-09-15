'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
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
import { Gamepad2, Trophy, Users, Clock, Target, Copy, ExternalLink, Hourglass, Play, Pause, Flag, Terminal, RefreshCw, AlertTriangle, BarChart3 } from 'lucide-react';
import { ACTIVE_DUTY_MAPS, getMapDisplayName } from '@/lib/tournaments/maps';

interface TeamMember {
	id: string;
	name: string | null;
	image: string | null;
	createdAt?: string;
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
}

type VetoActionType = 'BAN' | 'PICK' | 'DECIDER';

interface VetoActionRow {
	teamId: number | null;
	action: VetoActionType;
	mapName: string;
	order: number;
}

interface VetoState {
	phase: 'NOT_STARTED' | 'IN_PROGRESS' | 'COMPLETE';
	bestOf: 1 | 3;
	mapPool: string[];
	availableMaps: string[];
	actions: VetoActionRow[];
	currentTurnTeamId: number | null;
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
	side: 'TEAM_A' | 'TEAM_B';
	user: { id: string; name: string | null; image: string | null };
}

interface PlayerStatRow {
	userId: string;
	teamId: number;
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
	teamAName: string | null;
	teamBName: string | null;
	bestOf: number | null;
	maps: MatchMapRow[];
	participants: Participant[];
	playerStats: PlayerStatRow[];
}

const getMemberLevel = (member: TeamMember, index: number) => {
	if (member.createdAt) {
		const memberDays = Math.max(0, Math.floor((Date.now() - new Date(member.createdAt).getTime()) / (1000 * 60 * 60 * 24)));
		return Math.floor(memberDays / 30) + 1;
	}

	// Fallback levels so the UI is testable when API data is incomplete.
	return 10 + index;
};

const fillTeamToFive = (members: TeamMember[]) => {
	const placeholdersNeeded = Math.max(0, 5 - members.length);
	const placeholders: TeamMember[] = Array.from({ length: placeholdersNeeded }, (_, i) => ({
		id: `placeholder-${i}`,
		name: 'Open Slot',
		image: null,
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
				toast({ variant: 'destructive', title: 'Match started, but the server config push failed', description: `${payload.configPushError} — use the RCON console below to retry.` });
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
						<Button onClick={() => patch('start', { action: 'START' })} disabled={pendingAction !== null || (!match.isPickup && (match.teamA === null || match.teamB === null)) || !vetoComplete} className='bg-white text-black hover:bg-neutral-200'>
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
				{match.status === 'PAUSED' && (
					<Button onClick={() => patch('resume', { action: 'RESUME' })} disabled={pendingAction !== null} className='bg-white text-black hover:bg-neutral-200'>
						<Play className='h-4 w-4 mr-2' /> Resume
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
	const { toast } = useToast();

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

			<div className='bg-black border border-border rounded-md p-3 h-56 overflow-y-auto font-mono text-xs mb-3 space-y-2'>
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
	pendingSide,
	onJoin,
	onLeave,
}: {
	side: 'TEAM_A' | 'TEAM_B';
	participants: Participant[];
	currentUserId: string | null;
	canJoin: boolean;
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
							{canJoin ? (
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
						</Link>
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

function VetoPanel({ matchId, match, veto, currentUserId, onVetoUpdated }: { matchId: string; match: Match; veto: VetoState; currentUserId: string | null; onVetoUpdated: (next: VetoState) => void }) {
	const [pendingMap, setPendingMap] = useState<string | null>(null);
	const { toast } = useToast();

	const actingTeam = veto.currentTurnTeamId === match.teamA?.id ? match.teamA : veto.currentTurnTeamId === match.teamB?.id ? match.teamB : null;
	const isMyTurn = actingTeam?.members.some((member) => member.id === currentUserId) ?? false;
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

	const teamNameFor = (teamId: number | null) => {
		if (teamId === match.teamA?.id) return match.teamA?.name ?? 'Team A';
		if (teamId === match.teamB?.id) return match.teamB?.name ?? 'Team B';
		return 'System';
	};

	return (
		<div className='bg-neutral-950 border border-border rounded-lg p-6 mb-12'>
			<p className='text-xs font-bold uppercase tracking-widest text-neutral-500 mb-4'>Map Veto &middot; Best of {veto.bestOf}</p>

			{!isComplete && (
				<p className='text-white text-sm mb-4'>
					{isMyTurn ? `Your team's turn to ${veto.nextActionType?.toLowerCase()}` : `Waiting for ${actingTeam?.name ?? 'the other team'} to ${veto.nextActionType?.toLowerCase() ?? 'act'}`}
				</p>
			)}

			<div className='grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4'>
				{ACTIVE_DUTY_MAPS.filter((map) => veto.mapPool.includes(map.id)).map((map) => {
					const acted = veto.actions.find((a) => a.mapName === map.id);
					const clickable = !isComplete && isMyTurn && !acted;

					let label = 'Available';
					let className = 'border-border';
					if (acted?.action === 'BAN') {
						label = `Banned by ${teamNameFor(acted.teamId)}`;
						className = 'border-red-500/40 bg-red-500/5 opacity-50';
					} else if (acted?.action === 'PICK') {
						label = `Picked by ${teamNameFor(acted.teamId)}`;
						className = 'border-green-500/50 bg-green-500/10';
					} else if (acted?.action === 'DECIDER') {
						label = 'Decider';
						className = 'border-white bg-white/10';
					}

					return (
						<button
							key={map.id}
							type='button'
							disabled={!clickable || pendingMap !== null}
							onClick={() => act(map.id)}
							className={`border rounded-md p-3 text-left text-sm transition-colors ${className} ${clickable ? 'hover:border-white cursor-pointer' : 'cursor-default'}`}
						>
							<p className='text-white font-semibold'>{map.name}</p>
							<p className='text-xs text-neutral-400 mt-1'>{pendingMap === map.id ? 'Submitting...' : label}</p>
						</button>
					);
				})}
			</div>

			{veto.actions.length > 0 && (
				<div className='text-xs text-neutral-500 space-y-1 mb-4'>
					{veto.actions.map((a) => {
						const verb = a.action === 'BAN' ? 'banned' : a.action === 'PICK' ? 'picked' : 'left as decider';
						return (
							<p key={a.order}>
								{teamNameFor(a.teamId)} {verb} {getMapDisplayName(a.mapName)}
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
	const statsByTeam = new Map<number, PlayerStatRow[]>();
	for (const stat of match.playerStats) {
		const list = statsByTeam.get(stat.teamId) ?? [];
		list.push(stat);
		statsByTeam.set(stat.teamId, list);
	}
	const teamAStats = match.teamA ? (statsByTeam.get(match.teamA.id) ?? []) : [];
	const teamBStats = match.teamB ? (statsByTeam.get(match.teamB.id) ?? []) : [];

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

export default function MatchPage() {
	const params = useParams();
	const matchId = params.matchId as string;
	const [copied, setCopied] = useState(false);
	const [canManage, setCanManage] = useState(false);
	const [currentUserId, setCurrentUserId] = useState<string | null>(null);
	const [pendingSide, setPendingSide] = useState<string | null>(null);
	const { toast } = useToast();

	const { data: match, error, isLoading, mutate } = useSWR(matchId ? `/api/matches/${matchId}` : null, fetcher, { refreshInterval: 4000 });

	const showVeto = !!match && !match.isPickup && match.status === 'SCHEDULED' && match.teamA !== null && match.teamB !== null;
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
	// MatchZy's round_end webhook (see updateLiveScore). Pickups have no MatchMap rows; their
	// live score is the aggregate scoreTeamA/scoreTeamB shown directly on the big score digits.
	const currentMap = match.maps.find((m) => m.status !== 'COMPLETED');
	const connectAddress = match.gameServer ? `${match.gameServer.connectIp}:${match.gameServer.port}` : null;
	const connectCommand = connectAddress ? `connect ${connectAddress}${match.gameServer?.password ? `; password ${match.gameServer.password}` : ''}` : null;
	const steamConnectUrl = connectCommand ? `steam://run/730//+${encodeURIComponent(connectCommand)}` : null;

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
				{/* Header Section */}
				<div className='mb-12'>
					<div className='flex items-start justify-between mb-8'>
						<div>
							<div className='flex items-center gap-3 mb-4'>
								<div className='w-1 h-8 bg-white'></div>
								<div>
									<p className='text-neutral-400 text-sm tracking-widest uppercase'>{match.tournament.name}</p>
									<h1 className='text-5xl font-black tracking-tight'>MATCH {match.id}</h1>
								</div>
							</div>
						</div>
						<Badge className={`${status.borderClass} bg-black border-2 text-white px-4 py-2 font-bold tracking-wider uppercase text-xs`}>{status.badge}</Badge>
					</div>

					{/* Match Date & Timer */}
					<div className='flex flex-wrap items-center gap-4 text-neutral-400'>
						<div className='flex items-center gap-2'>
							<Clock className='w-4 h-4' />
							<p className='text-sm'>{new Date(match.matchDate).toLocaleString()}</p>
						</div>
						<MatchTimer match={match} />
					</div>
				</div>

				{canManage && <AdminControls match={match} vetoComplete={!showVeto || veto?.phase === 'COMPLETE'} onChanged={() => mutate()} />}

				{canManage && match.gameServer && <RconConsole matchId={matchId} gameServer={match.gameServer} />}

				{showVeto && veto && (
					<VetoPanel
						matchId={matchId}
						match={match}
						veto={veto}
						currentUserId={currentUserId}
						onVetoUpdated={(next) => {
							mutateVeto(next, false);
							if (next.phase === 'COMPLETE') mutate();
						}}
					/>
				)}

				{/* Main Match Arena */}
				<div className='bg-neutral-950 border border-border rounded-lg overflow-hidden mb-12'>
					<div className='grid grid-cols-1 lg:grid-cols-3 divide-border lg:divide-x'>
						{/* Team A */}
						<div className='p-8 lg:p-12 flex flex-col items-center justify-center border-b lg:border-b-0 border-border group hover:bg-neutral-900 transition-colors'>
							{match.isPickup ? (
								<>
									<h2 className='text-2xl font-black text-white mb-6 text-center leading-tight uppercase tracking-wider'>{match.teamAName || 'Side A'}</h2>
									{match.status === 'SCHEDULED' ? (
										<div className='text-3xl font-black text-neutral-400'>{sideAParticipants.length}/5</div>
									) : (
										<div className='text-7xl font-black text-white'>{match.scoreTeamA ?? '-'}</div>
									)}
								</>
							) : match.teamA ? (
								<>
									<div className='mb-6'>
										<div className='w-32 h-32 rounded-xl flex items-center justify-center overflow-hidden border-2 border-border group-hover:border-white transition-colors' style={{ backgroundColor: match.teamA.background || '#000000' }}>
											<TeamLogo logo={match.teamA.logo} name={match.teamA.name} />
										</div>
									</div>
									<h2 className='text-2xl font-black text-white mb-6 text-center leading-tight uppercase tracking-wider'>{match.teamA.name}</h2>
									<div className='text-7xl font-black text-white'>{match.scoreTeamA ?? '-'}</div>
								</>
							) : (
								<div className='text-neutral-600 font-bold uppercase tracking-wider text-xl'>TBD</div>
							)}
						</div>

						{/* VS / Center */}
						<div className='p-8 lg:p-12 flex flex-col items-center justify-center border-b lg:border-b-0 border-border bg-neutral-900/50'>
							<div className='text-center mb-8'>
								<div className='inline-flex items-center gap-4 mb-6'>
									<div className='w-12 h-px bg-neutral-700'></div>
									<p className='text-sm font-bold text-neutral-400 uppercase tracking-widest'>VS</p>
									<div className='w-12 h-px bg-neutral-700'></div>
								</div>
								<p className='text-neutral-500 text-sm'>{match.tournament.name}</p>
							</div>

							{!match.isPickup && match.status === 'LIVE' && currentMap && (
								<div className='mb-4 flex items-center gap-2 text-white text-sm font-mono bg-black border border-border rounded px-3 py-1.5'>
									<span className='w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse' />
									{getMapDisplayName(currentMap.mapName)} &middot; {currentMap.scoreTeamA ?? 0}-{currentMap.scoreTeamB ?? 0}
								</div>
							)}

							{match.gameServer && connectAddress ? (
								<div className='w-full border border-border rounded-md p-4 mb-4 space-y-3'>
									<div className='text-left'>
										<p className='text-neutral-400 uppercase tracking-wide text-xs mb-2'>Connect IP</p>
										<div className='bg-black border border-border rounded px-3 py-2 text-sm font-mono text-white break-all'>{connectAddress}</div>
									</div>
									{match.gameServer.password && (
										<div className='text-left'>
											<p className='text-neutral-400 uppercase tracking-wide text-xs mb-2'>Password</p>
											<div className='bg-black border border-border rounded px-3 py-2 text-sm font-mono text-white break-all'>{match.gameServer.password}</div>
										</div>
									)}
									<div className='text-left'>
										<p className='text-neutral-400 uppercase tracking-wide text-xs mb-2'>Console Command</p>
										<div className='bg-black border border-border rounded px-3 py-2 text-xs font-mono text-white break-all'>{connectCommand}</div>
									</div>
								</div>
							) : (
								<div className='w-full border border-dashed border-border rounded-md p-4 mb-4 text-center'>
									<p className='text-sm text-neutral-500'>Server not yet provisioned</p>
								</div>
							)}

							<div className='grid grid-cols-1 sm:grid-cols-2 gap-2 w-full mb-4'>
								<Button disabled={!connectAddress} onClick={() => connectAddress && copyToClipboard(connectAddress)} className='bg-white text-black font-bold hover:bg-neutral-200 transition-colors w-full disabled:opacity-40'>
									<Copy className='h-4 w-4 mr-2' />
									{copied ? 'Copied!' : 'Copy IP'}
								</Button>
								<Button disabled={!connectCommand} onClick={() => connectCommand && copyToClipboard(connectCommand)} variant='outline' className='border-border text-white hover:bg-neutral-800 w-full disabled:opacity-40'>
									<Gamepad2 className='h-4 w-4 mr-2' />
									Copy Command
								</Button>
							</div>

							<Button disabled={!steamConnectUrl} onClick={launchCS2} variant='outline' className='border-border text-white hover:bg-neutral-800 transition-colors w-full mb-6 disabled:opacity-40'>
								<ExternalLink className='h-4 w-4 mr-2' />
								Launch CS2
							</Button>
						</div>

						{/* Team B */}
						<div className='p-8 lg:p-12 flex flex-col items-center justify-center group hover:bg-neutral-900 transition-colors'>
							{match.isPickup ? (
								<>
									<h2 className='text-2xl font-black text-white mb-6 text-center leading-tight uppercase tracking-wider'>{match.teamBName || 'Side B'}</h2>
									{match.status === 'SCHEDULED' ? (
										<div className='text-3xl font-black text-neutral-400'>{sideBParticipants.length}/5</div>
									) : (
										<div className='text-7xl font-black text-white'>{match.scoreTeamB ?? '-'}</div>
									)}
								</>
							) : match.teamB ? (
								<>
									<div className='mb-6'>
										<div className='w-32 h-32 rounded-xl flex items-center justify-center overflow-hidden border-2 border-border group-hover:border-white transition-colors' style={{ backgroundColor: match.teamB.background || '#000000' }}>
											<TeamLogo logo={match.teamB.logo} name={match.teamB.name} />
										</div>
									</div>
									<h2 className='text-2xl font-black text-white mb-6 text-center leading-tight uppercase tracking-wider'>{match.teamB.name}</h2>
									<div className='text-7xl font-black text-white'>{match.scoreTeamB ?? '-'}</div>
								</>
							) : (
								<div className='text-neutral-600 font-bold uppercase tracking-wider text-xl'>TBD</div>
							)}
						</div>
					</div>
				</div>

				{/* Teams Rosters */}
				<div className='grid grid-cols-1 lg:grid-cols-2 gap-8 mb-12'>
					{/* Team A Roster */}
					<div className='bg-neutral-950 border border-border rounded-lg overflow-hidden'>
						<div className='bg-black px-8 py-6 border-b border-border'>
							<div className='flex items-center gap-3 mb-1'>
								<Users className='w-5 h-5' />
								<h3 className='text-lg font-black uppercase tracking-wider'>{match.isPickup ? match.teamAName || 'Side A' : (match.teamA?.name ?? 'TBD')}</h3>
							</div>
							<p className='text-neutral-500 text-sm mb-1'>Roster (5 players)</p>
							{match.isPickup && <LobbyNameEditor matchId={matchId} side='TEAM_A' name={match.teamAName || ''} canEdit={canRenameSideA} onRenamed={() => mutate()} />}
						</div>
						{match.isPickup ? (
							<PickupRosterPanel side='TEAM_A' participants={sideAParticipants} currentUserId={currentUserId} canJoin={canJoinPickup} pendingSide={pendingSide} onJoin={joinSide} onLeave={leaveMatch} />
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
											<Badge className='bg-black border border-border text-neutral-200 text-xs'>LVL {getMemberLevel(member, index)}</Badge>
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
							<p className='text-neutral-500 text-sm mb-1'>Roster (5 players)</p>
							{match.isPickup && <LobbyNameEditor matchId={matchId} side='TEAM_B' name={match.teamBName || ''} canEdit={canRenameSideB} onRenamed={() => mutate()} />}
						</div>
						{match.isPickup ? (
							<PickupRosterPanel side='TEAM_B' participants={sideBParticipants} currentUserId={currentUserId} canJoin={canJoinPickup} pendingSide={pendingSide} onJoin={joinSide} onLeave={leaveMatch} />
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
											<Badge className='bg-black border border-border text-neutral-200 text-xs'>LVL {getMemberLevel(member, index)}</Badge>
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
							<div className='flex items-center justify-center gap-6'>
								<div className='text-center'>
									<p className='text-neutral-400 text-xs uppercase tracking-widest mb-1'>Final Score</p>
									<p className='text-3xl font-black'>
										{match.scoreTeamA} - {match.scoreTeamB}
									</p>
								</div>
							</div>
						</div>
					</div>
				)}

				<Scoreboard match={match} teamALabel={teamALabel} teamBLabel={teamBLabel} />
			</div>
		</div>
	);
}
