interface Participant {
	id: number;
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

export const emptyBracket: Match[] = [
  // Quarter Finals (Round 1)
  {
    id: 1,
    nextMatchId: 5,
    participants: [
      { id: 1, name: 'TBD', score: null },
      { id: 2, name: 'TBD', score: null },
    ],
    winner: null,
    status: 'PENDING',
  },
  {
    id: 2,
    nextMatchId: 5,
    participants: [
      { id: 3, name: 'TBD', score: null },
      { id: 4, name: 'TBD', score: null },
    ],
    winner: null,
    status: 'PENDING',
  },
  {
    id: 3,
    nextMatchId: 6,
    participants: [
      { id: 5, name: 'TBD', score: null },
      { id: 6, name: 'TBD', score: null },
    ],
    winner: null,
    status: 'PENDING',
  },
  {
    id: 4,
    nextMatchId: 6,
    participants: [
      { id: 7, name: 'TBD', score: null },
      { id: 8, name: 'TBD', score: null },
    ],
    winner: null,
    status: 'PENDING',
  },
  // Semi Finals (Round 2)
  {
    id: 5,
    nextMatchId: 7,
    participants: [
      { id: 9, name: 'TBD', score: null },
      { id: 10, name: 'TBD', score: null },
    ],
    winner: null,
    status: 'PENDING',
  },
  {
    id: 6,
    nextMatchId: 7,
    participants: [
      { id: 11, name: 'TBD', score: null },
      { id: 12, name: 'TBD', score: null },
    ],
    winner: null,
    status: 'PENDING',
  },
  // Finals (Round 3)
  {
    id: 7,
    participants: [
      { id: 13, name: 'TBD', score: null },
      { id: 14, name: 'TBD', score: null },
    ],
    winner: null,
    status: 'PENDING',
  },
];

export const sampleMatches: Match[] = [
	// Quarter Finals (Round 1)
	{
		id: 1,
		nextMatchId: 5,
		participants: [
			{ id: 1, name: 'NAVI', score: 2 },
			{ id: 2, name: 'Vitality', score: 0 },
		],
		winner: { id: 1, name: 'NAVI', score: 2 },
		status: 'COMPLETED',
	},
	{
		id: 2,
		nextMatchId: 5,
		participants: [
			{ id: 3, name: 'FaZe', score: 2 },
			{ id: 4, name: 'G2', score: 1 },
		],
		winner: { id: 3, name: 'FaZe', score: 2 },
		status: 'COMPLETED',
	},
	{
		id: 3,
		nextMatchId: 6,
		participants: [
			{ id: 5, name: 'Liquid', score: 2 },
			{ id: 6, name: 'Cloud9', score: 0 },
		],
		winner: { id: 5, name: 'Liquid', score: 2 },
		status: 'COMPLETED',
	},
	{
		id: 4,
		nextMatchId: 6,
		participants: [
			{ id: 7, name: 'Astralis', score: 1 },
			{ id: 8, name: 'Virtus.pro', score: 2 },
		],
		winner: { id: 8, name: 'Virtus.pro', score: 2 },
		status: 'COMPLETED',
	},
	// Semi Finals (Round 2)
	{
		id: 5,
		nextMatchId: 7,
		participants: [
			{ id: 1, name: 'NAVI', score: 2 },
			{ id: 3, name: 'FaZe', score: 1 },
		],
		winner: { id: 1, name: 'NAVI', score: 2 },
		status: 'COMPLETED',
	},
	{
		id: 6,
		nextMatchId: 7,
		participants: [
			{ id: 5, name: 'Liquid', score: 0 },
			{ id: 8, name: 'Virtus.pro', score: 2 },
		],
		winner: { id: 8, name: 'Virtus.pro', score: 2 },
		status: 'COMPLETED',
	},
	// Finals (Round 3)
	{
		id: 7,
		participants: [
			{ id: 1, name: 'NAVI', score: 2 },
			{ id: 8, name: 'Virtus.pro', score: 1 },
		],
		winner: { id: 1, name: 'NAVI', score: 2 },
		status: 'COMPLETED',
	},
];
