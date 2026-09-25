'use client';

import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react';
import { AlertTriangle, ClipboardCheck, Flag, Loader2, Pause, Play, RefreshCw, RotateCcw, ShieldCheck, Terminal, Trash2, Zap } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/lib/hooks/use-toast';
import { cn } from '@/lib/utils';
import { RoomPanel, SectionLabel } from './room-ui';
import { getSideLabels, isLolMatch, type GameServer, type Match } from './types';

export type AdminAction = 'start' | 'pause' | 'resume' | 'force-start' | 'restart' | 'update score' | 'end';

/** One PATCH pipeline shared by the header quick bar and the Admin tab, so a pending action disables both. */
export function useMatchAdmin(matchId: string, onChanged: () => void) {
	const [pendingAction, setPendingAction] = useState<AdminAction | null>(null);
	const { toast } = useToast();

	const run = useCallback(
		async (action: AdminAction, body: Record<string, unknown>) => {
			setPendingAction(action);
			try {
				const response = await fetch(`/api/matches/${matchId}`, {
					method: 'PATCH',
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify(body),
				});
				const payload = await response.json().catch(() => null);
				if (!response.ok) throw new Error(payload?.error || 'Action failed');
				if (payload?.configPushError) {
					toast({
						variant: 'destructive',
						title: "Saved, but the game server didn't confirm it",
						description: `${payload.configPushError} — the app's state is updated, but the real server may not match it yet. Check or retry from the RCON console in the Admin tab.`,
					});
				}
				onChanged();
			} catch (error) {
				console.error(`Failed to ${action}`, error);
				toast({ variant: 'destructive', title: `Could not ${action} match`, description: error instanceof Error ? error.message : undefined });
			} finally {
				setPendingAction(null);
			}
		},
		[matchId, onChanged, toast],
	);

	return { pendingAction, run };
}

export type MatchAdmin = ReturnType<typeof useMatchAdmin>;

/**
 * Confirmation for the irreversible levers (restart, force end, delete). The trigger opens it; the
 * destructive button runs `onConfirm` and closes. Replaces window.confirm so the consequence copy is
 * readable and the confirm button carries the destructive style.
 */
