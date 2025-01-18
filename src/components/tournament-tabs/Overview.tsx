import {
	FaCalendarAlt,
	FaMapMarkerAlt,
	FaGamepad,
	FaInfoCircle,
} from 'react-icons/fa';
import { Button } from '../ui/button';
import { formatDate } from '@/lib/helpers/format-date';

const Overview: React.FC<{
	tournament: any;
	setActiveTab: (tab: string) => void;
}> = ({ tournament, setActiveTab }) => {
	const tournamentType = (type: number) => {
		switch (type) {
			case 0:
				return 'Single Elimination';
			case 1:
				return 'Swizz Stage';
			case 2:
				return 'Group Robin';
			default:
				return 'Other';
		}
	};

	const tournamentStatus = (status: number) => {
		switch (status) {
			case 0:
				return 'Upcoming';
			case 1:
				return 'Finished';
			case 2:
				return 'Ongoing';
			default:
				return 'Other';
		}
	};

	return (
		<div className='p-4'>
			<div className='grid grid-cols-1 md:grid-cols-5 gap-4'>
				<div className='col-span-3 space-y-4'>
					<h1 className='text-2xl font-bold mt-6 mb-2 ml-1'>
						Details
					</h1>
					<div className='flex flex-wrap space-y-4'>
						<div className='flex items-center w-full sm:w-1/3 p-2'>
							<FaCalendarAlt className='mr-4 h-8 w-8' />
							<div>
								<p className='text-xs text-foregroundgray uppercase'>
									Date
								</p>
								<p>{formatDate(tournament.startDate)}</p>
							</div>
						</div>
						<div className='flex items-center w-full sm:w-1/3 p-2'>
							<FaMapMarkerAlt className='mr-4 h-8 w-8' />
							<div>
								<p className='text-xs text-foregroundgray uppercase'>
									Location
								</p>
								<p>{tournament.location}</p>
							</div>
						</div>
						<div className='flex items-center w-full sm:w-1/3 p-2'>
							<FaGamepad className='mr-4 h-8 w-8' />
							<div>
								<p className='text-xs text-foregroundgray uppercase'>
									Game
								</p>
								<p>CS2</p>
							</div>
						</div>
						<div className='flex items-center w-full sm:w-1/3 p-2'>
							<FaInfoCircle className='mr-4 h-8 w-8' />
							<div>
								<p className='text-xs text-foregroundgray uppercase'>
									Type
								</p>
								<p>{tournamentType(tournament.type)}</p>
							</div>
						</div>
						<div className='flex items-center w-full sm:w-1/3 p-2'>
							<FaInfoCircle className='mr-4 h-8 w-8' />
							<div>
								<p className='text-xs text-foregroundgray uppercase'>
									Status
								</p>
								<p>{tournamentStatus(tournament.status)}</p>
							</div>
						</div>
					</div>
					<div className='space-y-4'>
						<h1 className='text-2xl font-bold mb-2 ml-1'>
							Brackets
						</h1>
						<div className='border p-4 flex items-center'>
							<Button
								variant='ghost'
								className='px-6 uppercase'
								onClick={() => setActiveTab('bracket')}
							>
								View Brackets
							</Button>
						</div>
					</div>
				</div>
				<div className='col-span-2'>
					<div className='flex justify-between items-center mt-6 ml-1'>
						<h1 className='text-2xl font-bold'>Participants</h1>
						<Button
							variant='ghost'
							className='px-6 uppercase'
							onClick={() => setActiveTab('participants')}
						>
							View all
						</Button>
					</div>
					<div className='border p-3 mt-2 flex items-center'>
						<div className='relative w-12 h-12 mr-4'>
							<svg
								className='absolute inset-0'
								viewBox='0 0 36 36'
							>
								<path
									className='text-white opacity-25'
									d='M18 2.0845
                                        a 15.9155 15.9155 0 0 1 0 31.831
                                        a 15.9155 15.9155 0 0 1 0 -31.831'
									fill='none'
									stroke='currentColor'
									strokeWidth='1'
								/>
								<path
									className='text-white'
									d='M18 2.0845
                                        a 15.9155 15.9155 0 0 1 0 31.831'
									fill='none'
									stroke='currentColor'
									strokeWidth='1'
									strokeDasharray={`${(tournament.teams.length / tournament.teamCapacity) * 100}, 100`}
								/>
							</svg>
							<FaGamepad className='absolute inset-0 m-auto h-6 w-6 text-white' />
						</div>
						<p className='text-sm font-bold'>
							{tournament.teams.length} /
							<span className='font-normal text-foregroundgray'>
								{' '}
								{tournament.teamCapacity}
							</span>
						</p>
					</div>

					<div>
						<div className='flex justify-between items-center mt-6 ml-1'>
							<h1 className='text-2xl font-bold mb-2 ml-1'>
								Prize Pool
							</h1>
							<Button
								variant='ghost'
								className='px-6 uppercase'
								onClick={() => setActiveTab('prizes')}
							>
								View all
							</Button>
						</div>
						<div className='border p-4 mt-2'>
							<div className='flex justify-between mb-2 border-b p-2 mt-2'>
								<p>1st</p>
								<p className='text-sm'>
									$ {(tournament.prizePool * 0.5).toFixed(2)}
								</p>
							</div>
							<div className='flex justify-between mb-2 border-b p-2'>
								<p>2nd</p>
								<p className='text-sm'>
									$ {(tournament.prizePool * 0.3).toFixed(2)}
								</p>
							</div>
							<div className='flex justify-between p-2'>
								<p>3rd</p>
								<p className='text-sm'>
									$ {(tournament.prizePool * 0.2).toFixed(2)}
								</p>
							</div>
						</div>
					</div>
				</div>
			</div>
		</div>
	);
};

export default Overview;
