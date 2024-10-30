import { getAuthSession } from '@/lib/auth';
import { NextResponse } from 'next/server';
import { db } from '@/lib/db';

const DISCORD_GUILD_ID = process.env.DISCORD_GUILD_ID;
const BOT_TOKEN = process.env.DISCORD_BOT_TOKEN;

export async function POST() {
    const session = await getAuthSession();

    if (!session || !session.user?.email) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const user = await db.user.findUnique({
        where: { email: session.user.email },
        include: { discord: true },
    });

    if (!user || !user.discord) {
        return NextResponse.json({ error: 'User not found or Discord account not linked' }, { status: 404 });
    }

    try {
        const joinResponse = await fetch(
            `https://discord.com/api/v10/guilds/${DISCORD_GUILD_ID}/members/${user.discord.discordId}`,
            {
                method: "PUT",
                headers: {
                    Authorization: `Bot ${BOT_TOKEN}`,
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    access_token: session.user.discordId,
                }),
            }
        );

        if (!joinResponse.ok) {
            throw new Error("Failed to add user to server");
        }

        return NextResponse.json({ message: "User joined server successfully" }, { status: 200 });
    } catch (error) {
        console.error("Error joining Discord server:", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}
