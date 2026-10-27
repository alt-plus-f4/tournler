'use client';

import { useEffect, useState, type RefObject } from 'react';
import { z } from 'zod';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import type { Game } from '@prisma/client';
import { Button } from '@/components/ui/button';
import { Drawer, DrawerClose, DrawerContent, DrawerDescription, DrawerFooter, DrawerHeader, DrawerTitle } from '@/components/ui/drawer';
import { Input } from '@/components/ui/input';
import { useRouter } from 'next/navigation';
import { useToast } from '@/lib/hooks/use-toast';
import { GameGlyph } from '@/components/games/GameMark';
import { GAME_META, GAMES } from '@/lib/games';
import { cn } from '@/lib/utils';
import { fieldLabel } from '@/components/ui/dialog-styles';
import { DialogEyebrow, dialogPanelTitle } from '@/components/ui/dialog';

const formSchema = z.object({
	teamName: z.string().trim().min(3, 'Team name must be at least 3 characters long').max(50, 'Team name cannot exceed 50 characters'),
	game: z.enum(GAMES),
});

type FormValues = z.infer<typeof formSchema>;

interface TeamCreationDrawerPanelProps {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	/** The "Create a team" tile lives outside this lazily loaded module, so focus is handed back to it on close. */
	triggerRef: RefObject<HTMLButtonElement | null>;
	/** Games the viewer has no team for yet. */
	games: Game[];
	defaultGame: Game;
}

/** The create-team drawer itself (vaul + react-hook-form + zod), loaded by TeamDrawer on first open. */
export default function TeamCreationDrawerPanel({ open, onOpenChange, triggerRef, games, defaultGame }: TeamCreationDrawerPanelProps) {
	// Mount closed and open on the next frame so vaul runs its slide-in the same way a trigger click does.
	const [ready, setReady] = useState(false);
	useEffect(() => {
		const id = requestAnimationFrame(() => setReady(true));
		return () => cancelAnimationFrame(id);
	}, []);

	const {
		register,
		handleSubmit,
		watch,
		setError,
		formState: { errors, isSubmitting },
	} = useForm<FormValues>({
		resolver: zodResolver(formSchema),
		defaultValues: { teamName: '', game: defaultGame },
	});
	const router = useRouter();
	const { toast } = useToast();
	const selectedGame = watch('game');

	const onSubmit = async (data: FormValues) => {
		try {
			const response = await fetch('/api/teams', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify(data),
			});
			const body = await response.json().catch(() => ({}));

			if (response.ok) {
				toast({ title: 'Team created', description: `${data.teamName} is your ${GAME_META[data.game].short} team. Invite players from its page.` });
				onOpenChange(false);
				if (body.team?.id) router.push(`/teams/${body.team.id}`);
				else router.refresh();
			} else if (response.status === 409 && body.code === 'NAME_TAKEN') {
				setError('teamName', { message: body.error ?? 'That name is taken for this game. Try another.' });
			} else {
				toast({ variant: 'destructive', title: 'Team not created', description: body.error ?? 'Something went wrong. Try again.' });
			}
		} catch (error) {
			console.error(error);
			toast({ variant: 'destructive', title: 'Team not created', description: 'Could not reach the server. Check your connection and try again.' });
		}
	};

	return (
		<Drawer open={open && ready} onOpenChange={onOpenChange} direction='right' shouldScaleBackground={false}>
			<DrawerContent
				handle={false}
				overlayClassName='bg-black/75 backdrop-blur-sm'
				className='inset-x-auto inset-y-0 bottom-auto right-0 mt-0 h-full w-full max-w-[420px] rounded-none border-y-0 border-r-0 border-border bg-card'
				onCloseAutoFocus={(e) => {
					e.preventDefault();
					triggerRef.current?.focus();
				}}
			>
				<form onSubmit={handleSubmit(onSubmit)} className='flex h-full min-h-0 flex-col'>
					<DrawerHeader className='gap-1 px-6 pb-2 pt-6 text-left'>
						<DialogEyebrow>Teams</DialogEyebrow>
						<DrawerTitle className={dialogPanelTitle}>Create a team</DrawerTitle>
						<DrawerDescription className='pt-1'>Pick the game and a name. You become captain.</DrawerDescription>
					</DrawerHeader>
					<div className='flex-1 space-y-5 overflow-y-auto px-6 py-4'>
						<fieldset disabled={isSubmitting}>
							<legend className={cn(fieldLabel, 'mb-2 block')}>Game</legend>
							<div className='grid grid-cols-2 gap-2'>
								{GAMES.map((game) => {
									const available = games.includes(game);
									const checked = selectedGame === game;
									return (
										<label
											key={game}
											className={cn(
												'flex min-h-[64px] cursor-pointer flex-col justify-center gap-1 rounded-md border px-3 py-2 transition-colors has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-ring has-[:focus-visible]:ring-offset-2 has-[:focus-visible]:ring-offset-background',
												checked ? 'border-white bg-white/[0.05] text-white' : 'border-zinc-700 bg-background text-neutral-300 hover:border-zinc-500',
												!available && 'cursor-not-allowed opacity-50 hover:border-zinc-700',
											)}
										>
											<input type='radio' value={game} disabled={!available} className='sr-only' {...register('game')} />
											<span className='flex items-center gap-2 text-sm font-bold uppercase tracking-widest'>
												<GameGlyph game={game} />
												{GAME_META[game].short}
											</span>
											<span className='text-xs text-muted-foreground'>{available ? GAME_META[game].label : 'You already have a team'}</span>
										</label>
									);
								})}
							</div>
						</fieldset>
						<div className='space-y-2'>
							<label htmlFor='team-name' className={cn(fieldLabel, 'block')}>
								Team name
							</label>
							<Input
								id='team-name'
								placeholder='Enter team name'
								aria-invalid={!!errors.teamName}
								aria-describedby={errors.teamName ? 'team-name-error' : undefined}
								{...register('teamName')}
								disabled={isSubmitting}
							/>
							{errors.teamName ? (
								<p id='team-name-error' role='alert' className='text-sm text-signal-live'>
									{String(errors.teamName.message)}
								</p>
							) : (
								<p className='text-xs text-muted-foreground'>Unique among {GAME_META[selectedGame ?? defaultGame].short} teams.</p>
							)}
						</div>
					</div>
					<DrawerFooter className='flex-row justify-end gap-2 border-t border-border bg-white/[0.03] px-6 py-4'>
						<DrawerClose asChild>
							<Button type='button' variant='outline'>
								Cancel
							</Button>
						</DrawerClose>
						<Button type='submit' isLoading={isSubmitting}>
							{isSubmitting ? 'Creating…' : 'Create team'}
						</Button>
					</DrawerFooter>
				</form>
			</DrawerContent>
		</Drawer>
	);
}
