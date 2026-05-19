import { Icons } from './Icons';
import { TeamMemberAvatar } from './TeamMemberAvatar';
import { ExtendedCs2Team } from '@/lib/models/team-model';

interface TeamBannerProps {
	team: ExtendedCs2Team;
	enableTeamCapitanControls?: boolean;
	capitanId: string;
	userId?: string;
}

export function TeamBanner({ team, enableTeamCapitanControls, capitanId, userId }: TeamBannerProps) {
	const members = team.members || [];
	const teamName = team.name || 'TEAM NAME';

	return (
		<div style={{ backgroundColor: team.background || '#000000' }} className='absolute inset-0'>
			<div className='absolute inset-0 flex flex-col items-center justify-center'>
				{team.logo ? (
					<img src={team.logo} alt={team.name} className='max-h-[160px] max-w-full object-contain' />
				) : (
					<>
						<span className='w-fit p-2 text-3xl font-bold bg-white text-black'>{teamName.toUpperCase()}</span>
						<Icons.logo className='px-4 py-2 scale-50 -mt-3 bg-white text-black' />
					</>
				)}
			</div>
			<div
				className='absolute inset-0 w-full h-full grid justify-center items-end'
				style={{
					padding: `0px ${2 + (5 - members.length) * 9.75}%`,
					gridTemplateColumns: `repeat(${members.length}, 1fr)`,
				}}
			>
				{members.map((member) => (
					<TeamMemberAvatar key={member.id} team={team} member={member} userId={userId} capitanId={capitanId} enableTeamCapitanControls={enableTeamCapitanControls} />
				))}
			</div>
		</div>
	);
}
