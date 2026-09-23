// Moves avatars uploaded before avatars were keyed by user id (avatars/<email>.svg, which put the
// email address in a public URL) to avatars/<userId>-<random>.svg, then deletes the old file.
//
//   node --env-file=.env scripts/migrate-avatar-blob-names.mjs           # dry run: lists what would move
//   node --env-file=.env scripts/migrate-avatar-blob-names.mjs --apply   # does it
import { PrismaClient } from '@prisma/client';
import { del, put } from '@vercel/blob';

const apply = process.argv.includes('--apply');
const db = new PrismaClient();

const users = await db.user.findMany({
	where: { image: { contains: '.public.blob.vercel-storage.com/avatars/' } },
	select: { id: true, email: true, image: true },
});

// Old names start with the email (raw or percent-encoded); new ones start with the user id.
const affected = users.filter((u) => {
	const name = decodeURIComponent(new URL(u.image).pathname.split('/').pop() ?? '');
	return !name.startsWith(u.id) && (name.includes('@') || name.startsWith(u.email));
});

console.log(`${affected.length} of ${users.length} blob avatars are still named by email${apply ? '' : ' (dry run, pass --apply to migrate)'}`);

let moved = 0;
for (const user of affected) {
	if (!apply) {
		console.log(`  would move avatar for user ${user.id}`);
		continue;
	}
	try {
		const response = await fetch(user.image);
		if (!response.ok) throw new Error(`fetch ${response.status}`);
		const blob = await put(`avatars/${user.id}.svg`, Buffer.from(await response.arrayBuffer()), { access: 'public', addRandomSuffix: true, contentType: 'image/svg+xml' });
		await db.user.update({ where: { id: user.id }, data: { image: blob.url } });
		await del(user.image);
		moved++;
		console.log(`  moved avatar for user ${user.id}`);
	} catch (error) {
		console.error(`  failed for user ${user.id}:`, error.message);
	}
}

if (apply) console.log(`done: ${moved}/${affected.length} moved`);
await db.$disconnect();
