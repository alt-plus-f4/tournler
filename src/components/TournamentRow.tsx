import { formatDate } from '@/lib/helpers/format-date';
import { formatPrize } from '@/lib/helpers/format-prize';
import { ReducedTournament } from '@/types/types';
import Image from 'next/image';
import Link from 'next/link';

export function TournamentRow({
	id,
	name,
	startDate,
	logoUrl,
	prizePool,
	teams,
	location,
	teamCapacity,
}: ReducedTournament) {
	return (
		<Link href={`/tournaments/${id}`}>
			<div className='relative flex items-center justify-between rounded-lg border shadow-lg overflow-hidden transition-colors w-full h-20 p-2 cursor-pointer mx-2 hover:bg-hoverColor'>
				<div className='flex items-center'>
					<div className='relative w-12 h-12'>
						<Image
							src={logoUrl}
							alt={name}
							fill
							sizes='100vw'
							className='object-cover w-full h-full'
						/>
					</div>
					<div className='flex flex-col items-start ml-4'>
						<h1 className='text-white text-lg font-extrabold'>
							{name}
						</h1>
						<div className='text-white text-sm'>{location}</div>
					</div>
				</div>
				<div className='flex justify-between items-center space-x-36 mr-6'>
					<div className='flex flex-col items-center'>
						<span className='font-bold text-sm'>
							{formatDate(startDate)}
						</span>
						<span className='text-slate-300 font-thin text-xs'>
							Date
						</span>
					</div>
					<div className='flex flex-col items-center'>
						<span className='font-bold text-sm'>
							{formatPrize(prizePool)}
						</span>
						<span className='text-slate-300 text-xs'>
							Prize Pool
						</span>
					</div>
					<div className='flex flex-col items-center'>
						<span className='font-bold text-sm'>
							{teams.length}/{teamCapacity}
						</span>
						<span className='text-slate-300 text-xs'>Teams</span>
					</div>
				</div>
			</div>
		</Link>
	);
}
