import { User } from '@/types/types';
import { BadgeCheck } from 'lucide-react';
import { adminTable as t, formatAdminDate } from '@/components/admin/table-styles';
import { cn } from '@/lib/utils';

const HEADERS = ['Name', 'Email', 'Role', 'Team', 'Onboarded', 'Verified', 'Joined'];

export default function UserTable({
	users,
	onEdit,
	onToggleVerify,
	verifyingUserIds,
	isLoading,
	emptyMessage = 'No users found.',
}: {
	users: User[];
	currentPage?: number;
	totalPages?: number;
	onPageChange?: (page: number) => void;
	onEdit: (user: User) => void;
	onToggleVerify: (user: User, verified: boolean) => void;
	verifyingUserIds: Set<string>;
	isLoading: boolean;
	emptyMessage?: string;
}) {
	return (
		<div className={t.wrapper}>
			<table className={t.table}>
				<thead className={t.thead}>
					<tr>
						{HEADERS.map((header) => (
							<th key={header} scope='col' className={t.th}>
								{header}
							</th>
						))}
					</tr>
				</thead>
				{isLoading ? (
					<UserTableSkeleton />
				) : users.length === 0 ? (
					<tbody>
						<tr>
							<td colSpan={HEADERS.length} className={t.empty}>
								{emptyMessage}
							</td>
						</tr>
					</tbody>
				) : (
					<tbody className={t.tbody}>
						{users.map((user) => {
							const isVerified = user.badges?.some((b) => b.badge.name === 'Verified') ?? false;
							const isBusy = verifyingUserIds.has(user.id);
							const displayName = user.name || user.email || 'Unnamed user';
							return (
								<tr key={user.id} className={t.tr}>
									<td className={t.td}>
										<button type='button' onClick={() => onEdit(user)} className={t.rowAction} aria-label={`Edit ${displayName}`}>
											{user.name || <span className='text-muted-foreground'>No name</span>}
										</button>
									</td>
									<td className={cn(t.td, 'max-w-[32ch] truncate text-neutral-300')}>{user.email || '—'}</td>
									<td className={cn(t.td, 'whitespace-nowrap text-neutral-300')}>{user.role}</td>
									<td className={cn(t.td, 'text-neutral-300')}>{user.cs2Team?.name || <span className='text-muted-foreground'>—</span>}</td>
									<td className={cn(t.td, 'text-neutral-300')}>{user.isOnboardingCompleted ? 'Yes' : 'No'}</td>
									<td className={t.td}>
										<button
											type='button'
											disabled={isBusy}
											aria-pressed={isVerified}
											aria-label={`${isVerified ? 'Remove verification from' : 'Verify'} ${displayName}`}
											onClick={() => onToggleVerify(user, !isVerified)}
											className={cn(
												'inline-flex h-8 items-center gap-1 rounded-md border px-2 text-xs transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50',
												isVerified ? 'border-foreground/60 text-foreground hover:bg-muted' : 'border-border text-muted-foreground hover:bg-muted hover:text-foreground',
											)}
										>
											<BadgeCheck className='h-3.5 w-3.5' aria-hidden />
											{isVerified ? 'Verified' : 'Verify'}
										</button>
									</td>
									<td className={cn(t.td, t.num, 'whitespace-nowrap text-neutral-300')}>{formatAdminDate(user.createdAt)}</td>
								</tr>
							);
						})}
					</tbody>
				)}
			</table>
		</div>
	);
}

function UserTableSkeleton() {
	return (
		<tbody aria-hidden>
			{Array.from({ length: 5 }).map((_, i) => (
				<tr key={i} className='border-b border-border last:border-0'>
					{HEADERS.map((h) => (
						<td key={h} className={t.td}>
							<div className='h-4 rounded-sm bg-muted' />
						</td>
					))}
				</tr>
			))}
		</tbody>
	);
}
