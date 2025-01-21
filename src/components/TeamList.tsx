''

import { useEffect, useState } from 'react';

const TeamList: React.FC = () => {
    const [teams, setTeams] = useState<string[]>([]);
    const [loading, setLoading] = useState<boolean>(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const fetchTeams = async () => {
            try {
                const response = await fetch('/api/teams');
                if (!response.ok) {
                    throw new Error('Failed to fetch teams');
                }
                const data = await response.json();
                setTeams(data.teams);
            } catch (err : any) {
                setError(err.message);
            } finally {
                setLoading(false);
            }
        };

        fetchTeams();
    }, []);

    if (loading) {
        return <p>Loading teams...</p>;
    }

    if (error) {
        return <p>Error: {error}</p>;
    }

    return (
        <div>
            <h2>Participating Teams</h2>
            <ul>
                {teams.map((team, index) => (
                    <li key={index}>{team}</li>
                ))}
            </ul>
        </div>
    );
};

export default TeamList;