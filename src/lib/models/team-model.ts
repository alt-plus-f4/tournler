import { Cs2Team} from '@prisma/client';
import { ExtendedUser } from './user-model';

export interface ExtendedCs2Team extends Cs2Team {
  members: ExtendedUser[];
}
