import { render, screen } from '@testing-library/react';
import { FeaturedTournamentCard } from '../FeaturedTournamentCard';

const mockProps = {
	id: 1,
	name: 'Featured Tournament',
	startDate: '2023-12-31T12:00:00Z',
	bannerUrl: '/featured-banner.jpg',
	prizePool: 50000,
	location: 'Featured Location',
};

describe('FeaturedTournamentCard', () => {
	it('renders tournament information correctly', () => {
		render(<FeaturedTournamentCard {...mockProps} />);

		// Check if tournament name is rendered
		expect(screen.getByText('Featured Tournament')).toBeInTheDocument();

		// Check if location is rendered
		expect(screen.getByText('Featured Location')).toBeInTheDocument();

		// Check if date is rendered (formatted)
		expect(screen.getByText(/December\s+31,\s+2023/)).toBeInTheDocument();

		// Check if prize pool is rendered (formatted)
		expect(screen.getByText('$50,000')).toBeInTheDocument();

		// The whole card is the single link — no fake nested "Read more" link
		expect(screen.queryByText('Read more')).not.toBeInTheDocument();
	});

	it('links to the correct tournament page', () => {
		render(<FeaturedTournamentCard {...mockProps} />);

		// Check if the link points to the correct tournament
		const link = screen.getByRole('link');
		expect(link).toHaveAttribute('href', '/tournaments/1');
	});

	it('has the correct hover effects', () => {
		render(<FeaturedTournamentCard {...mockProps} />);

		// Check if the card has hover effect classes
		const card = screen.getByRole('link');
		expect(card).toHaveClass('motion-safe:hover:scale-[1.02]');
	});
});
