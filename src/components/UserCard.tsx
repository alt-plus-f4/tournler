import { Avatar, AvatarImage, AvatarFallback } from '@radix-ui/react-avatar';
import { PlayerFlair } from '@/components/PlayerFlair';
import type { TeamMember } from '@/lib/models/team-model';

interface UserCardProps {
	member: TeamMember;
}

export function UserCard({ member }: UserCardProps) {
	return (
		<div className='flex justify-between space-x-4'>
			<Avatar className='h-12 w-12 shrink-0 overflow-hidden rounded-full border border-border'>
				<AvatarImage src={member.image ?? ''} alt='' className='h-full w-full object-cover' />
				<AvatarFallback className='flex h-full w-full items-center justify-center bg-neutral-900 text-sm font-bold text-neutral-300'>{(member.name ?? '?').charAt(0).toUpperCase()}</AvatarFallback>
			</Avatar>
			<div className='w-full min-w-0 space-y-1'>
				<div className='flex min-w-0 items-center gap-1.5'>
					<h4 className='truncate text-sm font-semibold'>{member.name}</h4>
					<PlayerFlair verified={member.verified} faceitLevel={member.faceitLevel} />
				</div>
				<p className='text-sm text-muted-foreground'>{member.bio || `${member.name ?? 'This player'} is a player.`}</p>
			</div>
		</div>
	);
}
