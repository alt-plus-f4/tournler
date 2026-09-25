import { Avatar, AvatarImage, AvatarFallback } from '@radix-ui/react-avatar';
import { PlayerFlair } from '@/components/PlayerFlair';
import { TeamLogo } from '@/components/TeamLogo';
import type { TeamMember } from '@/lib/models/team-model';

interface UserCardProps {
	member: TeamMember;
	/** The team the card is shown for (e.g. the banner's team). Players can have one team per game, so there's no single "own team" to fall back to. */
	team?: { name: string | null; logo: string | null } | null;
}

/** Player hover card: avatar, name with Verified mark + FACEIT level, team, and the player's bio. */
export function UserCard({ member, team }: UserCardProps) {
	const bio = member.bio?.trim();
	return (
		<div className='flex gap-4'>
			<Avatar className='h-12 w-12 shrink-0 overflow-hidden rounded-full border border-border'>
				<AvatarImage src={member.image ?? ''} alt='' className='h-full w-full object-cover' />
				<AvatarFallback className='flex h-full w-full items-center justify-center bg-neutral-900 text-sm font-bold text-neutral-300'>{(member.name ?? '?').charAt(0).toUpperCase()}</AvatarFallback>
			</Avatar>
			<div className='w-full min-w-0 space-y-1'>
				<div className='flex min-w-0 items-center gap-1.5'>
					<h4 className='truncate text-sm font-bold text-white'>{member.name}</h4>
					<PlayerFlair verified={member.verified} faceitLevel={member.faceitLevel} />
				</div>
				{team?.name && (
					<p className='flex min-w-0 items-center gap-1.5 text-xs font-medium uppercase tracking-wide text-neutral-300'>
						<TeamLogo src={team.logo} name={team.name} size='xs' decorative />
						<span className='truncate'>{team.name}</span>
					</p>
				)}
				{bio && <p className='line-clamp-3 whitespace-pre-line break-words text-sm text-muted-foreground'>{bio}</p>}
			</div>
		</div>
	);
}
