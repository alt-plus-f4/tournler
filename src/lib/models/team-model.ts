import { Cs2Team } from '@prisma/client';
import { ExtendedUser } from './user-model';
import type { PlayerFlair } from './player-flair';

/** A roster member; `verified`/`faceitLevel` are present where the API attached them (team page, tournament page). */
export type TeamMember = ExtendedUser & Partial<PlayerFlair>;

export interface ExtendedCs2Team extends Cs2Team {
	members: TeamMember[];
}
