import { render, screen } from '@testing-library/react';
import Page from '../teams/page';
import { getAuthSession } from '@/lib/auth';
import { fetchUserTeams } from '@/lib/helpers/fetch-user-team';
import { ExtendedCs2Team } from '@/lib/models/team-model';
// Removed the import of jest as it is available globally in the test environment

// Mock the auth session
jest.mock('@/lib/auth', () => ({ getAuthSession: jest.fn() }));

// The page reads the game filter cookie (next/headers), which only works inside a request scope.
const cookiesGet = jest.fn<{ value: string } | undefined, []>(() => undefined);
jest.mock('next/headers', () => ({ cookies: () => Promise.resolve({ get: cookiesGet }) }));

// Mock the components used in the page
jest.mock('@/components/TeamDrawer', () => ({
	__esModule: true,
	default: () => <div data-testid='team-drawer'>Team Drawer</div>,
}));

jest.mock('@/components/TeamCard', () => ({
	TeamCard: ({ team }: { team: ExtendedCs2Team }) => (
		<div data-testid={`team-card-${team.id}`}>Team Card: {team.name}</div>
	),
}));

jest.mock('@/components/LoginButtons', () => ({
	__esModule: true,
	default: ({ className }: { className?: string }) => (
		<div data-testid='login-buttons' className={className}>
			Login Buttons
		</div>
	),
}));

jest.mock('@/components/FallbackCards', () => ({
	FallbackCards: () => <div data-testid='fallback-cards'>Fallback Cards</div>,
}));

// The page reads the DB directly now (no self-HTTP); stub the viewer's-teams lookup (one per game)
// and the streamed card grid (an async server component, which the jsdom renderer can't render).
jest.mock('@/lib/helpers/fetch-user-team', () => ({ fetchUserTeams: jest.fn() }));
jest.mock('../teams/_components/TeamsCards', () => ({
	TeamsCards: () => <div data-testid='teams-cards'>Teams Cards</div>,
	TeamsCardsSkeleton: () => null,
}));

const NO_TEAMS = { CS2: null, LOL: null };

describe('Teams Page', () => {
	beforeEach(() => {
		jest.clearAllMocks();
		cookiesGet.mockReturnValue(undefined);
	});

	it('renders the page title correctly', async () => {
		// Mock session as null (not logged in)
		(getAuthSession as jest.Mock).mockResolvedValue(null);


		// Render the page component
		const page = await Page({});
		render(page);

		// Check if the page title is rendered
		expect(screen.getByRole('heading', { level: 1, name: 'Teams' })).toBeInTheDocument();
	});

	it('shows login alert when user is not logged in', async () => {
		// Mock session as null (not logged in)
		(getAuthSession as jest.Mock).mockResolvedValue(null);


		// Render the page component
		const page = await Page({});
		render(page);

		// Check if the login alert is shown
		expect(screen.getByText('Sign in to create a team or accept an invite to one.')).toBeInTheDocument();
		expect(screen.getByTestId('login-buttons')).toBeInTheDocument();
	});

	it('shows team creation option when user is logged in but has no team', async () => {
		// Mock session with logged in user
		(getAuthSession as jest.Mock).mockResolvedValue({
			user: { email: 'test@example.com', id: '123' },
		});

		// Viewer has no team in either game
		(fetchUserTeams as jest.Mock).mockResolvedValue(NO_TEAMS);

		// Render the page component
		const page = await Page({});
		render(page);

		// Check if team creation option is shown
		expect(screen.getByTestId('team-drawer')).toBeInTheDocument();
	});

	it('does not offer team creation once the viewer has a team in the active channel', async () => {
		(getAuthSession as jest.Mock).mockResolvedValue({ user: { email: 'test@example.com', id: '123' } });
		(fetchUserTeams as jest.Mock).mockResolvedValue({
			CS2: { id: 1, name: 'Alpha', game: 'CS2', logo: null, capitanId: '123' },
			LOL: { id: 2, name: 'Bravo', game: 'LOL', logo: null, capitanId: '123' },
		});

		// No ?game= and no cookie: defaults to the CS2 channel.
		const page = await Page({});
		render(page);

		expect(screen.queryByTestId('team-drawer')).not.toBeInTheDocument();
		expect(screen.getByText('Alpha')).toBeInTheDocument();
		expect(screen.queryByText('Bravo')).not.toBeInTheDocument();
	});

	it('re-scopes to the LoL channel remembered in the game filter cookie', async () => {
		(getAuthSession as jest.Mock).mockResolvedValue({ user: { email: 'test@example.com', id: '123' } });
		(fetchUserTeams as jest.Mock).mockResolvedValue({
			CS2: { id: 1, name: 'Alpha', game: 'CS2', logo: null, capitanId: '123' },
			LOL: { id: 2, name: 'Bravo', game: 'LOL', logo: null, capitanId: '123' },
		});
		cookiesGet.mockReturnValue({ value: 'lol' });

		const page = await Page({});
		render(page);

		expect(screen.getByText('Bravo')).toBeInTheDocument();
		expect(screen.queryByText('Alpha')).not.toBeInTheDocument();
	});
});
