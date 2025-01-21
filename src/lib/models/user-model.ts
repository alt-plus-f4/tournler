import { Cs2Team, Cs2TeamInvitation, User } from "@prisma/client";

export interface ExtendedUser extends User {
  cs2Team?: Cs2Team | null;
  cs2TeamCaptain?: Cs2Team | null;
  cs2TeamInvitations: Cs2TeamInvitation[];
}