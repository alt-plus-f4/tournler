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
			<div className='w-full h-[200px] flex items-center justify-center bg-neutral-800 text-white font-bold text-2xl transition group-hover:z-10 group-hover:scale-[125%] cursor-default mb-[-10px]'>
				{(name || 'P').substring(0, 2).toUpperCase()}
			</div>
		);
	}

	return <Image className='transition group-hover:z-10 group-hover:scale-[125%] cursor-default mb-[-10px]' src={image} alt={`${name} avatar`} width={300} height={200} onError={() => setFailed(true)} />;
}

interface TeamMemberAvatarProps {
	team: Cs2Team;
	member: ExtendedUser;
	enableTeamCapitanControls?: boolean;
	capitanId: string;
	userId?: string;
}

export function TeamMemberAvatar({ team, member, enableTeamCapitanControls, capitanId, userId }: TeamMemberAvatarProps) {
	const [isMounted, setIsMounted] = useState(false);
	useEffect(() => setIsMounted(true), []);

	const avatar = (
		<div className='group relative'>
			{member.id == capitanId && <FaCrown className='absolute top-0 left-1/2 transform -translate-x-1/2 -translate-y-1/2 text-yellow-500 z-10' />}
			<Link href={`/profile/${member.id}`} onClick={(e) => e.stopPropagation()} className='block'>
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
