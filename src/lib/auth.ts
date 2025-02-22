import { PrismaAdapter } from '@next-auth/prisma-adapter';
import { NextAuthOptions, getServerSession } from 'next-auth';
import EmailProvider from 'next-auth/providers/email';
import DiscordProvider from 'next-auth/providers/discord';
// import nodemailer, { createTransport } from 'nodemailer';
import { createTransport } from 'nodemailer';
import { db } from '@/lib/db';

// const transporter = createTransport({
//   host: process.env.EMAIL_SERVER_HOST!,
//   port: parseInt(process.env.EMAIL_SERVER_PORT!),
//   auth: {
//     user: process.env.EMAIL_SERVER_USER!,
//     pass: process.env.EMAIL_SERVER_PASSWORD!,
//   },
// });

const sendVerificationRequest = async ({
	identifier,
	url,
	provider,
	theme,
}: {
	identifier: string;
	url: string;
	provider: { from: string; server: any };
	theme: any;
}) => {
	const { host } = new URL(url);
	const transport = createTransport(provider.server);
	const result = await transport.sendMail({
		to: identifier,
		from: provider.from,
		subject: `Sign in to ${host}`,
		text: text({ url, host }),
		html: html({ url, theme }),
	});
	const failed = result.rejected.filter(Boolean);
	if (failed.length) {
		throw new Error(`Email(s) (${failed.join(', ')}) could not be sent`);
	}
};

// function html({ url, host, theme }: { url: string; host: string; theme: any }) {
function html({ url, theme }: { url: string; theme: any }) {
	// const escapedHost = host.replace(/\./g, "&#8203;.");

	const brandColor = theme.brandColor || '#2f3136';
	const color = {
		background: '#f9f9f9',
		text: '#444',
		mainBackground: '#fff',
		buttonBackground: brandColor,
		buttonBorder: brandColor,
		buttonText: theme.buttonText || '#fff',
	};

	return `
<body style="background: ${color.background};">
	<table width="100%" border="0" cellspacing="20" cellpadding="0"
		style="background: ${color.mainBackground}; max-width: 600px; margin: auto; border-radius: 10px;">
		<tr>
			<td align="center"
				style="padding: 10px 0px; font-size: 22px; font-family: Helvetica, Arial, sans-serif; color: ${color.text};">
				Sign in to <strong>Tournler</strong>
			</td>
		</tr>
		<tr>
			<td align="center" style="padding: 20px 0;">
				<table border="0" cellspacing="0" cellpadding="0">
					<tr>
						<td align="center" style="border-radius: 5px;" bgcolor="${color.buttonBackground}"><a href="${url}"
								target="_blank"
								style="font-size: 18px; font-family: Helvetica, Arial, sans-serif; color: ${color.buttonText}; text-decoration: none; border-radius: 5px; padding: 10px 20px; border: 1px solid ${color.buttonBorder}; display: inline-block; font-weight: bold;">Sign
								in</a></td>
					</tr>
				</table>
			</td>
		</tr>
		<tr>
			<td align="center"
				style="padding: 0px 0px 10px 0px; font-size: 16px; line-height: 22px; font-family: Helvetica, Arial, sans-serif; color: ${color.text};">
				If you did not request this email you can safely ignore it.
			</td>
		</tr>
	</table>
</body>
`;
}

function text({ url, host }: { url: string; host: string }) {
	return `Sign in to ${host}\n${url}\n\n`;
}

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
			allowDangerousEmailAccountLinking: false,
		}),
	],
	callbacks: {
		async signIn({ account }) {
			if (account?.provider === 'discord') {
				const currentSession = await getServerSession(authOptions);
				if (!currentSession) {
					console.error('No session found during sign-in.');
					return false;
				}

				const user = currentSession.user;

				const discordId = account.providerAccountId;
				const accessToken = account.access_token || '';

				if (!user?.id) {
					console.error('User ID is missing during Discord sign-in.');
					return false;
				}

				// Check if the Discord account already exists
				let discordAccount = await db.discordAccount.findUnique({
					where: { discordId },
				});

				if (!discordAccount) {
					// Create Discord account entry and link to the current user
					discordAccount = await db.discordAccount.create({
						data: {
							userId: user.id,
							discordId,
							accessToken,
						},
					});
				} else {
					// Update the existing Discord account entry to link to the current user
					discordAccount = await db.discordAccount.update({
						where: { discordId },
						data: {
							userId: user.id, // Reassign to the current user
							accessToken,
						},
					});
				}

				// Ensure the User model is updated with the linked Discord account
				await db.user.update({
					where: { id: user.id },
					data: {
						discord: {
							connect: { discordId: discordAccount.discordId },
						},
					},
				});
			}

			return true;
		},

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
			if (account?.provider === 'email') {
				if (user) {
					token.id = user.id;
				} else if (token.email) {
					let dbUser = await db.user.findUnique({
						where: { email: token.email },
					});

					if (!dbUser) {
						dbUser = await db.user.create({
							data: {
								email: token.email,
								name: token.name || '',
								image: token.picture || '',
								emailVerified: new Date(),
							},
						});
					}

					token.id = dbUser.id;
				}
			}

			if (account?.provider === 'discord') {
				const discordId = account.providerAccountId;
				const accessToken = account.access_token || '';

				if (user?.id) {
					const existingDiscordAccount =
						await db.discordAccount.findUnique({
							where: { discordId },
						});

					if (!existingDiscordAccount) {
						await db.discordAccount.create({
							data: {
								userId: user.id,
								discordId,
								accessToken,
							},
						});
					} else {
						await db.discordAccount.update({
							where: { discordId },
							data: {
								userId: user.id,
								accessToken,
							},
						});
					}

					token.discordId = discordId;
					token.accessToken = accessToken;
				}
			}

			if (account?.provider === 'steam') {
				const steamId = account.providerAccountId;

				if (user?.id) {
					const existingSteamAccount =
						await db.steamAccount.findUnique({
							where: { steamId },
						});

					if (!existingSteamAccount) {
						await db.steamAccount.create({
							data: {
								userId: user.id,
								steamId,
							},
						});
					}
				}

				token.steamId = steamId;
			}

			return token;
		},
	},
};

export const getAuthSession = () => getServerSession(authOptions);
