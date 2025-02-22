export async function fetchUserTeam(userId: string) {
    try {
        const baseUrl = process.env.NEXTAUTH_URL || 'http://localhost:3000';
        const response = await fetch(`${baseUrl}/api/user/team?id=${userId}`);
        
        if (!response.ok) {
            throw new Error('Network response was not ok');
        }

        const userTeam = await response.json();

        return userTeam;
    } catch (error) {
        console.error('Error fetching user team:', error);
        return null;
    }
}