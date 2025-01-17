import { formatDate } from '@/lib/helpers/format-date';
import { formatPrize } from '@/lib/helpers/format-prize';
import Image from 'next/image';
import Link from 'next/link';

interface FeaturedTournamentProps {
	id: number;
	name: string;
	bannerUrl: string;
	startDate: string;
	prizePool: number;
	teams: [];
	location: string;
	teamCapacity: number;
}

export function FeaturedTournament({
	id,
	name,
	startDate,
	bannerUrl,
	prizePool,
	teams,
	location,
	teamCapacity,
}: FeaturedTournamentProps) {
	return (
		<Link
			href={`/tournaments/${id}`}
			className='relative flex flex-col items-center justify-center rounded-lg shadow-lg overflow-hidden transform transition-transform duration-200 hover:'
		>
			<div className='relative w-full h-64 group'>
				<Image
					src={bannerUrl}
					alt={name}
					fill
					sizes='78vw'
                    priority
					className='object-cover w-full h-64'
				/>
				<div className='absolute inset-2 flex items-end justify-center'>
					<h1 className='text-white text-xl sm:text-3xl p-4 font-extrabold'>
						{name}
					</h1>
				</div>
				<div className='absolute bottom-0 left-0 w-full h-[35px] bg-gradient-to-t from-black to-transparent'></div>
				<div className='absolute inset-0 bg-black opacity-0 group-hover:opacity-20 transition-opacity duration-200'></div>
			</div>
			<div className='w-full bg-black border-t-0 border p-2 text-center'>
				<div className='grid grid-cols-4 gap-4 items-center text-center'>
					<div className='flex flex-col border-r transform transition-transform duration-200 hover:scale-105 text-xs md:text-base'>
						<span className='font-bold'>{formatDate(startDate)}</span>
						<span className='text-slate-300 font-thin'>Date</span>
					</div>
					<div className='flex flex-col border-r transform transition-transform duration-200 hover:scale-105 text-xs md:text-base'>
						<span className='font-bold'>
							{formatPrize(prizePool)}
						</span>
						<span className='text-slate-300'>Prize Pool</span>
					</div>
					<div className='flex flex-col border-r transform transition-transform duration-200 hover:scale-105 text-xs md:text-base'>
						<span className='font-bold'>{location}</span>
						<span className='text-slate-300'>Location</span>
					</div>
					<div className='flex flex-col transform transition-transform duration-200 hover:scale-105 text-xs md:text-base'>
						<span className='font-bold'>
							{teams.length}/{teamCapacity}
						</span>
						<span className='text-slate-300'>Teams</span>
					</div>
				</div>
			</div>
		</Link>
	);
}
