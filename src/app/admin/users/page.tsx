'use client';

import { useState, useEffect, Suspense } from 'react';
import EditUserDialog from '@/components/EditUserDialog';
import { Button } from '@/components/ui/button';
import { FaExclamation } from 'react-icons/fa';

const USERS_PER_PAGE = 10;

export default function UsersPage() {
	const [userList, setUserList] = useState([]);
	const [page, setPage] = useState(1);
	const [totalPages, setTotalPages] = useState(1);
	const [selectedUser, setSelectedUser] = useState<{
		id: number;
		name: string;
		email: string;
	} | null>(null);
	const [isDialogOpen, setIsDialogOpen] = useState(false);
	const [isLoading, setIsLoading] = useState(true);

	useEffect(() => {
		const fetchData = async () => {
			setIsLoading(true);
			const response = await fetch(
				`/api/users?page=${page}&limit=${USERS_PER_PAGE}`
			);
			const data = await response.json();
			setUserList(data.users);
			setTotalPages(data.totalPages);
			setIsLoading(false);
		};
		async function fetchUserCount() {
			const response = await fetch('/api/users/count');
			const count = await response.json();
			console.log(count);
			setTotalPages(count);
		}
		fetchUserCount();

		fetchData();
	}, [page]);

	const handlePageChange = async (newPage: number) => {
		setIsLoading(true);
		const response = await fetch(
			`/api/users?page=${newPage}&limit=${USERS_PER_PAGE}`
		);
		const data = await response.json();
		setUserList(data.users);
		setPage(newPage);
		setIsLoading(false);
	};

	const handleEdit = (user: any) => {
		setSelectedUser(user);
		setIsDialogOpen(true);
	};

	const handleDialogClose = () => {
		setIsDialogOpen(false);
		setSelectedUser(null);
	};

	const handleSave = async () => {
		if (selectedUser) {
			await fetch(`/api/users/${selectedUser.id}`, {
				method: 'PUT',
				headers: {
					'Content-Type': 'application/json',
				},
				body: JSON.stringify(selectedUser),
			});
			const response = await fetch(
				`/api/users?page=${page}&limit=${USERS_PER_PAGE}`
			);
			const data = await response.json();
			setUserList(data.users);
			handleDialogClose();
		}
	};

	const handleDelete = async () => {
		if (selectedUser) {
			await fetch(`/api/users/${selectedUser.id}`, {
				method: 'DELETE',
			});
			const response = await fetch(
				`/api/users?page=${page}&limit=${USERS_PER_PAGE}`
			);
			const data = await response.json();
			setUserList(data.users);
			handleDialogClose();
		}
	};

	return (
		<div className='mt-12 mx-12 w-[80%]'>
			<h1 className='text-2xl font-bold mb-4'>Users</h1>
			<div className='w-full border p-2 mb-4 rounded-sm flex flex-row items-center'>
				<FaExclamation className='mt-[3px] w-4 h-4 text-2xl text-red-500 mr-2' />
				<p className='text-md border-b border-b-red-500'>Click on a row to edit User.</p>
			</div>
			<Suspense fallback={<UserTableSkeleton />}>
				{isLoading ? (
					<UserTableSkeleton />
				) : (
					<UserTable
						users={userList}
						totalPages={totalPages}
						page={page}
						onPageChange={handlePageChange}
						onEdit={handleEdit}
					/>
				)}
			</Suspense>
			{isDialogOpen && selectedUser && (
				<EditUserDialog
					user={selectedUser}
					onDelete={handleDelete}
					onClose={handleDialogClose}
					onSave={handleSave}
					setUser={setSelectedUser}
				/>
			)}
		</div>
	);
}

interface UserTableProps {
	users: any[];
	totalPages: number;
	page: number;
	onPageChange: (page: number) => void;
	onEdit: (user: any) => void;
}

function UserTable({
	users,
	totalPages,
	page,
	onPageChange,
	onEdit,
}: UserTableProps) {
	return (
		<>
			<table className='w-full border'>
				<thead>
					<tr>
						<th className='py-2 px-4 border'>ID</th>
						<th className='py-2 px-4 border'>Name</th>
						<th className='py-2 px-4 border'>Email</th>
					</tr>
				</thead>
				<tbody>
					{users &&
						users.map((user) => (
							<tr
								key={user.id}
								onClick={() => onEdit(user)}
								className='cursor-pointer hover:opacity-80 transition-colors'
							>
								<td className='py-2 px-4 border '>{user.id}</td>
								<td className='py-2 px-4 border'>
									{user.name}
								</td>
								<td className='py-2 px-4 border'>
									{user.email}
								</td>
							</tr>
						))}
				</tbody>
			</table>
			<div className='mt-4 flex justify-center gap-2'>
				<Button
					onClick={() => onPageChange(page - 1)}
					disabled={page === 1}
					className='py-1 px-2 border cursor-pointer disabled:cursor-not-allowed disabled:pointer-events-auto'
				>
					&lt;
				</Button>
				<span className='py-2 px-4 border bg-muted text-white'>
					{page}
				</span>
				<Button
					onClick={() => onPageChange(page + 1)}
					disabled={page === totalPages}
					className='py-1 px-2 cursor-pointer disabled:cursor-not-allowed disabled:pointer-events-auto'
				>
					&gt;
				</Button>
			</div>
		</>
	);
}

function UserTableSkeleton() {
	return (
		<table className='w-full border'>
			<thead>
				<tr>
					<th className='py-2 px-4 border'>ID</th>
					<th className='py-2 px-4 border'>Name</th>
					<th className='py-2 px-4 border'>Email</th>
				</tr>
			</thead>
			<tbody>
				{Array.from({ length: 5 }).map((_, i) => (
					<tr key={i}>
						<td className='py-2 px-4 border'>
							<div className='h-4 bg-muted rounded-sm'></div>
						</td>
						<td className='py-2 px-4 border'>
							<div className='h-4 bg-muted rounded-sm'></div>
						</td>
						<td className='py-2 px-4 border'>
							<div className='h-4 bg-muted rounded-sm'></div>
						</td>
					</tr>
				))}
			</tbody>
		</table>
	);
}
