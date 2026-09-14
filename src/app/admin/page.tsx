'use client';

import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { Bar, BarChart, CartesianGrid, XAxis, YAxis, Pie, PieChart, Cell } from 'recharts';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart';
import { Skeleton } from '@/components/ui/skeleton';
import { FaUsers, FaUsersCog, FaTrophy } from 'react-icons/fa';

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

interface ActivityItem {
	type: 'user' | 'team' | 'tournament';
	id: string;
	name: string;
	href: string;
	createdAt: string;
}

interface DashboardData {
	totals: { users: number; teams: number; tournaments: number; ongoingTournaments: number };
	usersInTeam: number;
	usersNotInTeam: number;
	verifiedTeams: number;
	notFullTeams: number;
	ended: number;
	upcoming: number;
	recentActivity: ActivityItem[];
}

const ACTIVITY_ICON = { user: FaUsers, team: FaUsersCog, tournament: FaTrophy };

function timeAgo(isoDate: string): string {
	const seconds = Math.floor((Date.now() - new Date(isoDate).getTime()) / 1000);
	if (seconds < 60) return 'just now';
	const minutes = Math.floor(seconds / 60);
	if (minutes < 60) return `${minutes}m ago`;
	const hours = Math.floor(minutes / 60);
	if (hours < 24) return `${hours}h ago`;
	const days = Math.floor(hours / 24);
	if (days < 30) return `${days}d ago`;
	return new Date(isoDate).toLocaleDateString();
}

