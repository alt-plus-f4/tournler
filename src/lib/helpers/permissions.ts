import { UserRole } from '@prisma/client';
import { db } from '@/lib/db';

export type Permission = 'admin:access' | 'users:manage' | 'teams:manage' | 'tournaments:manage' | 'matches:manage' | 'servers:manage' | 'content:manage';

const permissionMap: Record<Permission, UserRole[]> = {
	'admin:access': ['MODERATOR', 'TOURNAMENT_ADMIN', 'CONTENT_ADMIN', 'SUPER_ADMIN'],
	'users:manage': ['SUPER_ADMIN'],
	'teams:manage': ['MODERATOR', 'SUPER_ADMIN'],
	'tournaments:manage': ['TOURNAMENT_ADMIN', 'SUPER_ADMIN'],
	'matches:manage': ['TOURNAMENT_ADMIN', 'SUPER_ADMIN'],
	'servers:manage': ['TOURNAMENT_ADMIN', 'SUPER_ADMIN'],
	'content:manage': ['CONTENT_ADMIN', 'SUPER_ADMIN'],
};

export function hasPermission(role: UserRole | null | undefined, permission: Permission): boolean {
	if (!role) {
		return false;
	}

	return permissionMap[permission].includes(role);
}

export function isAdminRole(role: UserRole | null | undefined): boolean {
	return hasPermission(role, 'admin:access');
}

export async function getUserRole(userId: string): Promise<UserRole | null> {
	const user = await db.user.findUnique({
		where: { id: userId },
		select: { role: true },
	});

	return user?.role ?? null;
}

export async function userHasPermission(userId: string, permission: Permission): Promise<boolean> {
	const role = await getUserRole(userId);
	return hasPermission(role, permission);
}
