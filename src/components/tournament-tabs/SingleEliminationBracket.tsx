import { useRouter } from 'next/navigation';
import { emptyBracket, sampleMatches } from '@/lib/sample/sampleMatches';
import { Tournament } from '@/types/types';

interface Participant {
	id?: number;
	name: string;
	score: number | null;
}

interface Match {
	id: number;
	nextMatchId?: number;
	participants: Participant[];
	winner: Participant | null;
	status: 'PENDING' | 'IN_PROGRESS' | 'COMPLETED';
}

interface BracketProps {
	matches?: Match[];
	tournament: Tournament;
	onMatchClick?: (match: Match) => void;
	svgWrapper?: React.FC<{ children: React.ReactNode }>;
}

const generateBracketFromTeams = (teams: any[]): Match[] => {
	if (!teams || teams.length === 0) {
		return emptyBracket;
	}

	// Sort teams (could add seeding logic here)
	const sortedTeams = [...teams];

	// Calculate number of rounds needed
	const numTeams = sortedTeams.length;
	let matchId = 1;
	const matches: Match[] = [];

	// Generate first round matches
	const firstRoundMatches: Match[] = [];
	for (let i = 0; i < numTeams; i += 2) {
		const team1 = sortedTeams[i];
		const team2 = sortedTeams[i + 1];

		const nextMatchId = numTeams > 2 ? Math.floor(numTeams / 2) + Math.ceil((i / 2 + 1) / 2) : undefined;

		firstRoundMatches.push({
			id: matchId,
			nextMatchId: nextMatchId,
			participants: [
				{
					id: team1?.id,
					name: team1?.name || 'TBD',
					score: null,
				},
				{
					id: team2?.id,
					name: team2?.name || 'TBD',
					score: null,
				},
			],
			winner: null,
			status: 'PENDING',
		});
		matchId++;
	}

	matches.push(...firstRoundMatches);

	// Generate subsequent rounds
	let currentRoundMatches = firstRoundMatches;
	let roundStartId = matchId;

	while (currentRoundMatches.length > 1) {
		const nextRoundMatches: Match[] = [];

		for (let i = 0; i < currentRoundMatches.length; i += 2) {
			const nextMatchId = currentRoundMatches.length > 2 ? roundStartId + Math.ceil((i / 2 + 1) / 2) : undefined;

			nextRoundMatches.push({
				id: matchId,
				nextMatchId: nextMatchId,
				participants: [
					{ id: undefined, name: 'TBD', score: null },
					{ id: undefined, name: 'TBD', score: null },
				],
				winner: null,
				status: 'PENDING',
			});
			matchId++;
		}

		roundStartId = matchId;
		matches.push(...nextRoundMatches);
		currentRoundMatches = nextRoundMatches;
	}

	return matches;
};

