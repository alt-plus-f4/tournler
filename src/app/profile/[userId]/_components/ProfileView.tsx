'use client';

import { useState, useEffect, useTransition, type ReactNode } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import * as TabsPrimitive from '@radix-ui/react-tabs';
import { ArrowRight, Camera, ExternalLink, Pencil, Trophy, User as UserIcon, Users } from 'lucide-react';
import { useToast } from '@/lib/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';
import { AvatarStep } from '@/components/onboarding/AvatarStep';
import { AccountDataSection } from '@/components/profile/AccountDataSection';
import { TrophyIcon } from '@/components/trophies/TrophyIcon';
import { TrophySlider } from '@/components/trophies/TrophySlider';
import { LevelBadge } from '@/components/LevelBadge';
import { DiscordIcon, SteamIcon } from '@/components/Icons';
import { faceitLevelProgress } from '@/lib/faceit';
import { useHydrated } from '@/lib/hooks/use-hydrated';

export interface SteamData {
	steamId: string;
	createdAt: string;
}

export interface FaceitInfo {
	level: number;
	elo: number;
	faceitUrl: string | null;
}

interface ProfileBadge {
	awardedAt: string;
	badge: {
		id: number;
		name: string;
		description: string | null;
		icon: string;
		color: string;
		isOverlay: boolean;
		imageUrl: string | null;
	};
}

export interface PublicProfileData {
	id: string;
	name: string;
	bio?: string;
	image?: string;
	steam?: SteamData | null;
	discord?: { discordId: string } | null;
	cs2Team?: { id: number; name: string; logo: string | null } | null;
	badges?: ProfileBadge[];
	createdAt: string;
}

export interface PlayerCareerStats {
	kills: number;
	deaths: number;
	assists: number;
	matchesPlayed: number;
	kd: number;
	wins: number;
	losses: number;
	winRate: number;
}

export interface PlayerRecentMatch {
	matchId: number;
	tournamentName: string;
	opponentName: string;
	result: 'W' | 'L';
	scoreFor: number | null;
	scoreAgainst: number | null;
	matchDate: string;
	kills: number;
	deaths: number;
	assists: number;
}

type ProfileTab = 'overview' | 'matches';

// The profile is server-rendered now, so dates and numbers are printed in a fixed locale/timezone
// (en-US, UTC) for SSR + hydration and in the viewer's own locale right after (see useHydrated).
type Fmt = { locale: string | undefined; timeZone: string | undefined };
const SSR_FMT: Fmt = { locale: 'en-US', timeZone: 'UTC' };
const VIEWER_FMT: Fmt = { locale: undefined, timeZone: undefined };

function formatDate(isoDate: string, fmt: Fmt): string {
	return new Date(isoDate).toLocaleDateString(fmt.locale, { day: '2-digit', month: 'short', year: 'numeric', timeZone: fmt.timeZone });
}

function formatMonthYear(isoDate: string, fmt: Fmt): string {
	return new Date(isoDate).toLocaleDateString(fmt.locale, { month: 'short', year: 'numeric', timeZone: fmt.timeZone });
}

function initials(name: string): string {
	return (name || '?').trim().slice(0, 2).toUpperCase();
}

function SectionLabel({ children, action }: { children: ReactNode; action?: ReactNode }) {
	return (
		<div className='mb-3 flex items-center justify-between gap-3'>
			<h2 className='text-xs font-bold uppercase tracking-[0.1em] text-neutral-400'>{children}</h2>
			{action}
		</div>
	);
}

function ResultChip({ result, href }: { result: 'W' | 'L'; href?: string }) {
	const className = `inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-sm text-xs font-bold ${result === 'W' ? 'bg-white text-black' : 'border border-neutral-600 text-neutral-300'}`;
	if (!href) return <span className={className}>{result}</span>;
	return (
		<Link href={href} className={`${className} transition-opacity hover:opacity-80`} aria-label={result === 'W' ? 'Win' : 'Loss'}>
			{result}
		</Link>
	);
}

