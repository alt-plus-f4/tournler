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
	return (
		<div className='p-4'>
			<div className='grid grid-cols-1 md:grid-cols-5 gap-4'>
				<div className='col-span-3'>
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
								<p>{tournament.type}</p>
							</div>
						</div>
						<div className='flex items-center w-full sm:w-1/3 p-2'>
							<FaInfoCircle className='mr-4 h-8 w-8' />
							<div>
								<p className='text-xs text-foregroundgray uppercase'>
									Status
								</p>
								<p>{tournament.status}</p>
							</div>
						</div>
					</div>
					<div
						className='border mt-10 p-4 relative group cursor-pointer hover:border-primary/50'
						onClick={() => setActiveTab('bracket')}
					>
						<div className='flex items-center gap-4'>
							{/* Mini Bracket Visual */}
							<div className='relative w-24 h-16'>
								<svg
									viewBox='0 0 100 60'
									className='w-full h-full'
								>
									<path
										d='M 10 10 H 30 V 25 H 50 V 35 H 30 V 50 H 10'
										stroke='#4ade80'
										strokeWidth='2'
										fill='none'
										className='transition-all duration-300 group-hover:stroke-primary'
									/>
									<rect
										x='5'
										y='5'
										width='10'
										height='10'
										fill='#1a1a1a'
										stroke='#333'
									/>
									<rect
										x='5'
										y='45'
										width='10'
										height='10'
										fill='#1a1a1a'
										stroke='#333'
									/>
									<rect
										x='45'
										y='25'
										width='10'
										height='10'
										fill='#1a1a1a'
										stroke='#333'
									/>
								</svg>
							</div>

							<div className='flex flex-col'>
								<span className='text-lg font-bold mb-1'>
									Tournament Bracket
								</span>
								<span className='text-sm text-muted-foreground'>
									View full bracket and matches
								</span>
							</div>
							<div className='ml-auto transition-transform duration-300 group-hover:translate-x-2'>
								→
							</div>
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
