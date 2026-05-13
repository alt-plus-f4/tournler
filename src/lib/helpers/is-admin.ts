import { db } from '../db';
import { isAdminRole } from './permissions';

export async function isAdmin(userId: string): Promise<boolean> {
	try {
		const user = await db.user.findUnique({
			where: { id: userId },
			select: { role: true },
		});

		if (!user) {
			return false;
		}

		return isAdminRole(user.role);
	} catch (error) {
		console.error('Error fetching user role:', error);
		return false;
	}
}
