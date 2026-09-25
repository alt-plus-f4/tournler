'use client';

import { useEffect, useId, useState, type FormEvent } from 'react';
import { Info, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/lib/hooks/use-toast';
import { platformLabel, RIOT_PLATFORMS } from '@/lib/riot/regions';
import { RIOT_GAME_NAME_MAX, RIOT_GAME_NAME_MIN, RIOT_NOT_CONFIGURED_MESSAGE, RIOT_TAG_LINE_PATTERN, type RiotStatusResponse } from '@/lib/riot/types';
import { ConfirmUnlinkButton } from './AccountStatus';

interface RiotIdLinkerProps {
	value: RiotStatusResponse;
	onChange: (next: RiotStatusResponse) => void;
}

type Draft = { gameName: string; tagLine: string; region: string };

async function call(path: string, method: 'POST' | 'DELETE', body?: Draft): Promise<{ ok: true; data: RiotStatusResponse } | { ok: false; error: string }> {
	try {
		const res = await fetch(path, { method, headers: body ? { 'Content-Type': 'application/json' } : undefined, body: body ? JSON.stringify(body) : undefined });
		const json = await res.json().catch(() => ({}));
		if (!res.ok) return { ok: false, error: typeof json.error === 'string' ? json.error : 'Something went wrong. Try again.' };
		return { ok: true, data: json as RiotStatusResponse };
	} catch {
		return { ok: false, error: 'Couldn’t reach Tournler. Check your connection and try again.' };
	}
}

function useSecondsLeft(expiresAt: string | undefined) {
	const [left, setLeft] = useState<number | null>(null);
	useEffect(() => {
		if (!expiresAt) return setLeft(null);
		const end = new Date(expiresAt).getTime();
		const tick = () => setLeft(Math.max(0, Math.round((end - Date.now()) / 1000)));
		tick();
		const id = setInterval(tick, 1000);
		return () => clearInterval(id);
	}, [expiresAt]);
	return left;
}

function mmss(seconds: number) {
	return `${String(Math.floor(seconds / 60)).padStart(2, '0')}:${String(seconds % 60).padStart(2, '0')}`;
}

/**
 * Riot ID link + ownership check, the body of the "Riot ID" row (profile #accounts and onboarding).
 * 1 · enter gameName#tagLine + region → the server resolves it with Riot and hands back an icon.
 * 2 · set that base profile icon in the League client → verify. Riot Sign On would replace all of
 * this with one button once Riot approves the app.
 */
export function RiotIdLinker({ value, onChange }: RiotIdLinkerProps) {
	const { toast } = useToast();
	const ids = useId();
	const account = value.account;
	const [draft, setDraft] = useState<Draft>({ gameName: account?.gameName ?? '', tagLine: account?.tagLine ?? '', region: account?.region ?? 'euw1' });
	const [busy, setBusy] = useState<'link' | 'verify' | 'cancel' | null>(null);
	const [error, setError] = useState<string | null>(null);
	const secondsLeft = useSecondsLeft(account?.challenge?.expiresAt);

	const submit = async (body: Draft) => {
		setBusy('link');
		setError(null);
		const r = await call('/api/user/riot', 'POST', body);
		setBusy(null);
		if (!r.ok) return setError(r.error);
		onChange(r.data);
		if (r.data.account?.status === 'linked') toast({ title: `Riot ID updated to ${r.data.account.gameName}#${r.data.account.tagLine}` });
	};

	const onSubmit = (e: FormEvent) => {
		e.preventDefault();
		const tagLine = draft.tagLine.trim().replace(/^#/, '');
		const gameName = draft.gameName.trim();
		if (gameName.length < RIOT_GAME_NAME_MIN || gameName.length > RIOT_GAME_NAME_MAX) return setError(`Game name is ${RIOT_GAME_NAME_MIN}–${RIOT_GAME_NAME_MAX} characters.`);
		if (!RIOT_TAG_LINE_PATTERN.test(tagLine)) return setError('Tagline is 3–5 letters or numbers, without the #.');
		void submit({ ...draft, gameName, tagLine });
	};

	const verify = async () => {
		setBusy('verify');
		setError(null);
		const r = await call('/api/user/riot/verify', 'POST');
		setBusy(null);
		if (!r.ok) return setError(r.error);
		onChange(r.data);
		toast({ title: 'Riot ID verified', description: 'You can change your profile icon back now.' });
	};

	const remove = async () => {
		const r = await call('/api/user/riot', 'DELETE');
		if (!r.ok) {
			toast({ variant: 'destructive', title: 'Couldn’t unlink your Riot ID', description: r.error });
			return false;
		}
		setError(null);
		onChange({ ...value, account: null });
		return true;
	};

	const cancel = async () => {
		setBusy('cancel');
		await remove();
		setBusy(null);
	};

	const errorLine = error && (
		<p role='alert' className='text-sm text-signal-live'>
			{error}
		</p>
	);

	// Linked: the verified Riot ID, with a confirmed unlink.
	if (account?.status === 'linked') {
		return (
			<div className='flex flex-wrap items-center justify-between gap-3'>
				<dl className='grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 text-sm'>
					<dt className='text-neutral-400'>Riot ID</dt>
					<dd className='font-medium text-white'>
						{account.gameName}
						<span className='text-neutral-400'>#{account.tagLine}</span>
					</dd>
					<dt className='text-neutral-400'>Region</dt>
					<dd className='text-neutral-200'>{platformLabel(account.region)}</dd>
				</dl>
				<ConfirmUnlinkButton
					title='Unlink your Riot ID?'
					description='You won’t be able to register for League of Legends tournaments until you link and verify it again.'
					onConfirm={remove}
				/>
			</div>
		);
	}

	// Pending with an open challenge: step 2, prove it's yours.
	const challenge = account?.challenge;
	if (account && challenge && secondsLeft !== 0) {
		return (
			<div className='space-y-4'>
				<p className='text-sm text-neutral-300'>
					Found <span className='font-medium text-white'>{account.gameName}#{account.tagLine}</span> on {platformLabel(account.region)}.
				</p>
				<div className='flex flex-col gap-4 rounded-md border border-border bg-black p-4 sm:flex-row sm:items-center'>
					<div className='flex items-center gap-4'>
						{challenge.iconUrl ? (
							// Riot's public Data Dragon asset, shown as-is (not proxied or stored).
							// eslint-disable-next-line @next/next/no-img-element
							<img src={challenge.iconUrl} alt={`Profile icon #${challenge.iconId}`} width={64} height={64} className='h-16 w-16 rounded-sm border border-border' />
						) : null}
						<div>
							<div className='font-mono text-3xl font-bold leading-none tabular-nums text-white'>#{challenge.iconId}</div>
							<div className='mt-1 text-xs text-neutral-400'>Profile icon</div>
						</div>
					</div>
					<div className='min-w-0 flex-1 text-sm text-neutral-300 sm:border-l sm:border-border sm:pl-4'>
						<p>In the League client, set your profile icon to #{challenge.iconId}, then verify. You can change it back afterwards.</p>
						<p className='mt-2 text-xs text-neutral-400' aria-live='off'>
							<span className='font-mono tabular-nums text-neutral-200'>{secondsLeft === null ? '10:00' : mmss(secondsLeft)}</span> left to change your icon
						</p>
					</div>
				</div>
				{errorLine}
				<div className='flex flex-wrap gap-2'>
					<Button onClick={verify} isLoading={busy === 'verify'} disabled={busy !== null}>
						I’ve set it — verify
					</Button>
					<Button variant='outline' onClick={() => submit({ gameName: account.gameName, tagLine: account.tagLine, region: account.region })} isLoading={busy === 'link'} disabled={busy !== null}>
						<RefreshCw aria-hidden /> Pick another icon
					</Button>
					<Button variant='ghost' onClick={cancel} isLoading={busy === 'cancel'} disabled={busy !== null}>
						Cancel
					</Button>
				</div>
			</div>
		);
	}

	// Pending but the 10 minutes ran out (or no challenge is open).
	if (account) {
		return (
			<div className='space-y-3'>
				<p className='text-sm text-neutral-300'>
					The icon check for <span className='font-medium text-white'>{account.gameName}#{account.tagLine}</span> expired. Start again for a new icon.
				</p>
				{errorLine}
				<div className='flex flex-wrap gap-2'>
					<Button onClick={() => submit({ gameName: account.gameName, tagLine: account.tagLine, region: account.region })} isLoading={busy === 'link'} disabled={busy !== null}>
						Start again
					</Button>
					<Button variant='ghost' onClick={cancel} isLoading={busy === 'cancel'} disabled={busy !== null}>
						Remove
					</Button>
				</div>
			</div>
		);
	}

	// Not linked: step 1, tell us your Riot ID.
	if (!value.configured) {
		return (
			<p className='flex items-start gap-2 text-sm text-neutral-300'>
				<Info className='mt-0.5 h-4 w-4 shrink-0 text-neutral-400' aria-hidden />
				{RIOT_NOT_CONFIGURED_MESSAGE}
			</p>
		);
	}

	return (
		<form onSubmit={onSubmit} className='space-y-3' noValidate>
			<div className='grid gap-3 sm:grid-cols-[minmax(0,1fr)_7.5rem_7.5rem]'>
				<div className='space-y-1.5'>
					<label htmlFor={`${ids}-name`} className='text-xs font-bold uppercase tracking-[0.1em] text-neutral-400'>
						Game name
					</label>
					<Input
						id={`${ids}-name`}
						value={draft.gameName}
						onChange={(e) => setDraft((d) => ({ ...d, gameName: e.target.value }))}
						placeholder='valkyr'
						maxLength={RIOT_GAME_NAME_MAX}
						autoComplete='off'
						spellCheck={false}
						required
					/>
				</div>
				<div className='space-y-1.5'>
					<label htmlFor={`${ids}-tag`} className='text-xs font-bold uppercase tracking-[0.1em] text-neutral-400'>
						Tagline
					</label>
					<div className='relative'>
						<span className='pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm text-neutral-400' aria-hidden>
							#
						</span>
						<Input
							id={`${ids}-tag`}
							value={draft.tagLine}
							onChange={(e) => setDraft((d) => ({ ...d, tagLine: e.target.value.replace(/^#/, '') }))}
							placeholder='EUW'
							maxLength={5}
							autoComplete='off'
							spellCheck={false}
							className='pl-6'
							required
						/>
					</div>
				</div>
				<div className='space-y-1.5'>
					<label id={`${ids}-region-label`} className='text-xs font-bold uppercase tracking-[0.1em] text-neutral-400'>
						Region
					</label>
					<Select value={draft.region} onValueChange={(region) => setDraft((d) => ({ ...d, region }))}>
						<SelectTrigger aria-labelledby={`${ids}-region-label`}>
							<SelectValue>{platformLabel(draft.region)}</SelectValue>
						</SelectTrigger>
						<SelectContent>
							{RIOT_PLATFORMS.map((p) => (
								<SelectItem key={p.id} value={p.id}>
									{p.label} <span className='text-neutral-400'>· {p.name}</span>
								</SelectItem>
							))}
						</SelectContent>
					</Select>
				</div>
			</div>
			{errorLine}
			<div className='flex flex-wrap items-center gap-3'>
				<Button type='submit' isLoading={busy === 'link'}>
					Find my Riot ID
				</Button>
				<p className='text-xs text-neutral-400'>We never ask for your Riot password.</p>
			</div>
		</form>
	);
}
