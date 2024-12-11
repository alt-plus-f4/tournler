import { PrismaAdapter } from '@next-auth/prisma-adapter';
import { NextAuthOptions, getServerSession } from 'next-auth';
import EmailProvider from 'next-auth/providers/email';
import DiscordProvider from 'next-auth/providers/discord';
import nodemailer from 'nodemailer';
import { db } from '@/lib/db';

const transporter = nodemailer.createTransport({
	host: process.env.EMAIL_SERVER_HOST!,
	port: parseInt(process.env.EMAIL_SERVER_PORT!),
	auth: {
		user: process.env.EMAIL_SERVER_USER!,
		pass: process.env.EMAIL_SERVER_PASSWORD!,
	},
});

const sendVerificationRequest = ({
	identifier,
	url,
	provider,
}: {
	identifier: string;
	url: string;
	provider: { from: string };
}) => {
	const { host } = new URL(url);
	transporter.sendMail({
		from: provider.from,
		to: identifier,
		subject: `Sign in to ${host}`,
		html: `<p>Click <a href="${url}">here</a> to sign in to ${host}</p>`,
	});
};

export const authOptions: NextAuthOptions = {
	adapter: PrismaAdapter(db),
	session: {
		strategy: 'jwt',
	},
	pages: {
		signIn: '/sign-in',
	},
	providers: [
		EmailProvider({
			server: {
				host: process.env.EMAIL_SERVER_HOST!,
				port: parseInt(process.env.EMAIL_SERVER_PORT!),
				auth: {
					user: process.env.EMAIL_SERVER_USER!,
					pass: process.env.EMAIL_SERVER_PASSWORD!,
				},
			},
			from: process.env.EMAIL_FROM!,
			sendVerificationRequest,
		}),
		DiscordProvider({
			clientId: process.env.DISCORD_CLIENT_ID!,
			clientSecret: process.env.DISCORD_CLIENT_SECRET!,
			allowDangerousEmailAccountLinking: true,
		}),
	],
	callbacks: {
		async session({ token, session }) {
			if (token) {
				session.user = {
					id: (token.id as string) || '',
					name: (token.name as string) || '',
					email: token.email || '',
					image: token.picture || '',
					discordId: (token.discordId as string) || '',
				};
			}
			return session;
		},

		async jwt({ token, account, user }) {
			if (account?.provider === 'steam') {
				console.log('Steam');
				token.steamId = account.providerAccountId;
			}

			if (account?.provider === 'discord') {
				console.log('Discord: ', account);
				const discordId = account.providerAccountId;
				const accessToken = account.access_token || '';

				if (user?.id) {
					console.log('User ID', user.id);
					const existingDiscordAccount =
						await db.discordAccount.findUnique({
							where: { discordId },
						});

					if (!existingDiscordAccount) {
						console.log('Creating Discord Account');
						await db.discordAccount.create({
							data: {
								userId: user.id,
								discordId,
								accessToken,
							},
						});
					}
				}

				token.discordId = discordId;
				token.accessToken = accessToken;
			}

			if (user) {
				console.log('User: ', user);
				token.id = user.id;
			} else if (token.email) {
				let dbUser = await db.user.findUnique({
					where: { email: token.email },
				});

				if (!dbUser) {
					dbUser = await db.user.create({
						data: {
							email: token.email,
							name: (token.name as string) || '',
							image: token.picture || '',
							emailVerified: new Date(),
						},
					});
				}

				token.id = dbUser.id;
			}

			return token;
		},
	},
};

export const getAuthSession = () => getServerSession(authOptions);
