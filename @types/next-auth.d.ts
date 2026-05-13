// eslint-disable-next-line @typescript-eslint/no-unused-vars
import NextAuth from 'next-auth';
import { UserRole } from '@prisma/client';

declare module 'next-auth' {
	interface Session {
		user: {
			id: string;
			bio?: string | null;
			name?: string | null;
			email?: string | null;
			image?: string | null;
			discordId?: string | null;
			role?: UserRole;
		};
	}
}
