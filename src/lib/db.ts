import { PrismaClient } from '@prisma/client';
import 'server-only';

declare global {
	// eslint-disable-next-line no-var
	var cachedPrisma: PrismaClient;
}

const prismaClientSingleton = () => {
	return new PrismaClient();
};

declare global {
	// eslint-disable-next-line no-var
	var prisma: ReturnType<typeof prismaClientSingleton>;
}

const db = globalThis.prisma ?? prismaClientSingleton();

if (process.env.NODE_ENV !== 'production') globalThis.prisma = db;

export { db };
