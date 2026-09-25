import { TeamMemberAvatar } from './TeamMemberAvatar';
import { TeamLogo } from './TeamLogo';
import { ExtendedCs2Team } from '@/lib/models/team-model';

interface TeamBannerProps {
	team: ExtendedCs2Team;
	enableTeamCapitanControls?: boolean;
	capitanId: string;
	userId?: string;
	/** false renders plain avatars with no profile links or hover cards (for use inside a link). */
	interactive?: boolean;
}

/**
 * Team banner on the black stage. The team's chosen colour is only a faint tint under a black
 * scrim, so a light team colour (e.g. white) never turns the banner into the brightest thing on
 * the page.
 */
export function TeamBanner({ team, enableTeamCapitanControls, capitanId, userId, interactive = true }: TeamBannerProps) {
	const members = team.members || [];
	const teamName = team.name || 'Team';

	return (
		<div className='absolute inset-0 bg-black'>
			{team.background && <div aria-hidden className='absolute inset-0 opacity-20' style={{ backgroundColor: team.background }} />}
			<div aria-hidden className='absolute inset-0 bg-gradient-to-t from-black via-black/60 to-black/20' />
			<div className='absolute inset-0 flex flex-col items-center justify-center px-4'>
				{team.logo ? (
					<TeamLogo src={team.logo} name={teamName} size={interactive ? 'xl' : 'lg'} />
				) : (
					<span aria-hidden className='max-w-full truncate text-4xl font-black uppercase tracking-wide text-white/15'>
						{teamName}
					</span>
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
					<TeamMemberAvatar key={member.id} team={team} member={member} userId={userId} capitanId={capitanId} enableTeamCapitanControls={enableTeamCapitanControls} interactive={interactive} />
				))}
			</div>
		</div>
	);
}
