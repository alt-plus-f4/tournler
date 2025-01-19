import { db } from '../db';

export async function isAdmin(userId: string): Promise<boolean | null> {
	try {
		const user = await db.user.findUnique({
			where: { id: userId },
			select: { role: true },
		});

		if (!user) {
			console.log('User not found');
			return null;
		}

		return user.role == 'ADMIN' ? true : false;
	} catch (error) {
		console.error('Error fetching user role:', error);
		return null;
	}
}
