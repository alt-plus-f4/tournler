import { render, screen } from '@testing-library/react';
import { TeamsBanner } from '../TeamsBanner';
import { getAuthSession } from '@/lib/auth';
import { fetchUserTeams } from '@/lib/helpers/fetch-user-team';

jest.mock('@/lib/auth', () => ({ getAuthSession: jest.fn() }));
jest.mock('@/lib/helpers/fetch-user-team', () => ({ fetchUserTeams: jest.fn() }));
jest.mock('@/components/LoginButtons', () => ({
	__esModule: true,
	default: ({ className }: { className?: string }) => (
		<div data-testid='login-buttons' className={className}>
			Login Buttons
		</div>
	),
}));

const NO_TEAMS = { CS2: null, LOL: null };

describe('TeamsBanner', () => {
	beforeEach(() => jest.clearAllMocks());

	it('shows login alert when user is not logged in', async () => {
		(getAuthSession as jest.Mock).mockResolvedValue(null);

		render(await TeamsBanner({ game: 'CS2' }));

		expect(screen.getByText('Sign in to create a team or accept an invite to one.')).toBeInTheDocument();
		expect(screen.getByTestId('login-buttons')).toBeInTheDocument();
	});

	it('names the game and shows nothing to join when the viewer has no team in it', async () => {
		(getAuthSession as jest.Mock).mockResolvedValue({ user: { email: 'test@example.com', id: '123' } });
		(fetchUserTeams as jest.Mock).mockResolvedValue(NO_TEAMS);

		render(await TeamsBanner({ game: 'CS2' }));

		expect(screen.getByText(/No CS2 team yet/)).toBeInTheDocument();
	});

	it('names the viewer’s team in the active channel only', async () => {
		(getAuthSession as jest.Mock).mockResolvedValue({ user: { email: 'test@example.com', id: '123' } });
		(fetchUserTeams as jest.Mock).mockResolvedValue({
			CS2: { id: 1, name: 'Alpha', game: 'CS2', logo: null, capitanId: '123' },
			LOL: { id: 2, name: 'Bravo', game: 'LOL', logo: null, capitanId: '123' },
		});

		const { unmount } = render(await TeamsBanner({ game: 'CS2' }));
		expect(screen.getByText('Alpha')).toBeInTheDocument();
		expect(screen.queryByText('Bravo')).not.toBeInTheDocument();
		unmount();

		render(await TeamsBanner({ game: 'LOL' }));
		expect(screen.getByText('Bravo')).toBeInTheDocument();
	});
});
