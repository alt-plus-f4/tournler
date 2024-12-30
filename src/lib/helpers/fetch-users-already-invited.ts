import { db } from '@/lib/db';

// ! NOT YET

export async function fetchUsersAlreadyInvited(teamId: number) {
  try {
    const usersAlreadyInvited = await db.user.findMany({
      where: {
        cs2TeamInvitations: {
          some: {
            teamId: teamId,
          },
        },
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

    console.log('usersAlreadyInvited:', usersAlreadyInvited);

    return usersAlreadyInvited;
  } catch (error) {
    console.error('Error fetching users already invited:', error);
    return [];
  }
}