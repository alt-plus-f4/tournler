'use client';

import { useState } from 'react';
import Overview from './Overview';
import Participants from './Participants';
import Prizes from './Prizes';
import { Cs2Tournament } from '@/types/types';
import SingleEliminationBracket from './SingleEliminationBracket';

interface TabMenuProps {
    tournament: Cs2Tournament;
}

const TabMenu: React.FC<TabMenuProps> = ({ tournament }) => {
    const [activeTab, setActiveTab] = useState('overview');

    const renderTabContent = () => {
        switch (activeTab) {
            case 'overview':
                return <Overview tournament={tournament} setActiveTab={setActiveTab} />;
            case 'participants':
                return <Participants tournament={tournament} />;
            case 'prizes':
                return <Prizes prizePool={tournament.prizePool ?? 0} />;
            case 'bracket':
                return <SingleEliminationBracket tournament={tournament}/>;
            default:
                return <Overview tournament={tournament} setActiveTab={setActiveTab} />;
        }
    };

    return (
        <div>
            <div className='flex items-start md:justify-start md:mx-4 py-2 justify-between md:space-x-24 border-b'>
                <button
                    onClick={() => setActiveTab('overview')}
                    className={`p-2 hover:text-gray-400 transition-colors ${activeTab === 'overview' ? 'font-bold border-b-2 border-white' : ''}`}
                >
                    Overview
                </button>
                <button
                    onClick={() => setActiveTab('participants')}
                    className={`p-2 hover:text-gray-400 transition-colors ${activeTab === 'participants' ? 'font-bold border-b-2 border-white' : ''}`}
                >
                    Participants
                </button>
                <button
                    onClick={() => setActiveTab('prizes')}
                    className={`p-2 hover:text-gray-400 transition-colors ${activeTab === 'prizes' ? 'font-bold border-b-2 border-white' : ''}`}
                >
                    Prizes
                </button>
                <button
                    onClick={() => setActiveTab('bracket')}
                    className={`p-2 hover:text-gray-400 transition-colors ${activeTab === 'bracket' ? 'font-bold border-b-2 border-white' : ''}`}
                >
                    Bracket
                </button>
            </div>
            <div>{renderTabContent()}</div>
        </div>
    );
};

export default TabMenu;
