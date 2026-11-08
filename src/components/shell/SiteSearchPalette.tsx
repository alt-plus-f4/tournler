'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import type { Game } from '@prisma/client';
import { CommandDialog, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { TeamLogo } from '@/components/TeamLogo';
import { GameTag } from '@/components/games/GameMark';

type TeamHit = { id: number; name: string; logo: string | null; game: Game; members: unknown[] };

/**
 * Header search: debounced team-name search over the public `GET /api/teams?search=` endpoint
 * (the only public search the app has), plus quick jumps to the main lists.
 */
export default function SiteSearchPalette({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
	const router = useRouter();
	const [query, setQuery] = useState('');
	const [teams, setTeams] = useState<TeamHit[]>([]);
	const [loading, setLoading] = useState(false);

	useEffect(() => {
		if (!open) return;
		const q = query.trim();
		if (q.length < 2) {
			setTeams([]);
			setLoading(false);
			return;
		}
		let cancelled = false;
		setLoading(true);
		const timer = setTimeout(async () => {
			try {
				const res = await fetch(`/api/teams?search=${encodeURIComponent(q)}&limit=8`);
				if (!res.ok) throw new Error('Search failed');
				const data = await res.json();
				if (!cancelled) setTeams(data.teams ?? []);
			} catch {
				if (!cancelled) setTeams([]);
			} finally {
				if (!cancelled) setLoading(false);
			}
		}, 250);
		return () => {
			cancelled = true;
			clearTimeout(timer);
		};
	}, [query, open]);

	const go = (href: string) => {
		onOpenChange(false);
		router.push(href);
	};

	const q = query.trim();

	return (
		<CommandDialog open={open} onOpenChange={onOpenChange} shouldFilter={false}>
			<CommandInput placeholder='Search teams…' value={query} onValueChange={setQuery} aria-label='Search teams' />
			<CommandList>
				{q.length >= 2 && !loading && teams.length === 0 && <CommandEmpty>No teams match “{q}”.</CommandEmpty>}
				{q.length >= 2 && loading && teams.length === 0 && <p className='py-6 text-center text-sm text-muted-foreground'>Searching…</p>}
				{teams.length > 0 && (
					<CommandGroup heading='Teams'>
						{teams.map((team) => (
							<CommandItem key={team.id} value={`team-${team.id}`} onSelect={() => go(`/teams/${team.id}`)} className='gap-3'>
								<TeamLogo src={team.logo} name={team.name} size='xs' decorative />
								<span className='min-w-0 flex-1 truncate font-medium'>{team.name}</span>
								<span className='font-mono text-xs tabular-nums text-muted-foreground'>{team.members.length}/5</span>
								<GameTag game={team.game} />
							</CommandItem>
						))}
					</CommandGroup>
				)}
				{q.length < 2 && (
					<CommandGroup heading='Jump to'>
						<CommandItem value='tournaments' onSelect={() => go('/tournaments')}>
							Tournaments
						</CommandItem>
						<CommandItem value='matches' onSelect={() => go('/matches')}>
							Matches
						</CommandItem>
						<CommandItem value='teams' onSelect={() => go('/teams')}>
							Teams
						</CommandItem>
						<CommandItem value='news' onSelect={() => go('/news')}>
							News
						</CommandItem>
						<CommandItem value='forum' onSelect={() => go('/forum')}>
							Forum
						</CommandItem>
					</CommandGroup>
				)}
			</CommandList>
		</CommandDialog>
	);
}
