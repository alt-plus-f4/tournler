// eslint-disable-next-line @typescript-eslint/no-unused-vars
import NextAuth from 'next-auth';

declare module 'next-auth' {
	interface Session {
		user: {
			id: string;
			bio?: string | null;
			name?: string | null;
			email?: string | null;
			image?: string | null;
			discordId?: string | null;
		};
	}
}
