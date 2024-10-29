import { PrismaAdapter } from "@next-auth/prisma-adapter";
import { NextAuthOptions, getServerSession } from "next-auth";
import EmailProvider from "next-auth/providers/email";
import DiscordProvider from "next-auth/providers/discord";
import nodemailer from "nodemailer";
import { db } from "@/lib/db"; // Adjust the import based on your project structure

// Define the User type
interface User {
  id: string;
  name?: string | null;
  email?: string | null;
  image?: string | null;
  discordName?: string | null;
  discordImage?: string | null;
}

// Configure nodemailer
const transporter = nodemailer.createTransport({
  host: process.env.EMAIL_SERVER_HOST!,
  port: parseInt(process.env.EMAIL_SERVER_PORT!),
  auth: {
    user: process.env.EMAIL_SERVER_USER!,
    pass: process.env.EMAIL_SERVER_PASSWORD!,
  },
});

// Send verification request
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

// NextAuth options
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
          discordName: token.discordName,
          discordImage: token.discordImage,
        } as User;
      }

      return session;
    },

    async jwt({ token, account, profile }) {
      if (account?.provider === 'discord') {
        const discordId = account.providerAccountId;
        const discordName = profile?.username as string;
        const discordImage = profile?.image_url as string;

        const existingDiscordAccount = await db.discordAccount.findUnique({
          where: { discordId },
        });

        if (!existingDiscordAccount && token.id) {
          await db.discordAccount.create({
            data: {
              userId: token.id as string,
              discordId,
              discordName,
              discordImage,
            },
          });
        } else if (existingDiscordAccount) {
          await db.discordAccount.update({
            where: { discordId },
            data: { discordName, discordImage },
          });
        }

        token.discordName = discordName;
        token.discordImage = discordImage;
      }

      // Check if user exists in db
      let dbUser = await db.user.findUnique({
        where: { email: token.email || '' },
      });

      // Create user if none found
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

    async signIn({ user, account, profile }) {
      if (account?.provider === 'discord') {
        const discordId = account.providerAccountId;
        const discordName = profile?.username as string;
        const discordImage = profile?.image_url as string;

        const existingDiscordAccount = await db.discordAccount.findUnique({
          where: { discordId },
        });

        if (!existingDiscordAccount) {
          await db.discordAccount.create({
            data: {
              userId: user.id,
              discordId,
              discordName,
              discordImage,
            },
          });
        } else {
          await db.discordAccount.update({
            where: { discordId },
            data: { discordName, discordImage },
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