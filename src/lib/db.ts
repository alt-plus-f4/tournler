import { PrismaClient } from '@prisma/client';
import 'server-only';
import { MODEL_TAGS, invalidateTags } from '@/lib/cache/tags';

const WRITE_OPERATIONS = new Set(['create', 'createMany', 'createManyAndReturn', 'update', 'updateMany', 'updateManyAndReturn', 'upsert', 'delete', 'deleteMany']);

const createBaseClient = () => new PrismaClient();

/**
 * Every write through `db` invalidates the cache domains of the model it touched (MODEL_TAGS), so
 * cached page queries (src/lib/cache/cached-query.ts) can't go stale because some route or
 * library function forgot to call revalidateTag. Applies inside $transaction too.
 */
const withCacheInvalidation = (client: PrismaClient) =>
	client.$extends({
		name: 'cache-invalidation',
		query: {
			$allModels: {
				async $allOperations({ model, operation, args, query }) {
					const result = await query(args);
					if (WRITE_OPERATIONS.has(operation)) invalidateTags(MODEL_TAGS[model] ?? []);
					return result;
				},
			},
		},
	});

declare global {
	// eslint-disable-next-line no-var
	var prismaBase: PrismaClient | undefined;
	// eslint-disable-next-line no-var
	var prisma: ReturnType<typeof withCacheInvalidation> | undefined;
}

/** Unextended client, only for libraries that require a plain PrismaClient (the NextAuth adapter). */
const baseDb = globalThis.prismaBase ?? createBaseClient();
const db = globalThis.prisma ?? withCacheInvalidation(baseDb);

if (process.env.NODE_ENV !== 'production') {
	globalThis.prismaBase = baseDb;
	globalThis.prisma = db;
}

/** The transaction client handed to `db.$transaction(async (tx) => ...)`; use instead of Prisma.TransactionClient. */
export type DbTx = Parameters<Parameters<typeof db.$transaction>[0]>[0];

export { db, baseDb };