/** FACEIT-style match rows: result, score, opponent, event, per-match K-D-A and K/D, date. */
function MatchTable({ matches, fmt }: { matches: PlayerRecentMatch[]; fmt: Fmt }) {
	return (
		<div className='overflow-x-auto rounded-md border border-border bg-neutral-950'>
			<table className='w-full text-sm'>
				<thead>
					<tr className='border-b border-border text-left text-xs uppercase tracking-[0.1em] text-neutral-400'>
						<th className='px-4 py-3 font-bold'>Result</th>
						<th className='px-4 py-3 font-bold'>Opponent</th>
						<th className='hidden px-4 py-3 font-bold md:table-cell'>Tournament</th>
						<th className='hidden px-4 py-3 text-center font-bold sm:table-cell'>K - D - A</th>
						<th className='px-4 py-3 text-center font-bold'>K/D</th>
						<th className='hidden px-4 py-3 text-right font-bold sm:table-cell'>Date</th>
					</tr>
				</thead>
				<tbody>
					{matches.map((m) => {
						const kd = m.deaths > 0 ? m.kills / m.deaths : m.kills;
						return (
							<tr key={m.matchId} className='group border-b border-border transition-colors last:border-b-0 hover:bg-white/[0.04]'>
								<td className='px-4 py-3'>
									<div className='flex items-center gap-2 whitespace-nowrap sm:gap-3'>
										<ResultChip result={m.result} />
										<span className='font-mono tabular-nums text-neutral-300'>
											<span className={m.result === 'W' ? 'font-bold text-white' : ''}>{m.scoreFor ?? '-'}</span>
											<span className='text-neutral-600' aria-hidden> : </span>
											<span className={m.result === 'L' ? 'font-bold text-white' : ''}>{m.scoreAgainst ?? '-'}</span>
										</span>
									</div>
								</td>
								<td className='max-w-[140px] px-3 py-3 sm:max-w-[200px] sm:px-4'>
									<Link href={`/matches/${m.matchId}`} className='block truncate font-medium text-white underline-offset-4 hover:underline'>
										{m.opponentName}
									</Link>
								</td>
								<td className='hidden max-w-[240px] truncate px-4 py-3 text-neutral-400 md:table-cell'>{m.tournamentName}</td>
								<td className='hidden whitespace-nowrap px-4 py-3 text-center font-mono tabular-nums text-neutral-300 sm:table-cell'>
									{m.kills}
									<span className='text-neutral-600' aria-hidden> - </span>
									{m.deaths}
									<span className='text-neutral-600' aria-hidden> - </span>
									{m.assists}
								</td>
								<td className={`px-4 py-3 text-center font-mono tabular-nums ${kd >= 1 ? 'font-bold text-white' : 'text-neutral-400'}`}>{kd.toFixed(2)}</td>
								<td className='hidden whitespace-nowrap px-4 py-3 text-right text-neutral-400 sm:table-cell'>{formatDate(m.matchDate, fmt)}</td>
							</tr>
						);
					})}
				</tbody>
			</table>
		</div>
	);
}

function EmptyPanel({ icon, title, children }: { icon: ReactNode; title: string; children?: ReactNode }) {
	return (
		<div className='flex flex-col items-center rounded-md border border-dashed border-border bg-neutral-950/60 px-6 py-12 text-center'>
			<div className='mb-3 text-neutral-600'>{icon}</div>
			<p className='font-bold text-white'>{title}</p>
			{children && <div className='mt-1 max-w-sm text-sm text-neutral-400'>{children}</div>}
		</div>
	);
}

/** Rendered by the server page when no account matches the link (same panel the client page used to show). */
export function ProfileNotFound() {
	return (
		<div className='flex min-h-screen items-center justify-center bg-black px-4'>
			<div className='w-full max-w-md'>
				<EmptyPanel icon={<UserIcon className='h-12 w-12' />} title='Player not found'>
					No Tournler account matches this link. It may have been renamed or deleted.
					<div className='mt-5'>
						<Button asChild variant='outline' size='sm'>
							<Link href='/teams'>Browse teams</Link>
						</Button>
					</div>
				</EmptyPanel>
			</div>
		</div>
	);
}

