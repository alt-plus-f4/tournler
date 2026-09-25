'use client';

import { useState, type ReactNode } from 'react';
import { ExternalLink } from 'lucide-react';
import type { AccountStatus } from '@/lib/games/eligibility';
import type { RiotStatusResponse } from '@/lib/riot/types';
import { GameTag } from '@/components/games/GameMark';
import { Button } from '@/components/ui/button';
import { useToast } from '@/lib/hooks/use-toast';
import { AccountStatusLabel, ConfirmUnlinkButton } from './AccountStatus';
import { RiotIdLinker } from './RiotIdLinker';
import { VisibilitySwitch } from './VisibilitySwitch';

/** Starts the existing Steam OpenID link (src/app/api/auth/steam): the browser leaves and comes back. */
export async function startSteamLink(): Promise<string | null> {
	try {
		const response = await fetch('/api/auth/steam');
		if (response.status === 401) {
			try {
				sessionStorage.setItem('preAuthPath', window.location.pathname + window.location.search);
			} catch {
				// storage blocked: the user just lands on the home page after signing in
			}
			window.location.href = '/sign-in';
			return null;
		}
		const data = await response.json().catch(() => ({}));
		if (!response.ok || !data.url) return 'Couldn’t reach Steam. Try linking again in a moment.';
		window.location.href = data.url;
		return null;
	} catch {
		return 'Couldn’t reach Steam. Try linking again in a moment.';
	}
}

function AccountRow({ tag, title, requirement, status, children }: { tag: ReactNode; title: string; requirement: string; status: AccountStatus; children: ReactNode }) {
	return (
		<div className='p-4 sm:p-5'>
			<div className='flex flex-wrap items-start justify-between gap-x-4 gap-y-2'>
				<div className='min-w-0'>
					<div className='flex items-center gap-2'>
						{tag}
						<h3 className='text-base font-bold text-white'>{title}</h3>
					</div>
					<p className='mt-1 text-xs text-neutral-400'>{requirement}</p>
				</div>
				<AccountStatusLabel status={status} />
			</div>
			<div className='mt-4'>{children}</div>
		</div>
	);
}

interface GameAccountsSectionProps {
	steam: { steamId: string } | null;
	riot: RiotStatusResponse;
	showSteam: boolean;
	onShowSteamChange: (next: boolean) => void;
	showSteamSaving: boolean;
	showRiot: boolean;
	onShowRiotChange: (next: boolean) => void;
	showRiotSaving: boolean;
	/** Re-render the server page after a change other surfaces show (game sections, FACEIT). */
	onChanged: () => void;
}

/**
 * The owner's "Game accounts" panel (profile #accounts): Steam for CS2, Riot ID for League.
 * Link both to play both.
 */
export function GameAccountsSection({ steam, riot: initialRiot, showSteam, onShowSteamChange, showSteamSaving, showRiot, onShowRiotChange, showRiotSaving, onChanged }: GameAccountsSectionProps) {
	const { toast } = useToast();
	const [riot, setRiot] = useState(initialRiot);
	const [steamBusy, setSteamBusy] = useState(false);

	const linkSteam = async () => {
		setSteamBusy(true);
		const error = await startSteamLink();
		if (error) {
			setSteamBusy(false);
			toast({ variant: 'destructive', title: error });
		}
	};

	const unlinkSteam = async () => {
		try {
			const res = await fetch('/api/user/steam', { method: 'DELETE' });
			if (!res.ok) throw new Error('unlink failed');
			onChanged();
			return true;
		} catch {
			toast({ variant: 'destructive', title: 'Couldn’t unlink Steam', description: 'Check your connection and try again.' });
			return false;
		}
	};

	const riotStatus: AccountStatus = riot.account ? riot.account.status : 'missing';

	return (
		<section id='accounts' aria-labelledby='accounts-heading' className='scroll-mt-24'>
			<div className='mb-3'>
				<h2 id='accounts-heading' className='text-xs font-bold uppercase tracking-[0.1em] text-neutral-400'>
					Game accounts
				</h2>
				<p className='mt-1 text-sm text-neutral-300'>Link the account for each game you play. Link both to play both.</p>
			</div>
			<div className='divide-y divide-border rounded-md border border-border bg-neutral-950'>
				<AccountRow tag={<GameTag game='CS2' />} title='Steam' requirement='Required for CS2: connecting to match servers, tournament registration and your FACEIT level.' status={steam ? 'linked' : 'missing'}>
					{steam ? (
						<div className='space-y-4'>
							<div className='flex flex-wrap items-center justify-between gap-3'>
								<dl className='grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 text-sm'>
									<dt className='text-neutral-400'>SteamID64</dt>
									<dd className='font-mono tabular-nums text-neutral-200'>{steam.steamId}</dd>
									<dt className='text-neutral-400'>Profile</dt>
									<dd>
										<a href={`https://steamcommunity.com/profiles/${steam.steamId}`} target='_blank' rel='noopener noreferrer' className='inline-flex items-center gap-1 text-neutral-200 underline-offset-4 hover:text-white hover:underline'>
											Steam Community <ExternalLink className='h-3 w-3' aria-hidden />
										</a>
									</dd>
								</dl>
								<ConfirmUnlinkButton
									title='Unlink Steam?'
									description='You won’t be able to connect to CS2 match servers or register for CS2 tournaments until you link it again, and your FACEIT level leaves your profile.'
									onConfirm={unlinkSteam}
								/>
							</div>
							<VisibilitySwitch
								label='Show Steam on my profile'
								description='Hides your Steam link and ID from visitors. Your FACEIT level still shows.'
								checked={showSteam}
								disabled={showSteamSaving}
								onCheckedChange={onShowSteamChange}
							/>
						</div>
					) : (
						<div className='flex flex-wrap items-center gap-3'>
							<Button onClick={linkSteam} isLoading={steamBusy}>
								Sign in with Steam
							</Button>
							<p className='text-xs text-neutral-400'>You’ll sign in on Steam and come straight back here.</p>
						</div>
					)}
				</AccountRow>
				<AccountRow tag={<GameTag game='LOL' />} title='Riot ID' requirement='Required for League of Legends tournaments. We never ask for your Riot password.' status={riotStatus}>
					<div className='space-y-4'>
						<RiotIdLinker
							value={riot}
							onChange={(next) => {
								const becameLinked = next.account?.status === 'linked' && riot.account?.status !== 'linked';
								const removed = !next.account && riot.account?.status === 'linked';
								setRiot(next);
								if (becameLinked || removed) onChanged();
							}}
						/>
						{riot.account?.status === 'linked' && (
							<VisibilitySwitch
								label='Show Riot ID on my profile'
								description='Hides your Riot ID from visitors once it’s verified.'
								checked={showRiot}
								disabled={showRiotSaving}
								onCheckedChange={onShowRiotChange}
							/>
						)}
					</div>
				</AccountRow>
			</div>
		</section>
	);
}
