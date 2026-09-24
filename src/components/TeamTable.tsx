import { TeamLogo } from '@/components/TeamLogo';
import Link from 'next/link';
import type { Cs2Team } from '@/types/types';
import { adminTable as t, formatAdminDate } from '@/components/admin/table-styles';
import { cn } from '@/lib/utils';
import type { Game } from '@prisma/client';
import { GameTag } from '@/components/games/GameMark';

/** The admin list reads `game` from GET /api/teams; the shared client type predates it. */
type AdminTeam = Cs2Team & { game?: Game };

interface TeamTableProps {
	teams: AdminTeam[];
	onEdit: (team: Cs2Team) => void;
	isLoading?: boolean;
	emptyMessage?: string;
}

const HEADERS = ['Team', 'Game', 'Captain', 'Members', 'Created'];

export function TeamTable({ isLoading, teams, onEdit, emptyMessage = 'No teams found.' }: TeamTableProps) {
	return (
		<div className={t.wrapper}>
			<table className={t.table}>
				<thead className={t.thead}>
					<tr>
						{HEADERS.map((h) => (
							<th key={h} scope='col' className={cn(t.th, h === 'Members' && 'text-right')}>
								{h}
							</th>
						))}
						<th scope='col' className={t.th}>
							<span className='sr-only'>Actions</span>
						</th>
					</tr>
				</thead>
				{isLoading ? (
					<TeamTableSkeleton />
				) : !teams || teams.length === 0 ? (
					<tbody>
						<tr>
							<td colSpan={HEADERS.length + 1} className={t.empty}>
								{emptyMessage}
							</td>
						</tr>
					</tbody>
				) : (
					<tbody className={t.tbody}>
						{teams.map((team) => {
							const captain = team.members?.find((m) => m.id === team.capitanId);
							return (
								<tr key={team.id} className={t.tr}>
									<td className={t.td}>
										<div className='flex items-center gap-3'>
											<TeamLogo src={team.logo} name={team.name} decorative size='sm' />
											<button type='button' onClick={() => onEdit(team)} className={t.rowAction} aria-label={`Edit ${team.name}`}>
												{team.name}
											</button>
										</div>
									</td>
									<td className={t.td}>{team.game ? <GameTag game={team.game} /> : <span className='text-muted-foreground'>—</span>}</td>
									<td className={cn(t.td, 'text-neutral-300')}>{captain?.name || <span className='text-muted-foreground'>—</span>}</td>
									<td className={cn(t.td, t.num, 'text-right')}>{team.members?.length || 0}</td>
									<td className={cn(t.td, t.num, 'whitespace-nowrap text-neutral-300')}>{formatAdminDate(team.createdAt)}</td>
									<td className={cn(t.td, 'whitespace-nowrap text-right')}>
										<Link href={`/teams/${team.id}`} className='rounded-sm text-muted-foreground underline-offset-4 hover:text-foreground hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring'>
											View<span className='sr-only'> {team.name} team page</span>
										</Link>
									</td>
								</tr>
							);
						})}
					</tbody>
				)}
			</table>
		</div>
	);
}

export function TeamTableSkeleton() {
	return (
		<tbody aria-hidden>
			{Array.from({ length: 5 }).map((_, i) => (
				<tr key={i} className='border-b border-border last:border-0'>
					{Array.from({ length: HEADERS.length + 1 }).map((_, j) => (
						<td key={j} className={t.td}>
							<div className='h-4 rounded-sm bg-muted' />
						</td>
					))}
				</tr>
			))}
		</tbody>
	);
}
