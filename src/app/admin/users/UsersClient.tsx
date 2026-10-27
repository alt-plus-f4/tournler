'use client';

import { useState, useEffect } from 'react';
import dynamic from 'next/dynamic';

// Only fetched once an admin first opens a user.
const EditUserDialog = dynamic(() => import('@/components/EditUserDialog'));
import { Pagination } from '@/components/Pagination';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { User } from '@/types/types';
import UserTable from '@/components/UserTable';
import { AdminPage, AdminHeader, AdminToolbar } from '@/components/admin/AdminPage';

const USERS_PER_PAGE = 10;
const SEARCH_DEBOUNCE_MS = 300;

export default function UsersClient() {
	const [users, setUsers] = useState<User[]>([]);
	const [currentPage, setCurrentPage] = useState(1);
	const [totalPages, setTotalPages] = useState(1);
	const [selectedUser, setSelectedUser] = useState<User | null>(null);
	const [isDialogOpen, setIsDialogOpen] = useState(false);
	const [isLoading, setIsLoading] = useState(true);
	const [hasLoadedOnce, setHasLoadedOnce] = useState(false);
	const [searchInput, setSearchInput] = useState('');
	const [search, setSearch] = useState('');
	const [verifyingUserIds, setVerifyingUserIds] = useState<Set<string>>(new Set());

	useEffect(() => {
		const timeout = setTimeout(() => {
			setSearch(searchInput);
			setCurrentPage(1);
		}, SEARCH_DEBOUNCE_MS);
		return () => clearTimeout(timeout);
	}, [searchInput]);

	const fetchUsers = async (page = 1, searchQuery = '') => {
		setIsLoading(true);
		const params = new URLSearchParams({ page: String(page), limit: String(USERS_PER_PAGE) });
		if (searchQuery) params.set('search', searchQuery);
		const response = await fetch(`/api/users?${params.toString()}`);
		const data = await response.json();
		setUsers(data.users ?? []);
		setTotalPages(data.totalPages ?? 1);
		setIsLoading(false);
		setHasLoadedOnce(true);
	};

	useEffect(() => {
		fetchUsers(currentPage, search);
	}, [currentPage, search]);

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
		await fetchUsers(currentPage, search);
		handleDialogClose();
	};

	const handleDelete = (userId: string) => {
		setUsers((prev) => prev.filter((u) => u.id !== userId));
	};

	const handleToggleVerify = async (user: User, verified: boolean) => {
		setVerifyingUserIds((prev) => new Set(prev).add(user.id));
		try {
			const response = await fetch('/api/admin/badges/verify', {
				method: verified ? 'POST' : 'DELETE',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ userId: user.id }),
			});
			if (!response.ok) throw new Error('Failed to update verification');

			setUsers((prev) =>
				prev.map((u) => {
					if (u.id !== user.id) return u;
					const badges = u.badges?.filter((b) => b.badge.name !== 'Verified') ?? [];
					if (verified) badges.push({ badge: { id: 0, name: 'Verified', icon: 'verified', color: '#3b82f6', isOverlay: true } });
					return { ...u, badges };
				}),
			);
		} catch (error) {
			console.error('Failed to toggle verification', error);
		} finally {
			setVerifyingUserIds((prev) => {
				const next = new Set(prev);
				next.delete(user.id);
				return next;
			});
		}
	};

	return (
		<AdminPage>
			<AdminHeader title='Users' subtitle='Search accounts, edit roles and verify players.' />
			<AdminToolbar>
				<Label htmlFor='admin-user-search' className='sr-only'>
					Search users
				</Label>
				<Input id='admin-user-search' type='search' placeholder='Search by name or email…' value={searchInput} onChange={(e) => setSearchInput(e.target.value)} className='sm:max-w-sm' />
			</AdminToolbar>
			<UserTable
				isLoading={isLoading && !hasLoadedOnce}
				users={users}
				currentPage={currentPage}
				totalPages={totalPages}
				onPageChange={handlePageChange}
				onEdit={handleEdit}
				onToggleVerify={handleToggleVerify}
				onBanChanged={() => fetchUsers(currentPage, search)}
				verifyingUserIds={verifyingUserIds}
				emptyMessage={search ? `No users match “${search}”.` : 'No users yet.'}
			/>
			<Pagination totalPages={totalPages} currentPage={currentPage} onPageChange={handlePageChange} />
			{isDialogOpen && selectedUser && <EditUserDialog isOpen={isDialogOpen} user={selectedUser} onSave={handleSave} onClose={handleDialogClose} onDelete={handleDelete} />}
		</AdminPage>
	);
}
