import { User } from './user-model';
import { db } from '@/lib/db';
import { PrismaAdapter } from '@next-auth/prisma-adapter';
import { NextAuthOptions, getServerSession } from 'next-auth';
import EmailProvider from 'next-auth/providers/email';
import DiscordProvider from 'next-auth/providers/discord';
import nodemailer from 'nodemailer';

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
    }),
  ],
  callbacks: {
    async session({ token, session }) {
      if (token) {
        session.user = {
          id: token.id || '',
          name: token.name,
          email: token.email,
          image: token.picture,
        } as User;
      }

      const discordAccount = await db.discordAccount.findUnique({
        where: { userId: token.id as string | undefined },
      });

      if (discordAccount) {
        // user name, image into session
      }

      return session;
    },

    async jwt({ token, account }) {
      if (account && account.provider === 'discord') {
        const discordId = account.providerAccountId;
        const existingDiscordAccount = await db.discordAccount.findUnique({
          where: { discordId },
        });

        if (!existingDiscordAccount && token.id) {
          await db.discordAccount.create({
            data: {
              userId: token.id as string,
              discordId,
            },
          });
        }
      }

      let dbUser = await db.user.findFirst({
        where: {
          email: token.email || '',
        },
      });

      if (!dbUser && token.email) {
        dbUser = await db.user.create({
          data: {
            email: token.email,
            name: token.name || '',
            image: token.picture || '',
            emailVerified: new Date(),
          },
        });
      }

      if (dbUser) {
        token.id = dbUser.id;
        token.name = dbUser.name;
        token.email = dbUser.email;
        token.picture = dbUser.image;
      }

      return token;
    },

    async signIn({ user, account }) {
      if (account?.provider === 'discord') {
        const discordId = account.providerAccountId;
        const existingDiscordAccount = await db.discordAccount.findUnique({
          where: { discordId },
        });

        if (!existingDiscordAccount) {
          await db.discordAccount.create({
            data: {
              userId: user.id,
              discordId,
            },
          });
        }
      }
      return true;
    },

    redirect() {
      return '/';
    },
  },
};

export const getAuthSession = () => getServerSession(authOptions);
