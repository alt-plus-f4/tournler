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
						<div className='relative w-12 h-8 mr-4'>
							<div
								className='absolute inset-0 rounded-full border-4 border-white'
								style={{
									borderColor: `rgba(0, 123, 255, ${tournament.teams.length / tournament.teamCapacity})`,
								}}
							></div>
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
						<div className='border p-4 mt-2 flex items-center'>
							<div className='relative w-12 h-8 mr-4'>
								<div
									className='absolute inset-0 rounded-full border-4 border-white'
									style={{
										borderColor: `rgba(0, 123, 255, ${tournament.teams.length / tournament.teamCapacity})`,
									}}
								></div>
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
					</div>
				</div>
			</div>
		</div>
	);
};

export default Overview;