interface ProfileViewProps {
	profile: PublicProfileData;
	stats: PlayerCareerStats | null;
	recentMatches: PlayerRecentMatch[];
	faceit: FaceitInfo | null;
	/** Decided on the server from the session; only gates owner-only controls (every write re-checks). */
	isOwner: boolean;
}

/**
 * The interactive profile (editing, avatar, Steam link, tabs). Its data comes from the server page
 * as props; after a write, `refresh()` re-renders the server page and new props flow in.
 */
export function ProfileView({ profile, stats, recentMatches, faceit, isOwner }: ProfileViewProps) {
	const router = useRouter();
	const [isRefreshing, startRefresh] = useTransition();
	const fmt = useHydrated() ? VIEWER_FMT : SSR_FMT;
	const num = (n: number) => n.toLocaleString(fmt.locale);
	const [tab, setTab] = useState<ProfileTab>('overview');
	const [isEditing, setIsEditing] = useState(false);
	const [isSaving, setIsSaving] = useState(false);
	const [isAvatarEditing, setIsAvatarEditing] = useState(false);
	const [avatarLoaded, setAvatarLoaded] = useState(false);
	const [eloShown, setEloShown] = useState(false);
	const [editName, setEditName] = useState('');
	const [editBio, setEditBio] = useState('');
	const { toast } = useToast();

	/** Re-reads the profile on the server; `then` state updates commit together with the new props. */
	const refresh = (then?: () => void) =>
		startRefresh(() => {
			router.refresh();
			then?.();
		});

	useEffect(() => {
		setAvatarLoaded(false);
	}, [profile.image]);

	// The Elo bar is the page's one authored motion: it sweeps to the player's position once the data is in.
	useEffect(() => {
		if (!faceit) return;
		const id = requestAnimationFrame(() => setEloShown(true));
		return () => cancelAnimationFrame(id);
	}, [faceit]);


	const startEdit = () => {
		setEditName(profile.name || '');
		setEditBio(profile.bio || '');
		setIsEditing(true);
	};

	const saveProfile = async () => {
		setIsSaving(true);
		try {
			const res = await fetch('/api/profile', {
				method: 'PATCH',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ name: editName, bio: editBio }),
			});
			if (!res.ok) throw new Error('Failed to save');
			refresh(() => setIsEditing(false));
			toast({ title: 'Profile updated' });
		} catch (e) {
			console.error(e);
			toast({ variant: 'destructive', title: 'Couldn’t save your profile', description: 'Check your connection and try again.' });
		} finally {
			setIsSaving(false);
		}
	};

	const linkSteam = async () => {
		try {
			const me = await fetch('/api/user');
			if (!me.ok) {
				try {
					sessionStorage.setItem('preAuthPath', window.location.pathname + window.location.search);
				} catch (error) {
					void error;
				}
				window.location.href = '/sign-in';
				return;
			}
			const response = await fetch('/api/auth/steam');
			if (!response.ok) throw new Error('Failed to initiate Steam auth');
			const data = await response.json();
			if (!data.url) throw new Error('Missing Steam login URL');
			window.location.href = data.url;
		} catch (e) {
			console.error('Failed to initiate Steam auth', e);
			toast({ variant: 'destructive', title: 'Couldn’t reach Steam', description: 'Try linking your account again in a moment.' });
		}
	};

	const unlinkSteam = async () => {
		try {
			const del = await fetch('/api/user/steam', { method: 'DELETE' });
			if (!del.ok) throw new Error('Failed to unlink');
			refresh();
		} catch (e) {
			console.error('Failed to unlink Steam', e);
			toast({ variant: 'destructive', title: 'Couldn’t unlink Steam' });
		}
	};

	const overlayBadges = (profile.badges ?? []).filter((b) => b.badge.isOverlay).slice(0, 2);
	const trophies = (profile.badges ?? []).filter((b) => !b.badge.isOverlay);
	const progress = faceit ? faceitLevelProgress(faceit.level, faceit.elo) : null;
	const form = recentMatches.slice(0, 5);
	const avgKills = stats && stats.matchesPlayed > 0 ? stats.kills / stats.matchesPlayed : 0;
	const decided = stats ? stats.wins + stats.losses : 0;

	const avatar = profile.image ? (
		<Image
			src={profile.image}
			alt={`${profile.name}'s avatar`}
			width={112}
			height={112}
			preload
			className={`h-full w-full object-cover transition-opacity duration-300 ${avatarLoaded ? 'opacity-100' : 'opacity-0'}`}
			onLoad={() => setAvatarLoaded(true)}
		/>
	) : (
		<span className='flex h-full w-full items-center justify-center bg-neutral-800 text-3xl font-black text-neutral-400'>{initials(profile.name)}</span>
	);

	const tabTrigger = 'relative flex h-12 shrink-0 items-center gap-2 px-4 text-xs font-bold uppercase tracking-[0.1em] text-neutral-400 transition-colors hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring data-[state=active]:text-white after:absolute after:inset-x-4 after:bottom-0 after:h-0.5 after:bg-white after:opacity-0 after:transition-opacity data-[state=active]:after:opacity-100 sm:px-5 sm:after:inset-x-5';

	return (
		<div className='min-h-screen bg-black pb-16 pt-6 selection:bg-white selection:text-black sm:pt-8'>
			<div className='mx-auto max-w-6xl px-4'>
				{/* Hero. There's no per-user cover image, so the player's own avatar is blown up, desaturated and
				    pushed deep into black behind them, the same way a FACEIT profile banner sits behind the identity row. */}
				<section className='relative isolate overflow-hidden rounded-t-md border border-border bg-neutral-950'>
					{profile.image && (
						<Image src={profile.image} alt='' aria-hidden fill sizes='100vw' className='-z-20 scale-125 object-cover opacity-50 blur-2xl grayscale' />
					)}
					<div className='absolute inset-0 -z-10 bg-gradient-to-t from-black via-black/80 to-black/40' />
					<div
						aria-hidden
						className='absolute inset-0 -z-10 opacity-[0.07]'
						style={{ backgroundImage: 'repeating-linear-gradient(0deg, #fff 0 1px, transparent 1px 4px)' }}
					/>

					{isOwner && (
						<div className='absolute right-4 top-4 flex gap-2'>
							{!isEditing ? (
								<Button variant='outline' size='sm' onClick={startEdit} className='border-white/15 bg-black/50 backdrop-blur-sm'>
									<Pencil className='mr-2 h-3.5 w-3.5' /> Edit profile
								</Button>
							) : (
								<>
									<Button variant='outline' size='sm' onClick={() => setIsEditing(false)} disabled={isSaving || isRefreshing} className='border-white/15 bg-black/50 backdrop-blur-sm'>
										Cancel
									</Button>
									<Button size='sm' onClick={saveProfile} isLoading={isSaving || isRefreshing}>
										Save
									</Button>
								</>
							)}
						</div>
					)}

					<div className='flex flex-col gap-6 px-5 pb-6 pt-20 sm:px-8 sm:pt-28 md:flex-row md:items-end'>
						<div className='flex min-w-0 flex-1 flex-col gap-5 sm:flex-row sm:items-end'>
							{/* Avatar with status overlays pinned to its corners */}
							<div className='relative h-24 w-24 shrink-0 sm:h-28 sm:w-28'>
								<div className='h-full w-full overflow-hidden rounded-md border border-white/15 bg-neutral-900'>
									{isOwner && isEditing ? (
										<button type='button' onClick={() => setIsAvatarEditing(true)} className='group relative block h-full w-full' aria-label='Change avatar'>
											{avatar}
											<span className='absolute inset-0 flex items-center justify-center bg-black/60 opacity-100 transition-opacity sm:opacity-0 sm:group-hover:opacity-100'>
												<Camera className='h-6 w-6 text-white' />
											</span>
										</button>
									) : (
										avatar
									)}
								</div>
								{profile.image && !avatarLoaded && <div className='absolute inset-0 animate-pulse rounded-md bg-neutral-800' />}
								{faceit && (
									<div className='absolute -bottom-2 -right-2 rounded-full bg-black p-0.5'>
										<LevelBadge level={faceit.level} size='lg' />
									</div>
								)}
								{overlayBadges.map(({ badge }, i) => (
									<span
										key={badge.id}
										title={badge.description ?? badge.name}
										className='absolute -left-2 flex h-6 w-6 items-center justify-center overflow-hidden rounded-full bg-black ring-2 ring-black'
										style={{ top: `${-6 + i * 24}px`, zIndex: 10 - i }}
									>
										<TrophyIcon badge={badge} size={24} priority />
									</span>
								))}
							</div>

							<div className='min-w-0 flex-1'>
								{!isEditing ? (
									<h1 className='truncate text-3xl font-black uppercase leading-none tracking-wide text-white sm:text-5xl' title={profile.name}>
										{profile.name}
									</h1>
								) : (
									<Input value={editName} onChange={(e) => setEditName(e.target.value)} aria-label='Display name' className='h-11 max-w-sm border-white/15 bg-black/60 text-lg font-bold' />
								)}

								<div className='mt-3 flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-neutral-400'>
									{profile.cs2Team && (
										<Link href={`/teams/${profile.cs2Team.id}`} className='flex items-center gap-2 font-medium text-white hover:underline hover:underline-offset-4'>
											{profile.cs2Team.logo ? (
												<Image src={profile.cs2Team.logo} alt='' width={18} height={18} className='h-[18px] w-[18px] object-contain' />
											) : (
												<Users className='h-4 w-4 text-neutral-400' />
											)}
											{profile.cs2Team.name}
										</Link>
									)}
									<span>Joined {formatMonthYear(profile.createdAt, fmt)}</span>
									{profile.steam && (
										<a href={`https://steamcommunity.com/profiles/${profile.steam.steamId}`} target='_blank' rel='noopener noreferrer' className='text-neutral-400 transition-colors hover:text-white' aria-label='Steam profile'>
											<SteamIcon className='h-4 w-4' />
										</a>
									)}
									{profile.discord && (
										<a href={`https://discord.com/users/${profile.discord.discordId}`} target='_blank' rel='noreferrer' className='text-neutral-400 transition-colors hover:text-white' aria-label='Discord profile'>
											<DiscordIcon className='h-4 w-4' />
										</a>
									)}
								</div>

								{!isEditing ? (
									profile.bio && <p className='mt-2 line-clamp-2 max-w-prose text-sm text-neutral-300'>{profile.bio}</p>
								) : (
									<Input value={editBio} onChange={(e) => setEditBio(e.target.value)} placeholder='Short bio' aria-label='Bio' className='mt-3 h-9 max-w-md border-white/15 bg-black/60' />
								)}
							</div>
						</div>

						{/* Skill panel: real FACEIT level and Elo (src/lib/faceit.ts), or nothing. Never a fallback number. */}
						{faceit ? (
							<div className='w-full shrink-0 rounded-md border border-white/10 bg-black/60 p-4 backdrop-blur-sm md:w-72'>
								<div className='flex items-center justify-between'>
									<span className='text-xs font-bold uppercase tracking-[0.1em] text-neutral-400'>FACEIT skill</span>
									{faceit.faceitUrl && (
										<a href={faceit.faceitUrl} target='_blank' rel='noopener noreferrer' className='flex items-center gap-1 text-xs text-neutral-400 transition-colors hover:text-white'>
											View <ExternalLink className='h-3 w-3' />
										</a>
									)}
								</div>
								<div className='mt-3 flex items-center gap-3'>
									<LevelBadge level={faceit.level} size='xl' />
									<div>
										<div className='font-mono text-3xl font-bold leading-none tabular-nums text-white'>{num(faceit.elo)}</div>
										<div className='mt-1 text-xs text-neutral-400'>Elo · Level {faceit.level}</div>
									</div>
								</div>
								{progress && (
									<div className='mt-4'>
										<div className='h-1 overflow-hidden rounded-full bg-neutral-800'>
											<div
												className='h-full origin-left rounded-full bg-white transition-transform duration-1000 motion-reduce:transition-none'
												style={{ width: `${progress.percent}%`, transform: `scaleX(${eloShown ? 1 : 0})`, transitionTimingFunction: 'cubic-bezier(0.16, 1, 0.3, 1)' }}
											/>
										</div>
										<div className='mt-1.5 flex justify-between font-mono text-xs tabular-nums text-neutral-400'>
											<span>{num(progress.floor)}</span>
											{progress.ceiling !== null ? (
												<span>
													<span className='text-neutral-300'>+{num(progress.ceiling - faceit.elo + 1)}</span> to Lvl {faceit.level + 1}
												</span>
											) : (
												<span className='text-neutral-300'>Max level</span>
											)}
										</div>
									</div>
								)}
							</div>
						) : (
							isOwner &&
							!profile.steam && (
								<div className='w-full shrink-0 rounded-md border border-dashed border-white/15 bg-black/60 p-4 backdrop-blur-sm md:w-72'>
									<p className='text-sm font-medium text-white'>Show your FACEIT level</p>
									<p className='mt-1 text-xs text-neutral-400'>Link Steam and we’ll pull your real level and Elo from FACEIT.</p>
									<Button size='sm' variant='outline' onClick={linkSteam} className='mt-3'>
										<SteamIcon className='mr-2 h-4 w-4' /> Link Steam
									</Button>
								</div>
							)
						)}
					</div>
				</section>

				{/* HLTV-style trophy row, attached under the hero. Hidden entirely when the player has none. */}
				<TrophySlider trophies={trophies} className='border-x border-b border-border bg-neutral-950 px-5 py-4 sm:px-8' />

				<TabsPrimitive.Root value={tab} onValueChange={(v) => setTab(v as ProfileTab)}>
					<div className='flex items-center justify-between gap-4 overflow-x-auto rounded-b-md border-x border-b border-border bg-neutral-950 pr-4'>
						<TabsPrimitive.List aria-label='Profile sections' className='flex'>
							<TabsPrimitive.Trigger value='overview' className={tabTrigger}>
								Overview
							</TabsPrimitive.Trigger>
							<TabsPrimitive.Trigger value='matches' className={tabTrigger}>
								Matches
								<span className='font-mono text-xs tabular-nums text-neutral-400'>{recentMatches.length}</span>
							</TabsPrimitive.Trigger>
						</TabsPrimitive.List>
						{form.length > 0 && (
							<div className='hidden shrink-0 items-center gap-2 sm:flex'>
								<span className='text-xs font-bold uppercase tracking-[0.1em] text-neutral-400'>Form</span>
								<div className='flex gap-1'>
									{form.map((m) => (
										<ResultChip key={m.matchId} result={m.result} href={`/matches/${m.matchId}`} />
									))}
								</div>
							</div>
						)}
					</div>

					<TabsPrimitive.Content value='overview' className='mt-6 focus-visible:outline-none'>
						<div className='grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px]'>
							<div className='min-w-0 space-y-8'>
								<section>
									<SectionLabel>Lifetime stats</SectionLabel>
									{!stats ? (
										<EmptyPanel icon={<Trophy className='h-10 w-10' />} title='No matches on record yet'>
											Stats come from the game server once a tournament or pickup match finishes.
											{isOwner && (
												<div className='mt-4'>
													<Button asChild size='sm' variant='outline'>
														<Link href='/tournaments'>Find a tournament</Link>
													</Button>
												</div>
											)}
										</EmptyPanel>
									) : (
										<div className='rounded-md border border-border bg-neutral-950'>
											<div className='grid grid-cols-3 divide-x divide-border'>
												{[
													{ label: 'Matches', value: num(stats.matchesPlayed) },
													{ label: 'Win rate', value: `${stats.winRate}%` },
													{ label: 'K/D ratio', value: stats.kd.toFixed(2) },
												].map((s) => (
													<div key={s.label} className='px-4 py-5 sm:px-6'>
														<div className='font-mono text-2xl font-bold tabular-nums text-white sm:text-4xl'>{s.value}</div>
														<div className='mt-1 text-xs text-neutral-400'>{s.label}</div>
													</div>
												))}
											</div>
											{decided > 0 && (
												<div className='border-t border-border px-4 py-4 sm:px-6'>
													<div className='flex h-1.5 overflow-hidden rounded-full bg-neutral-800'>
														<div className='h-full bg-white' style={{ width: `${(stats.wins / decided) * 100}%` }} />
														<div className='h-full flex-1 bg-neutral-700' />
													</div>
													<div className='mt-2 flex justify-between font-mono text-xs tabular-nums'>
														<span className='text-neutral-300'>
															{stats.wins} <span className='font-sans text-neutral-400'>wins</span>
														</span>
														<span className='text-neutral-300'>
															{stats.losses} <span className='font-sans text-neutral-400'>losses</span>
														</span>
													</div>
												</div>
											)}
											<dl className='grid grid-cols-2 divide-border border-t border-border sm:grid-cols-4 sm:divide-x'>
												{[
													{ label: 'Kills', value: num(stats.kills) },
													{ label: 'Deaths', value: num(stats.deaths) },
													{ label: 'Assists', value: num(stats.assists) },
													{ label: 'Avg. kills', value: avgKills.toFixed(1) },
												].map((s) => (
													<div key={s.label} className='flex items-baseline justify-between gap-2 px-4 py-3 sm:block sm:px-6'>
														<dt className='text-xs text-neutral-400 sm:order-2 sm:mt-0.5'>{s.label}</dt>
														<dd className='font-mono text-base font-bold tabular-nums text-neutral-200'>{s.value}</dd>
													</div>
												))}
											</dl>
										</div>
									)}
								</section>

								{recentMatches.length > 0 && (
									<section>
										<SectionLabel
											action={
												recentMatches.length > 5 && (
													<button type='button' onClick={() => setTab('matches')} className='flex items-center gap-1 text-xs font-medium text-neutral-400 transition-colors hover:text-white'>
														All matches <ArrowRight className='h-3.5 w-3.5' />
													</button>
												)
											}
										>
											Recent matches
										</SectionLabel>
										<MatchTable matches={recentMatches.slice(0, 5)} fmt={fmt} />
									</section>
								)}
							</div>

							<aside className='space-y-8'>
								<section>
									<SectionLabel>Team</SectionLabel>
									{profile.cs2Team ? (
										<Link href={`/teams/${profile.cs2Team.id}`} className='group flex items-center gap-3 rounded-md border border-border bg-neutral-950 p-4 transition-colors hover:border-neutral-600'>
											{profile.cs2Team.logo ? (
												<Image src={profile.cs2Team.logo} alt='' width={40} height={40} className='h-10 w-10 object-contain' />
											) : (
												<div className='flex h-10 w-10 items-center justify-center rounded-sm bg-neutral-800 text-xs font-bold text-neutral-400'>{initials(profile.cs2Team.name)}</div>
											)}
											<span className='min-w-0 flex-1 truncate font-bold uppercase tracking-wide text-white'>{profile.cs2Team.name}</span>
											<ArrowRight className='h-4 w-4 text-neutral-600 transition-colors group-hover:text-white' />
										</Link>
									) : (
										<div className='rounded-md border border-dashed border-border px-4 py-5 text-sm text-neutral-400'>
											{isOwner ? (
												<>
													You’re not on a team yet.{' '}
													<Link href='/teams' className='font-medium text-white underline underline-offset-4'>
														Browse teams
													</Link>
												</>
											) : (
												'Not on a team.'
											)}
										</div>
									)}
								</section>

								<section>
									<SectionLabel>Connected accounts</SectionLabel>
									<div className='divide-y divide-border rounded-md border border-border bg-neutral-950'>
										<div className='flex items-center gap-3 p-4'>
											<span className={`flex h-9 w-9 items-center justify-center rounded-sm ${profile.steam ? 'bg-[#171a21]' : 'bg-neutral-800'}`}>
												<SteamIcon className={`h-5 w-5 ${profile.steam ? 'text-[#66c0f4]' : 'text-neutral-400'}`} />
											</span>
											<div className='min-w-0 flex-1'>
												<p className='text-sm font-medium text-white'>Steam</p>
												{profile.steam ? (
													<a href={`https://steamcommunity.com/profiles/${profile.steam.steamId}`} target='_blank' rel='noopener noreferrer' className='flex items-center gap-1 text-xs text-neutral-400 hover:text-white'>
														View profile <ExternalLink className='h-3 w-3' />
													</a>
												) : (
													<p className='text-xs text-neutral-400'>Not linked</p>
												)}
											</div>
											{isOwner &&
												(profile.steam ? (
													<Button variant='ghost' size='sm' onClick={unlinkSteam} className='text-signal-live hover:text-red-300'>
														Unlink
													</Button>
												) : (
													<Button variant='outline' size='sm' onClick={linkSteam}>
														Link
													</Button>
												))}
										</div>
										<div className='flex items-center gap-3 p-4'>
											<span className={`flex h-9 w-9 items-center justify-center rounded-sm ${profile.discord ? 'bg-[#5865F2]' : 'bg-neutral-800'}`}>
												<DiscordIcon className={`h-5 w-5 ${profile.discord ? 'text-white' : 'text-neutral-400'}`} />
											</span>
											<div className='min-w-0 flex-1'>
												<p className='text-sm font-medium text-white'>Discord</p>
												{profile.discord ? (
													<a href={`https://discord.com/users/${profile.discord.discordId}`} target='_blank' rel='noreferrer' className='block truncate font-mono text-xs text-neutral-400 hover:text-white'>
														{profile.discord.discordId}
													</a>
												) : (
													<p className='text-xs text-neutral-400'>{isOwner ? 'Not connected' : 'Not shown'}</p>
												)}
											</div>
											{isOwner && !profile.discord && (
												<Button variant='outline' size='sm' asChild>
													<Link href='/sign-in'>Connect</Link>
												</Button>
											)}
										</div>
									</div>
								</section>
							</aside>
						</div>
					</TabsPrimitive.Content>

					<TabsPrimitive.Content value='matches' className='mt-6 focus-visible:outline-none'>
						<SectionLabel>Match history</SectionLabel>
						{recentMatches.length > 0 ? (
							<MatchTable matches={recentMatches} fmt={fmt} />
						) : (
							<EmptyPanel icon={<Trophy className='h-10 w-10' />} title='No finished matches'>
								Completed tournament and pickup matches show up here with the player’s K-D-A.
							</EmptyPanel>
						)}
					</TabsPrimitive.Content>

				</TabsPrimitive.Root>

				{isOwner && <AccountDataSection />}

				{isOwner && isEditing && (
					<Dialog open={isAvatarEditing} onOpenChange={setIsAvatarEditing}>
						<DialogContent className='w-fit max-w-none border-border bg-black text-white'>
							<DialogTitle className='text-white'>Change avatar</DialogTitle>
							<AvatarStep
								loading={false}
								previousStep={() => setIsAvatarEditing(false)}
								nextStep={async (blob) => {
									try {
										const text = await blob.text();
										const res = await fetch('/api/user/avatar', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ avatar: text }) });
										if (!res.ok) throw new Error('Upload failed');
										toast({ title: 'Avatar updated' });
										refresh(() => setIsAvatarEditing(false));
									} catch (e) {
										console.error(e);
										toast({ variant: 'destructive', title: 'Avatar upload failed', description: 'Try a smaller image or a different format.' });
									}
								}}
							/>
						</DialogContent>
					</Dialog>
				)}
			</div>
		</div>
	);
}