const SingleEliminationBracket: React.FC<BracketProps> = ({ matches = [], onMatchClick, tournament, svgWrapper: SvgWrapper = ({ children }) => <div>{children}</div> }) => {
	const router = useRouter();
	const bracketMatches = tournament.status === 'UPCOMING' ? emptyBracket : matches.length > 0 ? matches : tournament.teams && tournament.teams.length > 0 ? generateBracketFromTeams(tournament.teams) : sampleMatches;
	const columnWidth = 240;
	const rowHeight = 90;
	const padding = 30;
	const titleMarginTop = 25;

	const generateBracket = (matches: Match[]): Match[][] => {
		const lastMatch = matches.find((match) => !match.nextMatchId);
		if (!lastMatch) return [];

		const columns: Match[][] = [];
		let currentColumn = [lastMatch];

		while (currentColumn.length > 0) {
			columns.unshift(currentColumn);
			const nextColumn = currentColumn.reduce<Match[]>((acc, match) => {
				const previousMatches = matches.filter((m) => m.nextMatchId === match.id);
				return [...acc, ...previousMatches];
			}, []);
			currentColumn = nextColumn;
		}

		return columns;
	};

	const getRoundTitle = (matchCount: number): string => {
		if (matchCount === 1) return 'Finals';
		if (matchCount === 2) return 'Semi Finals';
		if (matchCount === 4) return 'Quarter Finals';
		if (matchCount === 8) return 'Round of 16';
		if (matchCount === 16) return 'Round of 32';
		return `Round (${matchCount} teams)`;
	};

	const columns = generateBracket(bracketMatches);
	const bracketWidth = Math.max(columns.length * columnWidth + padding * 2, 400);
	const getYPosition = (columnIndex: number, matchIndex: number): number => {
		const totalMatches = columns[columnIndex].length;
		const spaceBetweenMatches = rowHeight * Math.pow(2, columnIndex);
		const startY = (bracketHeight - (totalMatches - 1) * spaceBetweenMatches) / 2;
		return startY + matchIndex * spaceBetweenMatches;
	};

	const bracketHeight =
		Math.max(
			...columns.map((col, i) => {
				const totalMatches = col.length;
				const spaceBetweenMatches = rowHeight * Math.pow(2, i);
				return (totalMatches - 1) * spaceBetweenMatches + rowHeight;
			}),
		) +
		padding * 2;

	const renderMatch = (match: Match, x: number, y: number) => {
		const boxHeight = 70;
		const textPadding = 12;
		const borderRadius = 6;

		const getParticipantDetails = (
			participant: Participant | null,
			// eslint-disable-next-line @typescript-eslint/no-unused-vars
			index: number,
		) => {
			if (!participant || !participant.name) {
				return {
					name: 'TBD',
					score: '-',
					fill: '#999999',
					bgColor: '#2a2a2a',
				};
			}

			const isWinner = match.winner?.id === participant.id;
			return {
				name: participant.name,
				score: participant.score ?? '-',
				fill: isWinner ? '#ffffff' : '#e0e0e0',
				bgColor: isWinner ? '#1a1a1a' : '#2a2a2a',
				isWinner,
			};
		};

		// const statusStrokeColor: Record<string, string> = {
		// 	PENDING: '#ffffff',
		// 	IN_PROGRESS: '#ffffff',
		// 	COMPLETED: '#ffffff',
		// };

		return (
			<g
				key={`match-${match.id}`}
				transform={`translate(${x}, ${y + titleMarginTop})`}
				onClick={() => {
					onMatchClick?.(match);
					router.push(`/matches/${match.id}`);
				}}
				style={{ cursor: 'pointer' }}
				className='hover:opacity-80 transition-opacity'
			>
				{/* Main match box */}
				<rect width={columnWidth - padding} height={boxHeight} rx={borderRadius} fill='#1a1a1a' stroke='#ffffff' strokeWidth='0.25' />

				{[0, 1].map((index) => {
					const participant = match.participants[index];
					const details = getParticipantDetails(participant, index);
					const teamHeight = boxHeight / 2;

					return (
						<g key={`match-${match.id}-team-${index}`}>
							{/* Team row background */}
							<rect x={0} y={index * teamHeight} width={columnWidth - padding} height={teamHeight} fill={details.bgColor} rx={index === 0 ? `${borderRadius} ${borderRadius} 0 0` : `0 0 ${borderRadius} ${borderRadius}`} />

							{/* Left accent bar */}
							<rect x={0} y={index * teamHeight} width={3} height={teamHeight} fill={details.isWinner ? '#ffffff' : '#666666'} rx={index === 0 ? `${borderRadius} 0 0 0` : `0 0 0 ${borderRadius}`} />

							{/* Team name */}
							<text x={textPadding + 8} y={index * teamHeight + teamHeight / 2} fill={details.fill} fontSize='12' fontFamily='system-ui, -apple-system, sans-serif' fontWeight='500' dominantBaseline='middle' className='pointer-events-none'>
								{details.name}
							</text>

							{/* Score */}
							<text
								x={columnWidth - padding - textPadding - 4}
								y={index * teamHeight + teamHeight / 2}
								fill={details.fill}
								fontSize='14'
								fontFamily='system-ui, -apple-system, sans-serif'
								fontWeight='600'
								textAnchor='end'
								dominantBaseline='middle'
								className='pointer-events-none'
							>
								{details.score}
							</text>
						</g>
					);
				})}
			</g>
		);
	};

	const renderConnectors = (match: Match, x: number, y: number, columnIndex: number) => {
		if (columnIndex === 0) return null;

		const previousMatches = bracketMatches.filter((m) => m.nextMatchId === match.id);
		if (previousMatches.length === 0) return null;

		return (
			<g key={`connectors-${match.id}`}>
				{previousMatches.map((prevMatch) => {
					const prevX = x - columnWidth;
					const prevY = getYPosition(columnIndex - 1, previousMatches.indexOf(prevMatch));
					const startY = prevY + titleMarginTop + 35;
					const endY = y + titleMarginTop + 35;

					const midX = x - columnWidth / 2 + padding / 2;

					return (
						<path
							key={`connector-${match.id}-${prevMatch.id}`}
							d={`
								M ${prevX + columnWidth - padding} ${startY}
								L ${midX} ${startY}
								L ${midX} ${endY}
								L ${x} ${endY}
							`}
							stroke='#555555'
							strokeWidth='1.5'
							fill='none'
							strokeLinecap='round'
							strokeLinejoin='round'
						/>
					);
				})}
			</g>
		);
	};

	const renderRoundTitles = (columnIndex: number, x: number, matchCount: number) => (
		<g key={`round-${columnIndex}`}>
			<text x={x + columnWidth / 2} y={12} textAnchor='middle' fill='#ffffff' fontSize='13' fontWeight='700' fontFamily='system-ui, -apple-system, sans-serif' className='pointer-events-none'>
				{getRoundTitle(matchCount)}
			</text>
		</g>
	);

	return (
		<div className='w-full flex flex-col items-center justify-center py-8'>
			<div className='flex justify-center'>
				<div className='overflow-x-auto'>
					<SvgWrapper>
						<svg width={bracketWidth} height={bracketHeight + padding + titleMarginTop}>
							{columns.map((column, columnIndex) => (
								<g key={columnIndex}>
									{renderRoundTitles(columnIndex, padding + columnIndex * columnWidth, column.length)}
									{column.map((match, matchIndex) => {
										const x = padding + columnIndex * columnWidth;
										const y = getYPosition(columnIndex, matchIndex);

										return (
											<g key={match.id}>
												{renderConnectors(match, x, y, columnIndex)}
												{renderMatch(match, x, y)}
											</g>
										);
									})}
								</g>
							))}
						</svg>
					</SvgWrapper>
				</div>
			</div>
		</div>
	);
};

export default SingleEliminationBracket;
