import { db } from '@/lib/db';

export async function fetchUsersNotInTheTeam(teamId: number) {
  try {
    const usersNotInTheTeam = await db.user.findMany({
      where: {
        OR: [
          {
            cs2TeamId: null,
          },
          {
            cs2TeamId: {
              not: teamId,
            },
          },
        ],
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

    return usersNotInTheTeam;
  } catch (error) {
    console.error('Error fetching users not in the team:', error);
    return [];
  }
}