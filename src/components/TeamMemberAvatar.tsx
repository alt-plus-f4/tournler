'use client';

import { useEffect, useState } from 'react';
import { HoverCard, HoverCardTrigger, HoverCardContent } from '@radix-ui/react-hover-card';
import { Crown } from 'lucide-react';
import { Cs2Team } from '@prisma/client';
import { UserCard } from './UserCard';
import Image from 'next/image';
import Link from 'next/link';
import { RemoveMemberButton } from './RemoveMemberButton';
import { PlayerFlair } from './PlayerFlair';
import { cn } from '@/lib/utils';
import { isOptimizable } from '@/lib/image-hosts';
import type { TeamMember } from '@/lib/models/team-model';

/**
 * The banner portrait. Hover/focus zoom keys off the `group/avatar` wrapper: 125% on the team
 * page, a subtler 108% inside a TeamCard (where the whole card is the link).
 */
function MemberAvatarImage({ image, name, subtle }: { image: string | null; name: string | null; subtle?: boolean }) {
	const [failed, setFailed] = useState(false);
	const motion = cn(
		'mb-[-10px] transition duration-200 group-hover/avatar:z-10',
		subtle ? 'motion-safe:group-hover/avatar:scale-[1.08]' : 'motion-safe:group-hover/avatar:scale-125 motion-safe:group-has-[a:focus-visible]/avatar:scale-125',
	);

	if (!image || failed) {
		return <div className={cn('flex h-[200px] w-full items-center justify-center bg-neutral-800 text-2xl font-bold text-white', motion)}>{(name || 'P').substring(0, 2).toUpperCase()}</div>;
	}

	return <Image className={motion} src={image} alt='' width={300} height={200} unoptimized={!isOptimizable(image)} onError={() => setFailed(true)} />;
}

interface TeamMemberAvatarProps {
	team: Cs2Team;
	member: TeamMember;
	enableTeamCapitanControls?: boolean;
	capitanId: string;
	userId?: string;
	/** false renders a plain, non-linked avatar (e.g. inside a TeamCard, which is itself a link). */
	interactive?: boolean;
}

export function TeamMemberAvatar({ team, member, enableTeamCapitanControls, capitanId, userId, interactive = true }: TeamMemberAvatarProps) {
	const [isMounted, setIsMounted] = useState(false);
	useEffect(() => setIsMounted(true), []);

	const isCaptain = member.id == capitanId;
	const crown = isCaptain && <Crown aria-hidden size='1em' className='absolute top-0 left-1/2 z-20 -translate-x-1/2 -translate-y-1/2 transform text-white' />;

	if (!interactive) {
		return (
			<div className='group/avatar relative'>
				{crown}
				<MemberAvatarImage image={member.image} name={member.name} subtle />
			</div>
		);
	}

	const avatar = (
		// `group` (unnamed) is kept for RemoveMemberButton's reveal-on-hover.
		<div className='group group/avatar relative'>
			{crown}
			<Link
				href={`/profile/${member.id}`}
				aria-label={`${member.name ?? 'Player'}${isCaptain ? ' (captain)' : ''}${member.verified ? ', verified' : ''}${typeof member.faceitLevel === 'number' ? `, FACEIT level ${member.faceitLevel}` : ''}, view profile`}
				className='relative block cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-white'
			>
				<MemberAvatarImage image={member.image} name={member.name} />
				<span aria-hidden className='pointer-events-none absolute inset-x-0 bottom-0 z-20 flex min-w-0 items-center justify-center gap-1 bg-gradient-to-t from-black via-black/80 to-transparent px-1 pt-5 pb-1.5'>
					<span className='truncate text-xs font-bold uppercase tracking-wide text-white underline-offset-4 group-hover/avatar:underline group-has-[a:focus-visible]/avatar:underline'>{member.name}</span>
					<PlayerFlair verified={member.verified} faceitLevel={member.faceitLevel} className='max-sm:hidden' />
				</span>
			</Link>

			{enableTeamCapitanControls && userId && member.id !== userId && <RemoveMemberButton teamId={team.id} memberId={member.id} memberName={member.name ?? ''} />}
		</div>
	);

	// Radix's HoverCardTrigger (asChild) attaches data-state/pointer-event props to
	// its child only on the client, which will never match the plain SSR markup no
	// matter what — suppressHydrationWarning only covers text-content mismatches,
	// not this kind of attribute mismatch. Render the identical plain avatar for
	// the first (server-matching) client render, then swap in the interactive
	// HoverCard wrapper post-mount, which is an ordinary client-side re-render and
	// can't cause a hydration mismatch.
	if (!isMounted) {
		return avatar;
	}

	return (
		<HoverCard>
			<HoverCardTrigger asChild>{avatar}</HoverCardTrigger>

			<HoverCardContent className='z-40 w-fit min-w-64 max-w-96 cursor-default rounded-lg border border-border bg-black p-4' side='top'>
				<UserCard member={member} />
			</HoverCardContent>
		</HoverCard>
	);
}
