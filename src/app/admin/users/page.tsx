'use client';

import { useState, useEffect } from 'react';
import { FaExclamation } from 'react-icons/fa';
import EditUserDialog from '@/components/EditUserDialog';
import { Pagination } from '@/components/Pagination';
import { User } from '@/types/types';
import UserTable from '@/components/UserTable';

const USERS_PER_PAGE = 10;

export default function UsersPage() {
	const [users, setUsers] = useState<User[]>([]);
	const [currentPage, setCurrentPage] = useState(1);
	const [totalPages, setTotalPages] = useState(1);
	const [selectedUser, setSelectedUser] = useState<User | null>(null);
	const [isDialogOpen, setIsDialogOpen] = useState(false);
	const [isLoading, setIsLoading] = useState(true);

	const fetchUsers = async (page = 1) => {
		setIsLoading(true);
		const response = await fetch(
			`/api/users?page=${page}&limit=${USERS_PER_PAGE}`
		);
		const data = await response.json();
		setUsers(data.users);
		setTotalPages(data.totalPages);
		setIsLoading(false);
	};

	useEffect(() => {
		fetchUsers(currentPage);
	}, [currentPage]);

	const handlePageChange = (page: number) => {
		if (page > 0 && page <= totalPages) {
			setCurrentPage(page);
		}
	};

	const handleEdit = (user: User) => {
		setSelectedUser(user);
		setIsDialogOpen(true);
	};

	const handleDialogClose = () => {
		setIsDialogOpen(false);
		setSelectedUser(null);
	};

	const handleSave = async (updatedUser: User) => {
		await fetch(`/api/users/${updatedUser.id}`, {
			method: 'PATCH',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify(updatedUser),
		});
		await fetchUsers(currentPage);
		handleDialogClose();
	};

	return (
		<div className='mt-12 mx-12 w-[80%] overflow-hidden'>
			<h1 className='text-2xl font-bold mb-4'>User Management</h1>
			<div className='w-full border p-2 mb-4 rounded-sm flex items-center'>
				<FaExclamation className='text-red-500 mr-2' />
				<p className='text-md border-b border-red-500'>
					Click on a row to edit a user.
				</p>
			</div>
			<UserTable
				isLoading={isLoading}
				users={users}
				currentPage={currentPage}
				totalPages={totalPages}
				onPageChange={handlePageChange}
				onEdit={handleEdit}
			/>
			<Pagination
				totalPages={totalPages}
				currentPage={currentPage}
				onPageChange={handlePageChange}
			/>
			{isDialogOpen && selectedUser && (
				<EditUserDialog
					isOpen={isDialogOpen}
					user={selectedUser}
					onSave={handleSave}
					onClose={handleDialogClose}
				/>
			)}
		</div>
	);
}

