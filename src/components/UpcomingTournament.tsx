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
	teams: any[];
	location: string;
	teamCapacity: number;
	isHomePage?: boolean;
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
	isHomePage,
}: UpcomingTournamentProps) {
	return (
		<Link
			href={`/tournaments/${id}`}
			className={`relative flex flex-col items-center justify-center rounded-md shadow-lg overflow-hidden transform transition-transform duration-200 hover:scale-105 mt-4 sm:mt-2 ${isHomePage ? 'w-full h-[200px]' : 'h-[156px] sm:w-[30%] w-[80%]'}`}
		>
			<div className='relative w-full h-20'>
				<Image
					src={bannerUrl}
					alt={name}
					fill
					sizes='25vw'
					className='object-cover w-full h-20'
					placeholder='blur' // or "empty"
					blurDataURL='data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII='
				/>
				<div className='absolute bottom-0 left-0 w-full h-[20px] bg-gradient-to-t from-black to-transparent'></div>
			</div>
			<div className='w-full bg-black hover:brightness-75 transition-all border-t-0 border text-center'>
				<h1 className='text-white text-md ml-2 mt-2 font-extrabold'>
					{name}
				</h1>
				<div className='text-slate-300 text-xs ml-2 mb-2'>
					{location}
				</div>
				<div className='grid grid-cols-3 gap-1 items-center text-center border-t-2 py-1'>
					<div className='flex flex-col'>
						<span className='font-bold text-xs lg:text-sm'>
							{formatDate(startDate)}
						</span>
						<span className='text-slate-300 font-thin text-xs lg:text-sm'>
							Date
						</span>
					</div>
					<div className='flex flex-col'>
						<span className='font-bold text-xs lg:text-sm'>
							{formatPrize(prizePool)}
						</span>
						<span className='text-slate-300 text-xs lg:text-sm'>
							Prize Pool
						</span>
					</div>
					{teams && (
						<div className='flex flex-col'>
							<span className='font-bold text-xs lg:text-sm'>
								{teams.length}/{teamCapacity}
							</span>
							<span className='text-slate-300 text-xs lg:text-sm'>
								Teams
							</span>
						</div>
					)}
				</div>
			</div>
		</Link>
	);
}
