'use client';

import useSWR from 'swr';
import Image from 'next/image';
import Link from 'next/link';
import { Cs2Tournament } from '@/types/types';

interface PlayerStatRow {
	userId: string;
	name: string | null;
	image: string | null;
	teamId: number | null;
	teamName: string | null;
	kills: number;
	deaths: number;
	assists: number;
	matchesPlayed: number;
	kd: number;
}

const fetcher = (url: string) => fetch(url).then((res) => res.json());

interface PlayerStatsProps {
	tournament: Cs2Tournament;
}

export default function PlayerStats({ tournament }: PlayerStatsProps) {
	const { data, isLoading } = useSWR(`/api/tournaments/${tournament.id}/player-stats`, fetcher, { refreshInterval: 5000 });
	const stats: PlayerStatRow[] = data?.stats ?? [];

	if (isLoading) {
		return <p className='text-neutral-500 text-center py-8'>Loading player stats...</p>;
	}

	if (stats.length === 0) {
		return <div className='p-8 text-center text-neutral-500'>No player stats reported yet.</div>;
	}

	return (
		<div className='p-6 overflow-x-auto'>
			<table className='w-full text-sm text-left border-collapse'>
				<thead>
					<tr className='text-neutral-500 uppercase text-xs tracking-wide border-b border-neutral-800'>
						<th className='py-2 px-3'>#</th>
						<th className='py-2 px-3'>Player</th>
						<th className='py-2 px-3'>Team</th>
						<th className='py-2 px-3'>Kills</th>
						<th className='py-2 px-3'>Deaths</th>
						<th className='py-2 px-3'>Assists</th>
						<th className='py-2 px-3'>K/D</th>
					</tr>
				</thead>
				<tbody>
					{stats.map((s, i) => (
						<tr key={s.userId} className='border-b border-neutral-900'>
							<td className='py-2 px-3 text-neutral-500'>{i + 1}</td>
							<td className='py-2 px-3 text-white font-medium'>
								<Link href={`/profile/${s.userId}`} className='flex items-center gap-2 hover:underline'>
									{s.image && <Image src={s.image} alt={s.name ?? 'Player'} width={24} height={24} className='rounded-full' />}
									{s.name ?? 'Unknown Player'}
								</Link>
							</td>
							<td className='py-2 px-3 text-neutral-400'>{s.teamName ?? '-'}</td>
							<td className='py-2 px-3 text-neutral-300'>{s.kills}</td>
							<td className='py-2 px-3 text-neutral-300'>{s.deaths}</td>
							<td className='py-2 px-3 text-neutral-300'>{s.assists}</td>
							<td className='py-2 px-3 text-white font-bold'>{s.kd.toFixed(2)}</td>
						</tr>
					))}
				</tbody>
			</table>
		</div>
	);
}
