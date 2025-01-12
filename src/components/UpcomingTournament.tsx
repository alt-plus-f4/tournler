import { formatDate } from '@/lib/helpers/format-date';
import { formatPrize } from '@/lib/helpers/format-prize';
import Image from 'next/image';
import Link from 'next/link';

interface UpcomingTournamentProps {
	id: number;
	name: string;
	bannerUrl: string;
	startDate: string;
	prizePool: number;
	teams: [];
	location: string;
	teamCapacity: number;
}

export function UpcomingTournament({
	id,
	name,
	startDate,
	bannerUrl,
	prizePool,
	teams,
	location,
	teamCapacity,
}: UpcomingTournamentProps) {
	return (
		<Link
			href={`/tournament/${id}`}
			className='relative flex flex-col items-center justify-center rounded-sm shadow-lg overflow-hidden transform transition-transform duration-200 hover:scale-105 h-[156px] mt-4 sm:mt-2 sm:w-[30%] w-[80%]'
		>
			<div className='relative w-full h-20'>
				<Image
					src={bannerUrl}
					alt={name}
					layout='fill'
					className='object-cover w-full h-20'
				/>
				<div className='absolute bottom-0 left-0 w-full h-[20px] bg-gradient-to-t from-black to-transparent'></div>
			</div>
			<div className='w-full bg-black hover:brightness-75 transition-all border-t-0 border text-center'>
				<h1 className='text-white text-md ml-2 mt-2 font-extrabold'>
					{name}
				</h1>
				<div className='text-slate-300 text-xs ml-2 mb-2'>{location}</div>
				<div className='grid grid-cols-3 gap-1 items-center text-center border-t-2 py-1'>
					<div className='flex flex-col mt-2'>
						<span className='font-bold text-sm'>
							{formatDate(startDate)}
						</span>
						<span className='text-slate-300 font-thin text-xs'>
							Date
						</span>
					</div>
					<div className='flex flex-col'>
						<span className='font-bold text-sm'>
							{formatPrize(prizePool)}
						</span>
						<span className='text-slate-300 text-xs'>
							Prize Pool
						</span>
					</div>
					<div className='flex flex-col'>
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
