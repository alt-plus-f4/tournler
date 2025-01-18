import { db } from '@/lib/db';

export async function fetchUsersWithATeam(teamId: number) {
  try {
    const usersWithATeam = await db.user.findMany({
      where: {
        cs2TeamId: teamId,
      },
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

    return usersWithATeam;
  } catch (error) {
    console.error('Error fetching users with a team:', error);
    return [];
  }
}