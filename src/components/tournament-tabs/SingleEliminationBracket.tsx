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

const SingleEliminationBracket: React.FC<BracketProps> = ({
	matches = [],
	onMatchClick,
	tournament,
	svgWrapper: SvgWrapper = ({ children }) => <div>{children}</div>,
}) => {
	const bracketMatches =
		tournament.status === 'UPCOMING'
			? emptyBracket
			: matches.length > 0
				? matches
				: sampleMatches;
	const columnWidth = 250;
	const rowHeight = 100;
	const padding = 40;
	const titleMarginTop = 20;

	const generateBracket = (matches: Match[]): Match[][] => {
		const lastMatch = matches.find((match) => !match.nextMatchId);
		if (!lastMatch) return [];

		const columns: Match[][] = [];
		let currentColumn = [lastMatch];

		while (currentColumn.length > 0) {
			columns.unshift(currentColumn);
			const nextColumn = currentColumn.reduce<Match[]>((acc, match) => {
				const previousMatches = matches.filter(
					(m) => m.nextMatchId === match.id
				);
				return [...acc, ...previousMatches];
			}, []);
			currentColumn = nextColumn;
		}

		return columns;
	};

	const columns = generateBracket(bracketMatches);
	const bracketWidth = columns.length * columnWidth + padding * 2;
	const getYPosition = (columnIndex: number, matchIndex: number): number => {
		const totalMatches = columns[columnIndex].length;
		const spaceBetweenMatches = rowHeight * Math.pow(2, columnIndex);
		const startY =
			(bracketHeight - (totalMatches - 1) * spaceBetweenMatches) / 2;
		return startY + matchIndex * spaceBetweenMatches;
	};

	const bracketHeight =
		Math.max(
			...columns.map((col, i) => {
				const totalMatches = col.length;
				const spaceBetweenMatches = rowHeight * Math.pow(2, i);
				return (totalMatches - 1) * spaceBetweenMatches + rowHeight;
			})
		) +
		padding * 2;

	const renderMatch = (match: Match, x: number, y: number) => {
		const boxHeight = 60;
		const textPadding = 20;

		const getParticipantDetails = (
			participant: Participant | null,
			// eslint-disable-next-line @typescript-eslint/no-unused-vars
			index: number
		) => {
			if (!participant || !participant.name) {
				return {
					name: 'TBD',
					score: '-',
					fill: '#666666',
					opacity: 0.5,
				};
			}

			const isWinner = match.winner?.id === participant.id;
			return {
				name: participant.name,
				score: participant.score ?? '-',
				fill: match.winner
					? isWinner
						? '#ffffff'
						: '#999999'
					: '#999999',
				opacity: match.winner ? (isWinner ? 1 : 0.5) : 1,
			};
		};

		return (
			<g
				key={`match-${match.id}`}
				transform={`translate(${x}, ${y + titleMarginTop})`}
				onClick={() => onMatchClick?.(match)}
				style={{ cursor: 'pointer' }}
				className='transition-all duration-200 hover:brightness-150'
			>
				<rect
					width={columnWidth - padding}
					height={boxHeight}
					rx={2}
					fill='#1a1a1a'
					stroke='#333333'
					strokeWidth={1}
				/>
				{[0, 1].map((index) => {
					const participant = match.participants[index];
					const details = getParticipantDetails(participant, index);
					const teamHeight = boxHeight / 2;

					return (
						<g key={`match-${match.id}-team-${index}`}>
							<rect
								x={0}
								y={index * teamHeight}
								width={columnWidth - padding}
								height={teamHeight}
								fill='#1a1a1a'
								fillOpacity={details.opacity}
								stroke='#333333'
								strokeWidth={1}
							/>
							<rect
								x={0}
								y={index * teamHeight}
								width={3}
								height={teamHeight}
								fill={
									participant && match.winner
										? match.winner.id === participant.id
											? '#4ade80'
											: '#ef4444'
										: '#999999'
								}
							/>
							<text
								x={textPadding}
								y={index * teamHeight + teamHeight / 2}
								fill={details.fill}
								fontSize={13}
								fontFamily='Arial'
								dominantBaseline='middle'
							>
								{details.name}
							</text>
							<text
								x={columnWidth - padding - textPadding}
								y={index * teamHeight + teamHeight / 2}
								fill={details.fill}
								fontSize={13}
								fontFamily='Arial'
								textAnchor='end'
								dominantBaseline='middle'
							>
								{details.score}
							</text>
						</g>
					);
				})}
			</g>
		);
	};

	const renderConnectors = (
		match: Match,
		x: number,
		y: number,
		columnIndex: number
	) => {
		if (columnIndex === 0) return null;

		const previousMatches = bracketMatches.filter(
			(m) => m.nextMatchId === match.id
		);
		if (previousMatches.length === 0) return null;

		return (
			<g key={`connector-${match.id}`}>
				{previousMatches.map((prevMatch) => {
					const prevX = x - columnWidth;
					const prevY = getYPosition(
						columnIndex - 1,
						previousMatches.indexOf(prevMatch)
					);
					const startY = prevY + titleMarginTop + 40;
					const endY = y + titleMarginTop + 40;

					return (
						<path
							key={`connector-${match.id}-${prevMatch.id}`}
							d={`
					M ${prevX + columnWidth - padding} ${startY}
					H ${x - padding / 2}
					V ${endY}
					H ${x}
				  `}
							stroke='#404040'
							strokeWidth={2}
							fill='none'
						/>
					);
				})}
			</g>
		);
	};

	const roundTitles = ['Quarter Finals', 'Semi Finals', 'Finals'];

	const renderRoundTitles = (columnIndex: number, x: number) => (
		<text
			key={`round-${columnIndex}`}
			x={x + columnWidth / 2 - 15}
			y={padding + titleMarginTop}
			textAnchor='middle'
			fill='white'
			fontSize={16}
			fontWeight='bold'
		>
			{roundTitles[columnIndex]}
		</text>
	);

	return (
		<div
			className={`w-[${bracketWidth}px] h-[${bracketHeight}px] overflow-scroll`}
		>
			<SvgWrapper>
				<svg
					width={bracketWidth}
					height={bracketHeight + padding + titleMarginTop}
				>
					{columns.map((column, columnIndex) => (
						<g key={columnIndex}>
							{renderRoundTitles(
								columnIndex,
								padding + columnIndex * columnWidth
							)}
							{column.map((match, matchIndex) => {
								const x = padding + columnIndex * columnWidth;
								const y = getYPosition(columnIndex, matchIndex);

								return (
									<g key={match.id}>
										{renderConnectors(
											match,
											x,
											y,
											columnIndex
										)}
										{renderMatch(match, x, y)}
									</g>
								);
							})}
						</g>
					))}
				</svg>
			</SvgWrapper>
		</div>
	);
};

export default SingleEliminationBracket;
