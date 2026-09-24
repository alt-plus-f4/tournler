import Link from 'next/link';
import { Crown } from 'lucide-react';
import { PlayerAvatar } from '@/components/PlayerAvatar';
import { PlayerFlair } from '@/components/PlayerFlair';
import type { PlayerFlair as PlayerFlairData } from '@/lib/models/player-flair';

export interface RosterListMember extends Partial<PlayerFlairData> {
	id: string;
	name: string | null;
	image: string | null;
}

/** Compact roster: one linked row per player with avatar, name, Verified mark and FACEIT level. */
export function TeamRosterList({ members, captainId, label }: { members: RosterListMember[]; captainId?: string | null; label: string }) {
	if (members.length === 0) return <p className='px-4 py-3 text-xs text-muted-foreground'>No players yet.</p>;
	return (
		<ul aria-label={label} className='divide-y divide-border/60'>
			{members.map((m) => (
				<li key={m.id} className='group/player transition-colors duration-150 hover:bg-white/5 has-[a:focus-visible]:bg-white/5'>
					<Link href={`/profile/${m.id}`} className='flex min-h-11 cursor-pointer items-center gap-2.5 px-4 py-1.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring'>
						<PlayerAvatar src={m.image} name={m.name} size={24} />
						<span className='truncate text-sm font-medium text-white underline-offset-4 group-hover/player:underline group-has-[a:focus-visible]/player:underline'>{m.name ?? 'Unknown player'}</span>
						{m.id === captainId && (
							<span title='Captain' className='shrink-0 text-muted-foreground'>
								<Crown className='h-3.5 w-3.5' aria-hidden />
								<span className='sr-only'>Captain</span>
							</span>
						)}
						<PlayerFlair verified={m.verified} faceitLevel={m.faceitLevel} className='ml-auto' />
					</Link>
				</li>
			))}
		</ul>
	);
}
