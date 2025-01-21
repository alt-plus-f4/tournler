import { SiCounterstrike } from 'react-icons/si';
import Link from 'next/link';
import { Card, CardContent, CardHeader } from './ui/card';
import { BadgeCheck, X } from 'lucide-react';
import { ExtendedCs2Team } from '@/lib/models/team-model';
import { TeamBanner } from './TeamBanner';

export function TeamCard({ team }: { team: ExtendedCs2Team }) {
	const isVerified = team.members.length === 5;
	return (
		<>
			<Link href={`/teams/${team.id}`}>
				<Card className='h-[200px] w-full transition transform hover:scale-105 hover:shadow-2xl cursor-pointer bg-gradient-to-r from-black-500 to-indigo-600 text-white'>
					<CardHeader className='h-[75%] relative p-0 w-full aspect-[21/9] space-y-0 overflow-hidden rounded-t-xl flex items-center justify-center bg-opacity-75'>
						{isVerified ? (
							<span className='z-10 absolute top-2 left-2 bg-white text-black text-xs px-2 py-1 rounded-full flex items-center'>
								<BadgeCheck className='w-4 h-4 mr-1' />
								Verified
							</span>
						) : (
							<span className='z-10 absolute top-2 left-2 bg-red-500 text-white text-xs px-2 py-1 rounded-full flex items-center'>
								<X className='w-4 h-4 mr-1' />
								Not full
							</span>
						)}
						<TeamBanner capitanId={''} team={team} />
					</CardHeader>
					<CardContent className='mt-1 py-0 px-4 text-center'>
						<div className='flex justify-between pt-2'>
							<div className='flex items-center'>
								<SiCounterstrike className='w-6 h-6 mr-2' />
								<h3 className='text-lg font-bold text-ellipsis overflow-hidden'>
									{team.name}
								</h3>
							</div>
							<div className='flex justify-center items-center'>
								<p className='text-sm font-medium text-white'>
									{team.members.length} / 5
								</p>
							</div>

						</div>
					</CardContent>
				</Card>
			</Link>
		</>
	);
}
