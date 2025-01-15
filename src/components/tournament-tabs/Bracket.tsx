import { Team } from "@/types/tournaments";

interface BracketProps {
    teams: Team[];
}

const Bracket: React.FC<BracketProps> = ({ teams }) => {
    console.log(teams);
    
    return (
        <div className='bracket-container'>
            <h2 className='text-xl font-bold mb-4'>Tournament Bracket</h2>
            <div className='bracket'>
                {/* Placeholder for bracket structure */}
                <div className='matchup'>
                    <div className='team'>Team A</div>
                    <div className='team'>Team B</div>
                </div>
                <div className='matchup'>
                    <div className='team'>Team C</div>
                    <div className='team'>Team D</div>
                </div>
                {/* Add more matchups as needed */}
            </div>
            <div className='navigation'>
                <button className='nav-button'>Previous</button>
                <button className='nav-button'>Next</button>
            </div>
        </div>
    );
};

export default Bracket;