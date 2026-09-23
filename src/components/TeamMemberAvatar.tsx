'use client';

import { useEffect, useState } from 'react';
import { HoverCard, HoverCardTrigger, HoverCardContent } from '@radix-ui/react-hover-card';
import { FaCrown } from 'react-icons/fa';
import { Cs2Team } from '@prisma/client';
import { UserCard } from './UserCard';
import { ExtendedUser } from '@/lib/models/user-model';
import Image from 'next/image';
import Link from 'next/link';
import { RemoveMemberButton } from './RemoveMemberButton';

function MemberAvatarImage({ image, name }: { image: string | null; name: string | null }) {
	const [failed, setFailed] = useState(false);

	if (!image || failed) {
		return (
			<div className='w-full h-[200px] flex items-center justify-center bg-neutral-800 text-white font-bold text-2xl transition motion-safe:group-hover:z-10 motion-safe:group-hover:scale-[125%] cursor-default mb-[-10px]'>
				{(name || 'P').substring(0, 2).toUpperCase()}
			</div>
		);
	}

	return <Image className='transition motion-safe:group-hover:z-10 motion-safe:group-hover:scale-[125%] cursor-default mb-[-10px]' src={image} alt={`${name} avatar`} width={300} height={200} onError={() => setFailed(true)} />;
}

interface TeamMemberAvatarProps {
	team: Cs2Team;
	member: ExtendedUser;
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
	const crown = isCaptain && <FaCrown aria-hidden className='absolute top-0 left-1/2 transform -translate-x-1/2 -translate-y-1/2 text-white z-20' />;

	if (!interactive) {
		return (
			<div className='relative'>
				{crown}
				<MemberAvatarImage image={member.image} name={member.name} />
			</div>
		);
	}

	const avatar = (
		<div className='group relative'>
			{crown}
			<Link href={`/profile/${member.id}`} aria-label={`${member.name ?? 'Player'}${isCaptain ? ' (captain)' : ''}, view profile`} className='block focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring'>
				<MemberAvatarImage image={member.image} name={member.name} />
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

			<HoverCardContent className='w-fit p-4 rounded-lg bg-black min-w-64 max-w-96 z-40 cursor-default' side='top'>
				<UserCard member={member} />
			</HoverCardContent>
		</HoverCard>
	);
}
