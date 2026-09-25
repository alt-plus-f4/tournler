import { cache } from 'react';
import type { UserRole } from '@prisma/client';
import { db } from '@/lib/db';

export { hasPermission, isAdminRole, type Permission } from './permission-map';
import { hasPermission, type Permission } from './permission-map';

/** Cached per request (React `cache`): pages often check several permissions for the same user. */
export const getUserRole = cache(async function getUserRole(userId: string): Promise<UserRole | null> {
	const user = await db.user.findUnique({
		where: { id: userId },
		select: { role: true },
	});

	return user?.role ?? null;
});

export async function userHasPermission(userId: string, permission: Permission): Promise<boolean> {
	const role = await getUserRole(userId);
	return hasPermission(role, permission);
}
