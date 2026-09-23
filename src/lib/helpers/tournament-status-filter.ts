import { TournamentStatus } from '@prisma/client';

const statusMap: { [key: number]: TournamentStatus } = {
	0: TournamentStatus.UPCOMING,
	1: TournamentStatus.ONGOING,
	2: TournamentStatus.COMPLETED,
};

/**
 * `?status=` filter shared by GET /api/tournaments and /api/tournaments/count so the list and
 * its page count always agree. Accepts enum names, "ACTIVE"/10 (upcoming + ongoing), or 0-2.
 */
export function parseStatusFilter(rawStatus: string | null): TournamentStatus[] | null {
	if (!rawStatus) {
		return null;
	}

	const normalized = rawStatus.trim().toUpperCase();
	if (normalized === 'ACTIVE') {
		return [TournamentStatus.UPCOMING, TournamentStatus.ONGOING];
	}

	if (normalized in TournamentStatus) {
		return [TournamentStatus[normalized as keyof typeof TournamentStatus]];
	}

	const statusInt = Number.parseInt(rawStatus, 10);
	if (!Number.isNaN(statusInt)) {
		if (statusInt === 10) {
			return [TournamentStatus.UPCOMING, TournamentStatus.ONGOING];
		}

		if (statusMap[statusInt]) {
			return [statusMap[statusInt]];
		}
	}

	return [];
}
