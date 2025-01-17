'use client';

import { useRouter } from 'next/navigation';
// import { useEffect, useState } from 'react';
import {
	Bar,
	BarChart,
	CartesianGrid,
	XAxis,
	YAxis,
	Pie,
	PieChart,
	Cell,
} from 'recharts';
import {
	Card,
	CardContent,
	CardDescription,
	CardFooter,
	CardHeader,
	CardTitle,
} from '@/components/ui/card';
import {
	ChartContainer,
	ChartTooltip,
	ChartTooltipContent,
} from '@/components/ui/chart';

const chartConfig = {
	desktop: {
		label: 'Desktop',
		bar: '#ffffff',
		pie: ['#ef4444', '#fbd5da'],
		strokeDasharray: '3 3',
		strokeColor: '#ffffff',
	},
	mobile: {
		label: 'Mobile',
		color: '#ffffff',
	},
};

const userData = [
	{ name: 'Users in a Team', count: 1200 },
	{ name: 'Users not in a Team', count: 300 },
];

const teamData = [
	{ name: 'Verified Teams', count: 300 },
	{ name: 'Not full Teams', count: 150 },
];

const tournamentData = [
	{ status: 'Ended', count: 90 },
	{ status: 'Upcoming', count: 60 },
];

export default function AdminDashboard() {
	const router = useRouter();

	// const [userData, setUserData] = useState([{}]);
	// const [teamData, setTeamData] = useState([{}]);
	// const [tournamentData, setTournamentData] = useState([{}]);

	// useEffect(() => {
	// 	const fetchData = async () => {
	// 		try {
	// 			const usersResponse = await fetch('/api/admin/users');
	// 			const { usersInTeam, usersNotInTeam } =
	// 				await usersResponse.json();
	// 			setUserData([
	// 				{ name: 'Users in a Team', count: usersInTeam },
	// 				{ name: 'Users not in a Team', count: usersNotInTeam },
	// 			]);

	// 			const teamsResponse = await fetch('/api/admin/teams');
	// 			const { verifiedTeams, notFullTeams } =
	// 				await teamsResponse.json();
	// 			setTeamData([
	// 				{ name: 'Verified Teams', count: verifiedTeams },
	// 				{ name: 'Not full Teams', count: notFullTeams },
	// 			]);

	// 			const tournamentsResponse = await fetch(
	// 				'/api/admin/tournaments'
	// 			);
	// 			const { ended, upcoming } = await tournamentsResponse.json();
	// 			setTournamentData([
	// 				{ status: 'Ended', count: ended },
	// 				{ status: 'Upcoming', count: upcoming },
	// 			]);
	// 		} catch (error) {
	// 			console.error('Error fetching data:', error);
	// 		}
	// 	};

	// 	fetchData();
	// }, []);

	const handleChartClick = (path: string) => {
		router.push(path);
	};

	return (
		<div className='mt-12 mx-auto w-[80%]'>
			<h1 className='text-3xl font-bold text-center mb-10 text-white p-4 rounded'>
				Admin Dashboard
			</h1>

			<div className='grid gap-8 sm:grid-cols-1 md:grid-cols-2 lg:grid-cols-3 overflow-y-scroll'>
				<Card
					onClick={() => handleChartClick('/admin/users')}
					className='cursor-pointer hover:bg-hoverColor text-white'
				>
					<CardHeader className='text-center'>
						<CardTitle>Users</CardTitle>
						<CardDescription>
							Users in Teams vs Not in Teams
						</CardDescription>
					</CardHeader>
					<CardContent>
						<ChartContainer
							config={chartConfig}
							className='mx-auto max-h-[250px]'
						>
							<BarChart data={userData} width={320} height={240}>
								<CartesianGrid
									strokeDasharray={chartConfig.desktop.strokeDasharray}
									stroke={chartConfig.desktop.strokeColor}
								/>
								<XAxis dataKey='name' />
								<YAxis />
								<ChartTooltip
									cursor={false}
									content={<ChartTooltipContent />}
								/>
								<Bar
									dataKey='count'
									fill={chartConfig.desktop.bar}
								/>
							</BarChart>
						</ChartContainer>
					</CardContent>
					<CardFooter className='text-sm text-white justify-center'>
						Click to view detailed user page.
					</CardFooter>
				</Card>

				<Card
					onClick={() => handleChartClick('/admin/teams')}
					className='cursor-pointer hover:bg-hoverColor text-white'
				>
					<CardHeader className='text-center'>
						<CardTitle>Teams</CardTitle>
						<CardDescription>
							Verified Teams vs Not verified
						</CardDescription>
					</CardHeader>
					<CardContent>
						<ChartContainer
							config={chartConfig}
							className='mx-auto aspect-square max-h-[250px]'
						>
							<PieChart width={320} height={240}>
								<ChartTooltip
									cursor={false}
									content={<ChartTooltipContent />}
								/>
								<Pie
									data={teamData}
									dataKey='count'
									nameKey='name'
									cx='50%'
									cy='50%'
									outerRadius={100}
									label
									strokeWidth={5}
								>
									{teamData.map((entry, index) => (
										<Cell
											key={`cell-${index}`}
											fill={chartConfig.desktop.pie[index]}
										/>
									))}
								</Pie>
							</PieChart>
						</ChartContainer>
					</CardContent>
					<CardFooter className='text-sm text-white justify-center'>
						Click to view detailed team page.
					</CardFooter>
				</Card>

				<Card
					onClick={() => handleChartClick('/admin/tournaments')}
					className='cursor-pointer hover:bg-hoverColor text-white'
				>
					<CardHeader className='text-center'>
						<CardTitle>Tournaments</CardTitle>
						<CardDescription>
							Ended vs Upcoming Tournaments
						</CardDescription>
					</CardHeader>
					<CardContent>
						<ChartContainer
							config={chartConfig}
							className='mx-auto aspect-square max-h-[250px]'
						>
							<PieChart width={320} height={240}>
								<ChartTooltip
									cursor={false}
									content={<ChartTooltipContent />}
								/>
								<Pie
									data={tournamentData}
									dataKey='count'
									nameKey='status'
									cx='50%'
									cy='50%'
									innerRadius={60}
									outerRadius={100}
									label
								>
									{tournamentData.map((entry, index) => (
										<Cell
											key={`cell-${index}`}
											fill={chartConfig.desktop.pie[index]}
										/>
									))}
								</Pie>
							</PieChart>
						</ChartContainer>
					</CardContent>
					<CardFooter className='text-sm justify-center text-white'>
						Click to view detailed tournament page.
					</CardFooter>
				</Card>
			</div>
		</div>
	);
}
