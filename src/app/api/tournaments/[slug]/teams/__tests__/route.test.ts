/**
 * @jest-environment node
 *
 * POST /api/tournaments/[slug]/teams: the eligibility gate is enforced here, not just shown in the
 * UI (see src/app/tournaments/[slug]/_components/RegistrationGate.tsx). A team that isn't eligible
 * for the tournament's game — see teamEligibility, src/lib/games/eligibility.ts — must be refused
 * with 409 and `{ reason, missing }`, in addition to the existing status/capacity checks.
 */
jest.mock('@/lib/auth', () => ({ getAuthSession: jest.fn() }));
jest.mock('@/lib/helpers/permissions', () => ({ userHasPermission: jest.fn() }));
jest.mock('@/lib/games/eligibility', () => ({ teamEligibility: jest.fn() }));
jest.mock('@/lib/db', () => ({
	db: {
		cs2Team: { findUnique: jest.fn() },
		cs2Tournament: { findUnique: jest.fn(), update: jest.fn() },
	},
}));

import { db } from '@/lib/db';
import { getAuthSession } from '@/lib/auth';
import { userHasPermission } from '@/lib/helpers/permissions';
import { teamEligibility } from '@/lib/games/eligibility';
import { POST } from '../route';

const session = { user: { id: 'viewer-1' } };
const team = { id: 5, capitanId: 'viewer-1', members: [{ id: 'viewer-1' }] };
const openTournament = { teams: [], teamCapacity: 8, status: 'UPCOMING', startDate: new Date(Date.now() + 60 * 60 * 1000), game: 'LOL' };

function request(body: unknown) {
	return new Request('http://localhost/api/tournaments/1/teams', { method: 'POST', body: JSON.stringify(body) });
}

beforeEach(() => {
	jest.clearAllMocks();
	(getAuthSession as jest.Mock).mockResolvedValue(session);
	(userHasPermission as jest.Mock).mockResolvedValue(false);
	(db.cs2Team.findUnique as jest.Mock).mockResolvedValue(team);
	(db.cs2Tournament.findUnique as jest.Mock).mockResolvedValue(openTournament);
});

describe('POST /api/tournaments/[slug]/teams — eligibility', () => {
	it('refuses an ineligible team with 409 and { reason, missing }', async () => {
		(teamEligibility as jest.Mock).mockResolvedValue({
			ok: false,
			reason: 'Every player needs a linked Riot ID to register.',
			missing: [{ id: 'viewer-1', name: 'Viewer', status: 'missing' }],
		});

		const res = await POST(request({ teamId: team.id }), { params: Promise.resolve({ slug: '1' }) });
		const payload = await res.json();

		expect(res.status).toBe(409);
		expect(payload.reason).toBe('Every player needs a linked Riot ID to register.');
		expect(payload.missing).toEqual([{ id: 'viewer-1', name: 'Viewer', status: 'missing' }]);
		expect(teamEligibility).toHaveBeenCalledWith(team.id, 'LOL');
		expect(db.cs2Tournament.update).not.toHaveBeenCalled();
	});

	it('registers an eligible team (200) and never calls the eligibility check for a different team/game combination twice', async () => {
		(teamEligibility as jest.Mock).mockResolvedValue({ ok: true });
		(db.cs2Tournament.update as jest.Mock).mockResolvedValue({});

		const res = await POST(request({ teamId: team.id }), { params: Promise.resolve({ slug: '1' }) });

		expect(res.status).toBe(200);
		expect(teamEligibility).toHaveBeenCalledWith(team.id, 'LOL');
		expect(db.cs2Tournament.update).toHaveBeenCalledTimes(1);
	});

	it('checks eligibility against a CS2 tournament’s game, not a hardcoded one', async () => {
		(db.cs2Tournament.findUnique as jest.Mock).mockResolvedValue({ ...openTournament, game: 'CS2' });
		(teamEligibility as jest.Mock).mockResolvedValue({ ok: false, reason: 'Every player needs a linked Steam account to register.', missing: [] });

		const res = await POST(request({ teamId: team.id }), { params: Promise.resolve({ slug: '1' }) });

		expect(res.status).toBe(409);
		expect(teamEligibility).toHaveBeenCalledWith(team.id, 'CS2');
	});
});