function ConfirmAction({ trigger, title, description, confirmLabel, onConfirm }: { trigger: ReactNode; title: string; description: ReactNode; confirmLabel: string; onConfirm: () => void }) {
	const [open, setOpen] = useState(false);
	return (
		<Dialog open={open} onOpenChange={setOpen}>
			<DialogTrigger asChild>{trigger}</DialogTrigger>
			<DialogContent className='max-w-md rounded-md'>
				<DialogHeader>
					<DialogTitle>{title}</DialogTitle>
					<DialogDescription className='leading-relaxed'>{description}</DialogDescription>
				</DialogHeader>
				<DialogFooter className='flex flex-col-reverse gap-2 sm:flex-row sm:justify-end sm:space-x-0'>
					<Button variant='outline' onClick={() => setOpen(false)}>
						Cancel
					</Button>
					<Button
						variant='destructive'
						onClick={() => {
							setOpen(false);
							onConfirm();
						}}
					>
						{confirmLabel}
					</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
}

function canStart(match: Match, vetoComplete: boolean) {
	return vetoComplete && (match.isPickup || (match.teamA !== null && match.teamB !== null));
}

function ActionSpinner({ show, icon: Icon }: { show: boolean; icon: typeof Play }) {
	return show ? <Loader2 className='h-4 w-4 animate-spin' aria-hidden /> : <Icon className='h-4 w-4' aria-hidden />;
}

/**
 * The live levers, pinned into the room header so staff never leave the room mid-match. Force start
 * stays in the Admin tab: the server doesn't report its ready-up phase, so it can't be offered only when it applies.
 */
export function AdminQuickBar({ match, admin, vetoComplete }: { match: Match; admin: MatchAdmin; vetoComplete: boolean }) {
	const { pendingAction, run } = admin;
	const busy = pendingAction !== null;
	if (match.status === 'COMPLETED') return null;

	return (
		<div role='group' aria-label='Admin match controls' className='flex items-center gap-1 rounded-md border border-border bg-black/70 p-1 backdrop-blur-sm'>
			<span className='flex items-center gap-1 px-1.5 text-xs font-bold uppercase tracking-[0.1em] text-muted-foreground'>
				<ShieldCheck className='h-3.5 w-3.5' aria-hidden /> Admin
			</span>
			{match.status === 'SCHEDULED' &&
				(vetoComplete ? (
					<Button size='sm' onClick={() => run('start', { action: 'START' })} disabled={busy || !canStart(match, vetoComplete)} className='h-10 gap-1.5'>
						<ActionSpinner show={pendingAction === 'start'} icon={Play} /> Start
					</Button>
				) : (
					<span className='px-2 text-xs text-muted-foreground'>Start opens after the veto</span>
				))}
			{match.status === 'LIVE' && (
				<Button size='sm' variant='outline' onClick={() => run('pause', { action: 'PAUSE' })} disabled={busy} className='h-10 gap-1.5'>
					<ActionSpinner show={pendingAction === 'pause'} icon={Pause} /> Pause
				</Button>
			)}
			{match.status === 'PAUSED' && (
				<Button size='sm' onClick={() => run('resume', { action: 'RESUME' })} disabled={busy} className='h-10 gap-1.5'>
					<ActionSpinner show={pendingAction === 'resume'} icon={Play} /> Resume
				</Button>
			)}
		</div>
	);
}

function ControlRow({ title, hint, children }: { title: string; hint: string; children: ReactNode }) {
	return (
		<div className='flex flex-col gap-3 py-4 first:pt-0 last:pb-0 sm:flex-row sm:items-center sm:justify-between'>
			<div className='min-w-0'>
				<p className='text-sm font-medium text-white'>{title}</p>
				<p className='mt-0.5 text-sm text-muted-foreground'>{hint}</p>
			</div>
			<div className='flex shrink-0 gap-2'>{children}</div>
		</div>
	);
}

/** The Admin tab: every operator tool for this match, grouped by consequence. */
export function AdminPanel({ match, admin, vetoComplete, isDeleting, onDelete }: { match: Match; admin: MatchAdmin; vetoComplete: boolean; isDeleting: boolean; onDelete: () => void }) {
	const { pendingAction, run } = admin;
	const busy = pendingAction !== null;
	const isLol = isLolMatch(match);
	const { teamALabel, teamBLabel } = getSideLabels(match);
	const [scoreA, setScoreA] = useState(() => String(match.scoreTeamA ?? 0));
	const [scoreB, setScoreB] = useState(() => String(match.scoreTeamB ?? 0));
	const [winnerId, setWinnerId] = useState('');

	const inPlay = match.status === 'LIVE' || match.status === 'PAUSED';
	const scoreUnit = isLol ? 'games' : (match.bestOf ?? 1) > 1 ? 'maps won' : 'rounds';
	const canEnd = inPlay && (match.isPickup || (match.teamA !== null && match.teamB !== null));

	const winnerName = !winnerId ? null : winnerId === 'TEAM_A' || winnerId === String(match.teamA?.id) ? teamALabel : teamBLabel;
	const endMatch = () => {
		if (!winnerId) return;
		const winnerField = match.isPickup ? { winnerSide: winnerId } : { winnerId: Number(winnerId) };
		run('end', { scoreTeamA: Number(scoreA), scoreTeamB: Number(scoreB), ...winnerField });
	};

	return (
		<div className='grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]'>
			<div className='space-y-4'>
				<RoomPanel label='Match control'>
					{match.status === 'COMPLETED' ? (
						<p className='text-sm text-muted-foreground'>This match is final. Results can no longer be changed from here; delete the match below if it was created by mistake.</p>
					) : (
						<div className='divide-y divide-border'>
							{match.status === 'SCHEDULED' && (
								<ControlRow title='Start match' hint={isLol ? 'Marks the match live — play happens in the League client; nothing is loaded onto a server.' : vetoComplete ? 'Loads the veto result onto the server and opens it to players.' : 'Available once the map veto is complete.'}>
									<Button onClick={() => run('start', { action: 'START' })} disabled={busy || !canStart(match, vetoComplete)} className='gap-2'>
										<ActionSpinner show={pendingAction === 'start'} icon={Play} /> Start
									</Button>
								</ControlRow>
							)}
							{match.status === 'LIVE' && (
								<ControlRow title={isLol ? 'Pause' : 'Pause or force start'} hint={isLol ? 'Marks the match paused — there’s no server to freeze.' : 'Pause freezes the server. Force start skips the ready-up wait if players can’t type .ready.'}>
									<Button variant='outline' onClick={() => run('pause', { action: 'PAUSE' })} disabled={busy} className='gap-2'>
										<ActionSpinner show={pendingAction === 'pause'} icon={Pause} /> Pause
									</Button>
									{/* Force start skips the server's ready-up wait — meaningless (and refused server-side) for a LoL match with no server. */}
									{!isLol && (
										<Button variant='outline' onClick={() => run('force-start', { action: 'FORCE_START' })} disabled={busy} className='gap-2'>
											<ActionSpinner show={pendingAction === 'force-start'} icon={Zap} /> Force start
										</Button>
									)}
								</ControlRow>
							)}
							{match.status === 'PAUSED' && (
								<ControlRow title='Resume match' hint={isLol ? 'Marks the match live again.' : 'Unpauses the server and restarts the match timer.'}>
									<Button onClick={() => run('resume', { action: 'RESUME' })} disabled={busy} className='gap-2'>
										<ActionSpinner show={pendingAction === 'resume'} icon={Play} /> Resume
									</Button>
								</ControlRow>
							)}
							{inPlay && (
								<ControlRow title='Restart match' hint={isLol ? 'Clears score and timer back to zero. Teams stay.' : 'Clears score, timer and map results. Teams and veto stay.'}>
									<ConfirmAction
										title='Restart this match?'
										description={isLol ? 'Score and timer are cleared back to zero. Team assignments stay as they are.' : 'Score, timer and every map result are cleared back to zero and the server restarts the match. Team assignments and the map veto stay as they are.'}
										confirmLabel='Restart match'
										onConfirm={() => run('restart', { action: 'RESTART' })}
										trigger={
											<Button variant='outline' disabled={busy} className='gap-2'>
												<ActionSpinner show={pendingAction === 'restart'} icon={RotateCcw} /> Restart
											</Button>
										}
									/>
								</ControlRow>
							)}
						</div>
					)}
				</RoomPanel>

				{inPlay && (
					<RoomPanel label={isLol ? 'Record result' : 'Result override'}>
						<p className='mb-4 text-sm text-muted-foreground'>{isLol ? 'League has no hosted server to report a score, so an organizer enters it here.' : 'Scores normally come from the game server. Only type them in if the server stopped reporting.'}</p>
						<div className='grid grid-cols-2 gap-3'>
							<div className='space-y-1.5'>
								<Label htmlFor='admin-score-a' className='truncate text-muted-foreground'>
									{teamALabel} <span className='text-xs'>· {scoreUnit}</span>
								</Label>
								<Input id='admin-score-a' type='number' inputMode='numeric' min={0} value={scoreA} onChange={(e) => setScoreA(e.target.value)} className='font-mono tabular-nums' />
							</div>
							<div className='space-y-1.5'>
								<Label htmlFor='admin-score-b' className='truncate text-muted-foreground'>
									{teamBLabel} <span className='text-xs'>· {scoreUnit}</span>
								</Label>
								<Input id='admin-score-b' type='number' inputMode='numeric' min={0} value={scoreB} onChange={(e) => setScoreB(e.target.value)} className='font-mono tabular-nums' />
							</div>
						</div>
						<Button variant='outline' onClick={() => run('update score', { scoreTeamA: Number(scoreA), scoreTeamB: Number(scoreB) })} disabled={busy} className='mt-3 w-full'>
							{pendingAction === 'update score' ? 'Saving…' : isLol ? 'Save score' : 'Save score override'}
						</Button>

						{canEnd && (
							<div className='mt-5 border-t border-border pt-5'>
								<SectionLabel className='mb-3'>{isLol ? 'Confirm winner' : 'Force end'}</SectionLabel>
								<div className='flex flex-col gap-3 sm:flex-row sm:items-end'>
									<div className='flex-1 space-y-1.5'>
										<Label htmlFor='admin-winner' className='text-muted-foreground'>
											Winner
										</Label>
										<Select value={winnerId} onValueChange={setWinnerId}>
											<SelectTrigger id='admin-winner'>
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
									<ConfirmAction
										title={isLol ? `Record ${winnerName ?? 'this winner'} as the winner?` : `Force end with ${winnerName ?? 'this winner'}?`}
										description={
											isLol ? (
												<>
													This records <span className='font-bold text-white'>{winnerName}</span> as the winner at{' '}
													<span className='font-mono tabular-nums text-white'>
														{scoreA}–{scoreB}
													</span>
													{match.isPickup ? ' and closes the match.' : ' and advances the bracket.'}
												</>
											) : (
												<>
													This records <span className='font-bold text-white'>{winnerName}</span> as the winner at{' '}
													<span className='font-mono tabular-nums text-white'>
														{scoreA}–{scoreB}
													</span>
													{match.isPickup ? ' and closes the match.' : ' and advances the bracket.'} The game server&apos;s score will be overridden.
												</>
											)
										}
										confirmLabel={isLol ? 'Record result' : 'Force end match'}
										onConfirm={endMatch}
										trigger={
											<Button disabled={busy || !winnerId} variant='destructive' className='gap-2'>
												<ActionSpinner show={pendingAction === 'end'} icon={isLol ? ClipboardCheck : Flag} /> {isLol ? 'Record result' : 'Force end (override server)'}
											</Button>
										}
									/>
								</div>
								<p className='mt-2 text-xs text-muted-foreground'>{isLol ? `Records the scores above as the result${match.isPickup ? '.' : ', and advances the bracket.'}` : `Records the scores above as the result instead of what the server reports${match.isPickup ? '.' : ', and advances the bracket.'}`}</p>
							</div>
						)}
					</RoomPanel>
				)}

				<section className='rounded-md border border-signal-live/20 bg-signal-live/[0.04] p-4'>
					<div className='flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between'>
						<div>
							<p className='text-sm font-medium text-white'>Delete match</p>
							<p className='mt-0.5 text-sm text-muted-foreground'>Removes scores, roster, veto history and the server record. Can’t be undone.</p>
						</div>
						<ConfirmAction
							title='Permanently delete this match?'
							description='This removes its scores, roster, map and veto history, and the game server record. It cannot be undone.'
							confirmLabel='Delete match'
							onConfirm={onDelete}
							trigger={
								<Button variant='outline' disabled={isDeleting} className='shrink-0 gap-2 border-signal-live/30 text-white hover:border-signal-live hover:bg-signal-live/10'>
									{isDeleting ? <Loader2 className='h-4 w-4 animate-spin' aria-hidden /> : <Trash2 className='h-4 w-4 text-signal-live' aria-hidden />} Delete
								</Button>
							}
						/>
					</div>
				</section>
			</div>

			<div>
				{isLol ? (
					<RoomPanel
						label={
							<>
								<Terminal className='h-3.5 w-3.5' aria-hidden /> Server console
							</>
						}
					>
						<p className='text-sm text-muted-foreground'>League of Legends matches have no hosted server, so there&apos;s no console here — nothing to configure or query.</p>
					</RoomPanel>
				) : match.gameServer && match.status !== 'COMPLETED' ? (
					<RconConsole matchId={String(match.id)} gameServer={match.gameServer} />
				) : (
					<RoomPanel
						label={
							<>
								<Terminal className='h-3.5 w-3.5' aria-hidden /> Server console
							</>
						}
					>
						<p className='text-sm text-muted-foreground'>{match.status === 'COMPLETED' ? 'The server was released when the match ended.' : 'No game server is attached yet. The console opens once one is assigned to this match.'}</p>
					</RoomPanel>
				)}
			</div>
		</div>
	);
}

interface ConsoleEntry {
	command: string;
	output: string;
	isError: boolean;
}

/**
 * Talks to the real CS2 server directly: run arbitrary RCON commands and re-push the match config
 * (veto result, teams, password) when the automated push failed or the MatchZy webhook seems stuck.
 */
function RconConsole({ matchId, gameServer }: { matchId: string; gameServer: GameServer }) {
	const [command, setCommand] = useState('');
	const [history, setHistory] = useState<ConsoleEntry[]>([]);
	const [isRunning, setIsRunning] = useState(false);
	const [isSyncing, setIsSyncing] = useState(false);
	const historyContainerRef = useRef<HTMLDivElement>(null);
	const { toast } = useToast();

	useEffect(() => {
		// Scroll only the console's own box — scrollIntoView would also scroll the page.
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
			setHistory((prev) => [...prev, { command: trimmed, output: String(payload?.output ?? ''), isError: false }]);
			setCommand('');
		} catch (error) {
			setHistory((prev) => [...prev, { command: trimmed, output: error instanceof Error ? error.message : 'Command failed', isError: true }]);
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
			setHistory((prev) => [...prev, { command: '(resync match config)', output: String(payload?.serverStatus ?? 'Config re-pushed successfully.'), isError: false }]);
			toast({ title: 'Match config re-pushed to the game server' });
		} catch (error) {
			toast({ variant: 'destructive', title: 'Could not re-sync', description: error instanceof Error ? error.message : undefined });
		} finally {
			setIsSyncing(false);
		}
	};

	return (
		<RoomPanel
			label={
				<>
					<Terminal className='h-3.5 w-3.5' aria-hidden /> Server console
				</>
			}
			action={
				<Button size='sm' variant='outline' onClick={resync} disabled={isSyncing} className='-my-1 h-10 gap-1.5'>
					<RefreshCw className={cn('h-3.5 w-3.5', isSyncing && 'animate-spin')} aria-hidden /> Re-sync config
				</Button>
			}
		>
			<p className='mb-3 font-mono text-xs text-muted-foreground'>
				{gameServer.connectIp}:{gameServer.port} · {gameServer.status.toLowerCase()}
			</p>
			{!gameServer.matchConfigLoadedAt && (
				<div className='mb-3 flex items-start gap-2 rounded-md border border-border bg-neutral-900 p-3 text-xs text-neutral-200' role='status'>
					<AlertTriangle className='mt-0.5 h-4 w-4 shrink-0' aria-hidden />
					<span>
						The server hasn&apos;t confirmed loading this match&apos;s config yet (maps, teams, password). If players can&apos;t connect, re-sync the config or run <code className='font-mono'>status</code>.
					</span>
				</div>
			)}
			<div ref={historyContainerRef} className='mb-3 h-72 space-y-2 overflow-y-auto rounded-md border border-border bg-black p-3 font-mono text-xs' aria-live='polite'>
				{history.length === 0 ? (
					<p className='text-muted-foreground'>No commands run yet. Try `status`.</p>
				) : (
					history.map((entry, i) => (
						<div key={i}>
							<p className='text-muted-foreground'>
								$ <span className='text-white'>{entry.command}</span>
							</p>
							<p className={cn('whitespace-pre-wrap break-all', entry.isError ? 'text-signal-live' : 'text-neutral-300')}>{entry.output || '(no output)'}</p>
						</div>
					))
				)}
			</div>
			<form
				className='flex gap-2'
				onSubmit={(e) => {
					e.preventDefault();
					runCommand(command);
				}}
			>
				<Input value={command} onChange={(e) => setCommand(e.target.value)} placeholder='RCON command, e.g. status' aria-label='RCON command' disabled={isRunning} className='bg-black font-mono text-sm' />
				<Button type='submit' disabled={isRunning || !command.trim()} className='shrink-0'>
					{isRunning ? 'Running…' : 'Run'}
				</Button>
			</form>
		</RoomPanel>
	);
}
