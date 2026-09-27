import { render, screen } from '@testing-library/react';
import { TeamsCreateSlot } from '../TeamsCreateSlot';
import { getAuthSession } from '@/lib/auth';
import { fetchUserTeams } from '@/lib/helpers/fetch-user-team';

jest.mock('@/lib/auth', () => ({ getAuthSession: jest.fn() }));
jest.mock('@/lib/helpers/fetch-user-team', () => ({ fetchUserTeams: jest.fn() }));
jest.mock('@/components/TeamDrawer', () => ({
	__esModule: true,
	default: () => <div data-testid='team-drawer'>Team Drawer</div>,
}));

const NO_TEAMS = { CS2: null, LOL: null };

describe('TeamsCreateSlot', () => {
	beforeEach(() => jest.clearAllMocks());

	it('offers team creation when signed in with no team in this channel', async () => {
		(getAuthSession as jest.Mock).mockResolvedValue({ user: { email: 'test@example.com', id: '123' } });
		(fetchUserTeams as jest.Mock).mockResolvedValue(NO_TEAMS);

		render(await TeamsCreateSlot({ game: 'CS2' }));

		expect(screen.getByTestId('team-drawer')).toBeInTheDocument();
	});

	it('does not offer team creation once the viewer has a team in this channel', async () => {
		(getAuthSession as jest.Mock).mockResolvedValue({ user: { email: 'test@example.com', id: '123' } });
		(fetchUserTeams as jest.Mock).mockResolvedValue({
			CS2: { id: 1, name: 'Alpha', game: 'CS2', logo: null, capitanId: '123' },
			LOL: null,
		});

		const result = await TeamsCreateSlot({ game: 'CS2' });
		expect(result).toBeNull();
	});

	it('does not offer team creation when signed out', async () => {
		(getAuthSession as jest.Mock).mockResolvedValue(null);

		const result = await TeamsCreateSlot({ game: 'CS2' });
		expect(result).toBeNull();
	});
});
