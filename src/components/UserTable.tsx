import { User } from '@/types/types';
import { BadgeCheck } from 'lucide-react';

export default function UserTable({
	users,
	onEdit,
	onToggleVerify,
	verifyingUserIds,
	isLoading,
}: {
	users: User[];
	currentPage: number;
	totalPages: number;
	onPageChange: (page: number) => void;
	onEdit: (user: User) => void;
	onToggleVerify: (user: User, verified: boolean) => void;
	verifyingUserIds: Set<string>;
	isLoading: boolean;
}) {
	return (
		<div className='overflow-auto h-[70%]'>
			<table className='w-full border'>
				<thead>
					<tr>
						{['ID', 'Email', 'Name', 'Role', 'Onboarding Completed', 'Team', 'Verified', 'Created At', 'Updated At'].map((header) => (
							<th key={header} className='py-2 px-4 border'>
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
							<td colSpan={9} className='py-8 px-4 border text-center text-muted-foreground'>
								No users found.
							</td>
						</tr>
					</tbody>
				) : (
					<tbody>
						{users.map((user) => {
							const isVerified = user.badges?.some((b) => b.badge.name === 'Verified') ?? false;
							const isBusy = verifyingUserIds.has(user.id);
							return (
								<tr
									key={user.id}
									onClick={() => onEdit(user)}
									onKeyDown={(e) => {
										if (e.key === 'Enter' || e.key === ' ') {
											e.preventDefault();
											onEdit(user);
										}
									}}
									tabIndex={0}
									role='button'
									className='cursor-pointer hover:opacity-80 transition-colors text-center pb-8 focus:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-inset'
								>
									<td className='py-2 px-6 border text-nowrap'>{user.id}</td>
									<td className='py-2 px-4 border'>{user.email}</td>
									<td className='py-2 px-4 border'>{user.name || 'N/A'}</td>
									<td className='py-2 px-4 border'>{user.role}</td>
									<td className='py-2 px-4 border'>{user.isOnboardingCompleted ? 'Yes' : 'No'}</td>
									<td className='py-2 px-4 border'>{user.cs2Team?.name || 'N/A'}</td>
									<td className='py-2 px-4 border'>
										<button
											type='button'
											disabled={isBusy}
											onClick={(e) => {
												e.stopPropagation();
												onToggleVerify(user, !isVerified);
											}}
											className={`inline-flex items-center gap-1 rounded-full border px-2 py-1 text-xs transition-colors disabled:opacity-50 ${
												isVerified ? 'border-blue-500 text-blue-400 hover:bg-blue-500/10' : 'border-gray-600 text-gray-400 hover:bg-white/5'
											}`}
										>
											<BadgeCheck className='h-3.5 w-3.5' />
											{isVerified ? 'Verified' : 'Verify'}
										</button>
									</td>
									<td className='py-2 px-4 border'>{new Date(user.createdAt).toLocaleDateString()}</td>
									<td className='py-2 px-4 border'>{new Date(user.updatedAt).toLocaleDateString()}</td>
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
		<tbody>
			{Array.from({ length: 5 }).map((_, i) => (
				<tr key={i}>
					{Array.from({ length: 9 }).map((_, j) => (
						<td key={j} className='py-2 px-4 border'>
							<div className='h-4 bg-muted rounded-sm'></div>
						</td>
					))}
				</tr>
			))}
		</tbody>
	);
}
