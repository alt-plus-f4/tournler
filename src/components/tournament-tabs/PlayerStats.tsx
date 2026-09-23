'use client';
/* eslint-disable @next/next/no-img-element */

import useSWR from 'swr';
import Image from 'next/image';
import Link from 'next/link';
import type { TournamentDetail } from './types';
import { isOptimizable } from './TeamLogo';

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

const fetcher = async (url: string) => {
	const res = await fetch(url);
	if (!res.ok) throw new Error(`Request failed: ${res.status}`);
	return res.json();
};

interface PlayerStatsProps {
	tournament: TournamentDetail;
}

export default function PlayerStats({ tournament }: PlayerStatsProps) {
	const { data, error, isLoading } = useSWR(`/api/tournaments/${tournament.id}/player-stats`, fetcher, { refreshInterval: 5000 });
	const stats: PlayerStatRow[] = data?.stats ?? [];

	if (isLoading) {
		return <p className='py-8 text-center text-muted-foreground'>Loading player stats…</p>;
	}

	if (error) {
		return <p className='py-8 text-center text-muted-foreground'>Player stats failed to load.</p>;
	}

	if (stats.length === 0) {
		return <p className='p-8 text-center text-muted-foreground'>No player stats yet. They appear once the game server reports a finished map.</p>;
	}

	return (
		<div className='overflow-x-auto p-4 sm:p-6'>
			<table className='w-full border-collapse text-left text-sm'>
				<caption className='sr-only'>Player stats for this tournament</caption>
				<thead>
					<tr className='border-b border-border text-xs uppercase tracking-wide text-muted-foreground'>
						<th scope='col' className='py-2 px-3'>#</th>
						<th scope='col' className='py-2 px-3'>Player</th>
						<th scope='col' className='py-2 px-3'>Team</th>
						<th scope='col' className='py-2 px-3 text-right'>Kills</th>
						<th scope='col' className='py-2 px-3 text-right'>Deaths</th>
						<th scope='col' className='py-2 px-3 text-right'>Assists</th>
						<th scope='col' className='py-2 px-3 text-right'>K/D</th>
					</tr>
				</thead>
				<tbody>
					{stats.map((s, i) => (
						<tr key={s.userId} className='border-b border-border'>
							<td className='py-2 px-3 font-mono tabular-nums text-muted-foreground'>{i + 1}</td>
							<td className='py-2 px-3 text-white font-medium'>
								<Link href={`/profile/${s.userId}`} className='flex items-center gap-2 hover:underline'>
									{s.image &&
										(isOptimizable(s.image) ? (
											<Image src={s.image} alt='' width={24} height={24} className='rounded-full' />
										) : (
											<img src={s.image} alt='' width={24} height={24} loading='lazy' decoding='async' className='h-6 w-6 rounded-full' />
										))}
									{s.name ?? 'Unknown Player'}
								</Link>
							</td>
							<td className='py-2 px-3 text-muted-foreground'>{s.teamName ?? '–'}</td>
							<td className='py-2 px-3 text-right font-mono tabular-nums text-neutral-300'>{s.kills}</td>
							<td className='py-2 px-3 text-right font-mono tabular-nums text-neutral-300'>{s.deaths}</td>
							<td className='py-2 px-3 text-right font-mono tabular-nums text-neutral-300'>{s.assists}</td>
							<td className='py-2 px-3 text-right font-mono font-bold tabular-nums text-white'>{s.kd.toFixed(2)}</td>
						</tr>
					))}
				</tbody>
			</table>
		</div>
	);
}
