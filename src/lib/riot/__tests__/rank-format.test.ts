import { formatLolRank, type LolRank } from '../rank-format';

const rank = (over: Partial<LolRank> = {}): LolRank => ({ tier: 'GOLD', division: 'II', leaguePoints: 42, wins: 10, losses: 8, ...over });

describe('formatLolRank', () => {
	it('formats a tiered rank with its division', () => {
		expect(formatLolRank(rank())).toBe('Gold II');
	});

	it('drops the division for the apex tiers', () => {
		expect(formatLolRank(rank({ tier: 'CHALLENGER', division: '' }))).toBe('Challenger');
		expect(formatLolRank(rank({ tier: 'GRANDMASTER', division: '' }))).toBe('Grandmaster');
		expect(formatLolRank(rank({ tier: 'MASTER', division: '' }))).toBe('Master');
	});

	it('title-cases the tier', () => {
		expect(formatLolRank(rank({ tier: 'IRON', division: 'IV' }))).toBe('Iron IV');
	});
});
