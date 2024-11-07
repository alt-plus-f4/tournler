// eslint-disable-next-line @typescript-eslint/no-unused-vars
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

// eslint-disable-next-line @typescript-eslint/no-unused-vars
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