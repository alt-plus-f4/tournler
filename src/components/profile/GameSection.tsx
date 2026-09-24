import Link from 'next/link';
import type { ReactNode } from 'react';
import type { Game } from '@prisma/client';
import { ArrowRight } from 'lucide-react';
import { GAME_META, gameParam } from '@/lib/games';
import { GameGlyph } from '@/components/games/GameMark';
import { TeamLogo } from '@/components/TeamLogo';

export interface ProfileTeamRef {
	id: number;
	name: string;
	logo: string | null;
	memberCount: number;
}

/**
 * One game's column on the dual-game profile (direction C): header with the game's monochrome
 * mark, then label/value rows (account, team, rating). CS2 and LoL sit side by side, stacked on mobile.
 */
export function GameSection({ game, children }: { game: Game; children: ReactNode }) {
	const headingId = `game-${gameParam(game)}-heading`;
	return (
		<section aria-labelledby={headingId} className='min-w-0 rounded-md border border-border bg-neutral-950'>
			<h3 id={headingId} className='flex items-center gap-2 border-b border-border px-4 py-3 text-sm font-black uppercase tracking-wide text-white sm:px-5'>
				<GameGlyph game={game} />
				{GAME_META[game].label}
			</h3>
			<dl className='divide-y divide-border'>{children}</dl>
		</section>
	);
}

export function GameRow({ label, children }: { label: string; children: ReactNode }) {
	return (
		<div className='grid grid-cols-[5.5rem_minmax(0,1fr)] items-center gap-3 px-4 py-3.5 sm:px-5'>
			<dt className='text-xs font-bold uppercase tracking-[0.1em] text-neutral-400'>{label}</dt>
			<dd className='min-w-0'>{children}</dd>
		</div>
	);
}

export function GameTeam({ game, team, isOwner }: { game: Game; team: ProfileTeamRef | null; isOwner: boolean }) {
	if (!team) {
		return isOwner ? (
			<p className='text-sm text-neutral-400'>
				Not on a {GAME_META[game].short} team.{' '}
				<Link href={`/teams?game=${gameParam(game)}`} className='font-medium text-white underline underline-offset-4'>
					Browse teams
				</Link>
			</p>
		) : (
			<p className='text-sm text-neutral-400'>Not on a {GAME_META[game].short} team</p>
		);
	}
	return (
		<Link href={`/teams/${team.id}`} className='group flex min-w-0 items-center gap-3'>
			<TeamLogo src={team.logo} name={team.name} size='sm' decorative />
			<span className='min-w-0 flex-1'>
				<span className='block truncate font-bold uppercase tracking-wide text-white group-hover:underline group-hover:underline-offset-4'>{team.name}</span>
				<span className='block font-mono text-xs tabular-nums text-neutral-400'>
					{team.memberCount} {team.memberCount === 1 ? 'player' : 'players'}
				</span>
			</span>
			<ArrowRight className='h-4 w-4 shrink-0 text-neutral-600 transition-colors group-hover:text-white' aria-hidden />
		</Link>
	);
}
