import { db } from '@/lib/db';

export async function fetchAllUsers() {
  try {
    const allUsers = await db.user.findMany({
      select: {
        id: true,
        email: true,
        name: true,
        image: true,
        isOnboardingCompleted: true,
        emailVerified: true,
        role: true,
        cs2TeamId: true,
      },
    });

    console.log('allUsers:', allUsers);

    return allUsers;
  } catch (error) {
    console.error('Error fetching all users:', error);
    return [];
  }
}