export default function AdminDashboard() {
	const router = useRouter();
	const [data, setData] = useState<DashboardData | null>(null);
	const [isLoading, setIsLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);

	useEffect(() => {
		async function fetchData() {
			setIsLoading(true);
			setError(null);
			try {
				const response = await fetch('/api/admin/dashboard');
				if (!response.ok) throw new Error('Failed to load dashboard data');
				const json: DashboardData = await response.json();
				setData(json);
			} catch (err) {
				console.error('Error fetching admin dashboard data:', err);
				setError(err instanceof Error ? err.message : 'Failed to load dashboard data');
			} finally {
				setIsLoading(false);
			}
		}
		fetchData();
	}, []);

	const handleChartClick = (path: string) => {
		router.push(path);
	};

	if (isLoading) {
		return (
			<div className='mt-12 mx-auto w-[80%] space-y-8'>
				<Skeleton className='h-10 w-64 mx-auto bg-neutral-900' />
				<div className='grid grid-cols-2 md:grid-cols-4 gap-4'>
					{Array.from({ length: 4 }).map((_, i) => (
						<Skeleton key={i} className='h-24 w-full bg-neutral-900' />
					))}
				</div>
				<Skeleton className='h-64 w-full bg-neutral-900' />
			</div>
		);
	}

	if (error || !data) {
		return (
			<div className='mt-12 mx-auto w-[80%] text-center py-24'>
				<p className='text-red-500 mb-2'>Couldn&apos;t load the dashboard.</p>
				<p className='text-muted-foreground text-sm'>{error}</p>
			</div>
		);
	}

	const userData = [
		{ name: 'Users in a Team', count: data.usersInTeam },
		{ name: 'Users not in a Team', count: data.usersNotInTeam },
	];
	const teamData = [
		{ name: 'Verified Teams', count: data.verifiedTeams },
		{ name: 'Not full Teams', count: data.notFullTeams },
	];
	const tournamentData = [
		{ status: 'Ended', count: data.ended },
		{ status: 'Upcoming', count: data.upcoming },
	];

	const kpis = [
		{ label: 'Total Users', value: data.totals.users, href: '/admin/users' },
		{ label: 'Total Teams', value: data.totals.teams, href: '/admin/teams' },
		{ label: 'Total Tournaments', value: data.totals.tournaments, href: '/admin/tournaments' },
		{ label: 'Ongoing Tournaments', value: data.totals.ongoingTournaments, href: '/admin/tournaments' },
	];

	return (
		<div className='mt-12 mx-auto w-[80%]'>
			<h1 className='text-3xl font-bold text-center mb-10 text-white p-4 rounded'>Admin Dashboard</h1>

			<div className='grid grid-cols-2 md:grid-cols-4 gap-4 mb-10'>
				{kpis.map((kpi) => (
					<Link key={kpi.label} href={kpi.href} className='rounded-lg border p-4 text-center hover:bg-hoverColor transition-colors'>
						<div className='text-3xl font-bold text-white'>{kpi.value}</div>
						<div className='text-sm text-muted-foreground'>{kpi.label}</div>
					</Link>
				))}
			</div>

			<div className='grid gap-8 sm:grid-cols-1 md:grid-cols-2 lg:grid-cols-3 overflow-y-scroll'>
				<Card onClick={() => handleChartClick('/admin/users')} className='cursor-pointer hover:bg-hoverColor text-white'>
					<CardHeader className='text-center'>
						<CardTitle>Users</CardTitle>
						<CardDescription>Users in Teams vs Not in Teams</CardDescription>
					</CardHeader>
					<CardContent>
						<ChartContainer config={chartConfig} className='mx-auto max-h-[250px]'>
							<BarChart data={userData} width={320} height={240}>
								<CartesianGrid strokeDasharray={chartConfig.desktop.strokeDasharray} stroke={chartConfig.desktop.strokeColor} />
								<XAxis dataKey='name' />
								<YAxis />
								<ChartTooltip cursor={false} content={<ChartTooltipContent />} />
								<Bar dataKey='count' fill={chartConfig.desktop.bar} />
							</BarChart>
						</ChartContainer>
					</CardContent>
					<CardFooter className='text-sm text-white justify-center'>Click to view detailed user page.</CardFooter>
				</Card>

				<Card onClick={() => handleChartClick('/admin/teams')} className='cursor-pointer hover:bg-hoverColor text-white'>
					<CardHeader className='text-center'>
						<CardTitle>Teams</CardTitle>
						<CardDescription>Verified Teams vs Not verified</CardDescription>
					</CardHeader>
					<CardContent>
						<ChartContainer config={chartConfig} className='mx-auto aspect-square max-h-[250px]'>
							<PieChart width={320} height={240}>
								<ChartTooltip cursor={false} content={<ChartTooltipContent />} />
								<Pie data={teamData} dataKey='count' nameKey='name' cx='50%' cy='50%' outerRadius={100} label strokeWidth={5}>
									{teamData.map((entry, index) => (
										<Cell key={`cell-${index}`} fill={chartConfig.desktop.pie[index]} />
									))}
								</Pie>
							</PieChart>
						</ChartContainer>
					</CardContent>
					<CardFooter className='text-sm text-white justify-center'>Click to view detailed team page.</CardFooter>
				</Card>

				<Card onClick={() => handleChartClick('/admin/tournaments')} className='cursor-pointer hover:bg-hoverColor text-white'>
					<CardHeader className='text-center'>
						<CardTitle>Tournaments</CardTitle>
						<CardDescription>Ended vs Upcoming Tournaments</CardDescription>
					</CardHeader>
					<CardContent>
						<ChartContainer config={chartConfig} className='mx-auto aspect-square max-h-[250px]'>
							<PieChart width={320} height={240}>
								<ChartTooltip cursor={false} content={<ChartTooltipContent />} />
								<Pie data={tournamentData} dataKey='count' nameKey='status' cx='50%' cy='50%' innerRadius={60} outerRadius={100} label>
									{tournamentData.map((entry, index) => (
										<Cell key={`cell-${index}`} fill={chartConfig.desktop.pie[index]} />
									))}
								</Pie>
							</PieChart>
						</ChartContainer>
					</CardContent>
					<CardFooter className='text-sm justify-center text-white'>Click to view detailed tournament page.</CardFooter>
				</Card>
			</div>

			<Card className='mt-10'>
				<CardHeader>
					<CardTitle>Recent Activity</CardTitle>
					<CardDescription>The 10 most recently created users, teams, and tournaments.</CardDescription>
				</CardHeader>
				<CardContent>
					{data.recentActivity.length === 0 ? (
						<p className='text-muted-foreground text-sm'>No activity yet.</p>
					) : (
						<ul className='divide-y divide-neutral-800'>
							{data.recentActivity.map((item) => {
								const Icon = ACTIVITY_ICON[item.type];
								return (
									<li key={`${item.type}-${item.id}`}>
										<Link href={item.href} className='flex items-center gap-3 py-3 hover:bg-hoverColor px-2 -mx-2 rounded transition-colors'>
											<Icon className='text-muted-foreground shrink-0' />
											<span className='flex-1 truncate'>{item.name}</span>
											<span className='text-xs text-muted-foreground uppercase'>{item.type}</span>
											<span className='text-xs text-muted-foreground shrink-0'>{timeAgo(item.createdAt)}</span>
										</Link>
									</li>
								);
							})}
						</ul>
					)}
				</CardContent>
			</Card>
		</div>
	);
}
