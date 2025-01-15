export async function fetchUserTeam(userId: string) {
    try {
        const response = await fetch(`http://localhost:3000/api/user/team?id=${userId}`);
        
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
