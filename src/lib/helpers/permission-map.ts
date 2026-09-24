import type { UserRole } from '@prisma/client';

// Client-safe half of the permission model (no DB import), so client components such as the
// navbar can decide what to show from the session role. Authorization still happens on the server.
export type Permission = 'admin:access' | 'users:manage' | 'teams:manage' | 'tournaments:manage' | 'matches:manage' | 'servers:manage' | 'content:manage' | 'forum:moderate' | 'users:ban';

const permissionMap: Record<Permission, UserRole[]> = {
	'admin:access': ['MODERATOR', 'TOURNAMENT_ADMIN', 'CONTENT_ADMIN', 'ADMIN'],
	'users:manage': ['ADMIN'],
	'teams:manage': ['MODERATOR', 'ADMIN'],
	'tournaments:manage': ['TOURNAMENT_ADMIN', 'ADMIN'],
	'matches:manage': ['TOURNAMENT_ADMIN', 'ADMIN'],
	'servers:manage': ['TOURNAMENT_ADMIN', 'ADMIN'],
	'content:manage': ['CONTENT_ADMIN', 'ADMIN'],
	'forum:moderate': ['MODERATOR', 'CONTENT_ADMIN', 'ADMIN'],
	'users:ban': ['MODERATOR', 'CONTENT_ADMIN', 'ADMIN'],
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
