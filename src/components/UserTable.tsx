import { User } from "@/types/types";

export default function UserTable({
	users,
	onEdit,
	isLoading,
}: {
	users: User[];
	currentPage: number;
	totalPages: number;
	onPageChange: (page: number) => void;
	onEdit: (user: User) => void;
	isLoading: boolean;
}) {
	return (
		<div className='overflow-auto h-[70%]'>
			<table className='w-full border'>
				<thead>
					<tr>
						{[
							'ID',
							'Email',
							'Name',
							'Role',
							'Onboarding Completed',
							'Team',
							'Created At',
							'Updated At',
						].map((header) => (
							<th key={header} className='py-2 px-4 border'>
								{header}
							</th>
						))}
					</tr>
				</thead>
				{isLoading ? (
					<UserTableSkeleton />
				) : (
					<tbody>
						{users.map((user) => (
							<tr
								key={user.id}
								onClick={() => onEdit(user)}
								className='cursor-pointer hover:opacity-80 transition-colors text-center pb-8'
							>
								<td className='py-2 px-6 border text-nowrap'>{user.id}</td>
								<td className='py-2 px-4 border'>
									{user.email}
								</td>
								<td className='py-2 px-4 border'>
									{user.name || 'N/A'}
								</td>
								<td className='py-2 px-4 border'>
									{user.role}
								</td>
								<td className='py-2 px-4 border'>
									{user.isOnboardingCompleted ? 'Yes' : 'No'}
								</td>
								<td className='py-2 px-4 border'>
									{user.cs2Team?.name || 'N/A'}
								</td>
								<td className='py-2 px-4 border'>
									{new Date(
										user.createdAt
									).toLocaleDateString()}
								</td>
								<td className='py-2 px-4 border'>
									{new Date(
										user.updatedAt
									).toLocaleDateString()}
								</td>
							</tr>
						))}
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
					{Array.from({ length: 8 }).map((_, j) => (
						<td key={j} className='py-2 px-4 border'>
							<div className='h-4 bg-muted rounded-sm'></div>
						</td>
					))}
				</tr>
			))}
		</tbody>
	);
}
