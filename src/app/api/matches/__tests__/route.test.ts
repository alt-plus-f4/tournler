/**
 * @jest-environment node
 *
 * GET /api/matches/[matchId] is public (no session required), but a live match's game server
 * connect password must only reach an organizer/admin or one of the two rostered sides — everyone
 * else gets `gameServer.password: null`. See the comment above `canSeePassword` in ../route.ts.
 */
jest.mock('@/lib/auth', () => ({ getAuthSession: jest.fn() }));
jest.mock('@/lib/helpers/permissions', () => ({ userHasPermission: jest.fn() }));
jest.mock('@/lib/helpers/player-flair', () => ({
	playerFlairSelect: {},
	flairMapper: jest.fn(async () => (user: { id: string }) => user),
}));
jest.mock('@/lib/db', () => ({ db: { matches: { findUnique: jest.fn() } } }));

import { db } from '@/lib/db';
import { getAuthSession } from '@/lib/auth';
import { userHasPermission } from '@/lib/helpers/permissions';
import { GET } from '../[matchId]/route';

const rosteredPlayer = { id: 'rostered-1', name: 'Rostered Player', image: null, createdAt: new Date() };
const otherPlayer = { id: 'someone-else', name: 'Someone Else', image: null, createdAt: new Date() };

const baseMatch = {
	id: 1,
	isPickup: false,
	tournament: { id: 1, name: 'Test Cup', organizerId: 'organizer-1', bestOf: 3 },
	teamA: { id: 10, name: 'Team A', capitanId: rosteredPlayer.id, members: [rosteredPlayer] },
	teamB: { id: 11, name: 'Team B', capitanId: otherPlayer.id, members: [] },
	winner: null,
	gameServer: { id: 1, matchId: 1, connectIp: '1.2.3.4', port: 27015, password: 'super-secret-rcon-password', status: 'RUNNING' },
	participants: [],
	mapActions: [],
	maps: [],
	playerStats: [],
	bestOf: null,
};

function request() {
	return new Request('http://localhost/api/matches/1');
}

beforeEach(() => {
	jest.clearAllMocks();
	(db.matches.findUnique as jest.Mock).mockResolvedValue(baseMatch);
});

describe('GET /api/matches/[matchId] — game server password exposure', () => {
	it('strips the password for an unauthenticated viewer', async () => {
		(getAuthSession as jest.Mock).mockResolvedValue(null);

		const res = await GET(request(), { params: Promise.resolve({ matchId: '1' }) });
		const { match } = await res.json();

		expect(match.gameServer.password).toBeNull();
		expect(match.gameServer.connectIp).toBe('1.2.3.4');
	});

	it('strips the password for a signed-in viewer with no relation to the match', async () => {
		(getAuthSession as jest.Mock).mockResolvedValue({ user: { id: 'random-viewer' } });
		(userHasPermission as jest.Mock).mockResolvedValue(false);

		const res = await GET(request(), { params: Promise.resolve({ matchId: '1' }) });
		const { match } = await res.json();

		expect(match.gameServer.password).toBeNull();
	});

	it('includes the password for the tournament organizer', async () => {
		(getAuthSession as jest.Mock).mockResolvedValue({ user: { id: 'organizer-1' } });
		(userHasPermission as jest.Mock).mockResolvedValue(false);

		const res = await GET(request(), { params: Promise.resolve({ matchId: '1' }) });
		const { match } = await res.json();

		expect(match.gameServer.password).toBe('super-secret-rcon-password');
	});

	it('includes the password for a rostered player', async () => {
		(getAuthSession as jest.Mock).mockResolvedValue({ user: { id: rosteredPlayer.id } });
		(userHasPermission as jest.Mock).mockResolvedValue(false);

		const res = await GET(request(), { params: Promise.resolve({ matchId: '1' }) });
		const { match } = await res.json();

		expect(match.gameServer.password).toBe('super-secret-rcon-password');
	});

	it('includes the password for a user with matches:manage permission', async () => {
		(getAuthSession as jest.Mock).mockResolvedValue({ user: { id: 'staff-1' } });
		(userHasPermission as jest.Mock).mockResolvedValue(true);

		const res = await GET(request(), { params: Promise.resolve({ matchId: '1' }) });
		const { match } = await res.json();

		expect(match.gameServer.password).toBe('super-secret-rcon-password');
	});
});
