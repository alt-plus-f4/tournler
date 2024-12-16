import { Cs2Team } from "@prisma/client";
import { ExtendedUser } from "./models/user-model";

export async function completeOnboarding() {
  try {
    const response = await fetch('/api/user/onboarding', {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message);
    }

    const data = await response.json();
    return data;
  } catch (error) {
    if (error instanceof Error) {
      return { error: error.message };
    }
    return { error: 'An unknown error occurred' };
  }
}

export async function removeMemberRequest(team: Cs2Team, member: ExtendedUser) {
	try {
		const response = await fetch(`/api/teams/${team.id}/invites/${member.id}`, {
			method: 'DELETE',
			headers: {
				'Content-Type': 'application/json',
			},
		});

		if (!response.ok) {
			const errorData = await response.json();
			return { error: errorData.message };
		}

		return { success: true };
	} catch (error) {
		return { error: 'An unexpected error occurred' + error};
	}
}

export async function fetchOnboardingStatus() {
  try {
    const response = await fetch('/api/user/onboarding', {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message);
    }

    const data = await response.json();
    return data;
  } catch (error) {
    if (error instanceof Error) {
      return { error: error.message };
    }
    return { error: 'An unknown error occurred' };
  }
}

export async function fetchIsDiscordLinked() {
  try {
    const response = await fetch('/api/user/discord', {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message);
    }

    const data = await response.json();
    return data;
  } catch (error) {
    if (error instanceof Error) {
      return { error: error.message };
    }
    return { error: 'An unknown error occurred' };
  }
}