'use client';

import useSWR from 'swr';
import Link from 'next/link';
import { PlayerAvatar } from '@/components/PlayerAvatar';

interface LeaderboardRow {
	userId: string;
	name: string | null;
	image: string | null;
	correct: number;
	total: number;
	points: number;
}

const fetcher = async (url: string) => {
	const res = await fetch(url);
	if (!res.ok) throw new Error(`Request failed: ${res.status}`);
	return res.json();
};

/** Top predictors of a tournament. `slug` is the tournament id (or name). */
export default function PredictionsLeaderboard({ slug }: { slug: string | number }) {
	const { data, error, isLoading } = useSWR(`/api/tournaments/${encodeURIComponent(String(slug))}/predictions`, fetcher, { refreshInterval: 15000 });
	const rows: LeaderboardRow[] = data?.leaderboard ?? [];

	if (isLoading) return <p className='py-8 text-center text-muted-foreground'>Loading predictions…</p>;
	if (error) return <p className='py-8 text-center text-muted-foreground'>Predictions failed to load.</p>;
	if (data && data.enabled === false && rows.length === 0) return <p className='p-8 text-center text-muted-foreground'>Predictions are turned off for this tournament.</p>;
	if (rows.length === 0) return <p className='p-8 text-center text-muted-foreground'>No scored predictions yet. Points appear once predicted matches finish.</p>;

	return (
		<div className='overflow-x-auto p-4 sm:p-6'>
			<table className='w-full border-collapse text-left text-sm'>
				<caption className='sr-only'>Prediction leaderboard for this tournament</caption>
				<thead>
					<tr className='border-b border-border text-xs uppercase tracking-wide text-muted-foreground'>
						<th scope='col' className='px-3 py-2'>
							#
						</th>
						<th scope='col' className='px-3 py-2'>
							Player
						</th>
						<th scope='col' className='px-3 py-2 text-right'>
							Correct
						</th>
						<th scope='col' className='px-3 py-2 text-right'>
							Points
						</th>
					</tr>
				</thead>
				<tbody>
					{rows.map((r, i) => (
						<tr key={r.userId} className='group/player border-b border-border transition-colors duration-150 hover:bg-white/5 has-[a:focus-visible]:bg-white/5'>
							<td className='px-3 py-2 font-mono tabular-nums text-muted-foreground'>{i + 1}</td>
							<td className='px-3 py-2 font-medium text-white'>
								<Link
									href={`/profile/${r.userId}`}
									className='-mx-1 flex min-w-0 cursor-pointer items-center gap-2 rounded-sm px-1 py-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring'
								>
									<PlayerAvatar src={r.image} name={r.name} size={24} />
									<span className='truncate underline-offset-4 group-hover/player:underline group-has-[a:focus-visible]/player:underline'>{r.name ?? 'Unknown Player'}</span>
								</Link>
							</td>
							<td className='px-3 py-2 text-right font-mono tabular-nums text-neutral-300'>
								{r.correct}/{r.total}
							</td>
							<td className='px-3 py-2 text-right font-mono font-bold tabular-nums text-white'>{r.points}</td>
						</tr>
					))}
				</tbody>
			</table>
		</div>
	);
}
