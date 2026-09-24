import { render, screen } from '@testing-library/react';
import Page from '../teams/page';
import { getAuthSession } from '@/lib/auth';
import { fetchUserTeam } from '@/lib/helpers/fetch-user-team';
import { ExtendedCs2Team } from '@/lib/models/team-model';
// Removed the import of jest as it is available globally in the test environment

// Mock the auth session
jest.mock('@/lib/auth', () => ({ getAuthSession: jest.fn() }));

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

// The page reads the DB directly now (no self-HTTP); stub the viewer's-team lookup and the
// streamed card grid (an async server component, which the jsdom renderer can't render).
jest.mock('@/lib/helpers/fetch-user-team', () => ({ fetchUserTeam: jest.fn() }));
jest.mock('../teams/_components/TeamsCards', () => ({
	TeamsCards: () => <div data-testid='teams-cards'>Teams Cards</div>,
	TeamsCardsSkeleton: () => null,
}));

describe('Teams Page', () => {
	beforeEach(() => {
		jest.clearAllMocks();
	});

	it('renders the page title correctly', async () => {
		// Mock session as null (not logged in)
		(getAuthSession as jest.Mock).mockResolvedValue(null);


		// Render the page component
		const page = await Page();
		render(page);

		// Check if the page title is rendered
		expect(screen.getByRole('heading', { level: 1, name: 'Teams' })).toBeInTheDocument();
	});

	it('shows login alert when user is not logged in', async () => {
		// Mock session as null (not logged in)
		(getAuthSession as jest.Mock).mockResolvedValue(null);


		// Render the page component
		const page = await Page();
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

		// Viewer has no team
		(fetchUserTeam as jest.Mock).mockResolvedValue({ team: null });

		// Render the page component
		const page = await Page();
		render(page);

		// Check if team creation option is shown
		expect(screen.getByTestId('team-drawer')).toBeInTheDocument();
	});
});
