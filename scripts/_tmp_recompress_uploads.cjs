const { PrismaClient } = require('@prisma/client');
const sharp = require('sharp');
const { put } = require('@vercel/blob');

const p = new PrismaClient();
const DRY_RUN = process.argv.includes('--dry-run');

async function fetchBytes(url) {
	const res = await fetch(url);
	if (!res.ok) throw new Error(`fetch failed ${res.status} for ${url}`);
	return Buffer.from(await res.arrayBuffer());
}

async function recompress(url, { maxWidth, maxHeight, quality = 82 }) {
	const original = await fetchBytes(url);
	if (url.toLowerCase().endsWith('.svg')) return null; // never touch vectors
	const resized = await sharp(original).rotate().resize({ width: maxWidth, height: maxHeight, fit: 'inside', withoutEnlargement: true }).webp({ quality }).toBuffer();
	return { originalBytes: original.length, newBytes: resized.length, buffer: resized };
}

async function processField({ kind, id, label, url, basePath, dims }) {
	if (!url || !url.startsWith('http') || url.toLowerCase().endsWith('.svg')) return null;
	const result = await recompress(url, dims);
	if (!result) return null;
	// Skip when re-encoding wouldn't actually shrink it (small/simple images sometimes grow under lossy WebP).
	if (result.newBytes >= result.originalBytes) {
		return { kind, id, label, url, skipped: true, originalBytes: result.originalBytes };
	}
	const newUrl = DRY_RUN ? null : (await put(`${basePath}.webp`, result.buffer, { access: 'public', contentType: 'image/webp', token: process.env.BLOB_READ_WRITE_TOKEN })).url;
	return { kind, id, label, url, newUrl, originalBytes: result.originalBytes, newBytes: result.newBytes };
}

(async () => {
	const tournaments = await p.cs2Tournament.findMany({ where: { OR: [{ bannerUrl: { not: null } }, { logoUrl: { not: null } }] }, select: { id: true, name: true, bannerUrl: true, logoUrl: true } });
	const news = await p.newsPost.findMany({ where: { imageUrl: { not: null } }, select: { id: true, title: true, imageUrl: true } });

	const changes = [];

	for (const t of tournaments) {
		if (t.bannerUrl) {
			const r = await processField({
				kind: 'tournament-banner',
				id: t.id,
				label: t.name,
				url: t.bannerUrl,
				basePath: `banners/tournament-${t.id}-recompressed-${Date.now()}`,
				dims: { maxWidth: 1600, maxHeight: 900 },
			});
			if (r && !r.skipped) changes.push({ ...r, apply: async (newUrl) => p.cs2Tournament.update({ where: { id: t.id }, data: { bannerUrl: newUrl } }) });
			else if (r?.skipped) changes.push(r);
		}
		if (t.logoUrl) {
			const r = await processField({
				kind: 'tournament-logo',
				id: t.id,
				label: t.name,
				url: t.logoUrl,
				basePath: `logos/tournament-${t.id}-recompressed-${Date.now()}`,
				dims: { maxWidth: 512, maxHeight: 512 },
			});
			if (r && !r.skipped) changes.push({ ...r, apply: async (newUrl) => p.cs2Tournament.update({ where: { id: t.id }, data: { logoUrl: newUrl } }) });
			else if (r?.skipped) changes.push(r);
		}
	}

	for (const n of news) {
		const r = await processField({ kind: 'news-image', id: n.id, label: n.title, url: n.imageUrl, basePath: `news/post-${n.id}-recompressed-${Date.now()}`, dims: { maxWidth: 1600, maxHeight: 900 } });
		if (r && !r.skipped) changes.push({ ...r, apply: async (newUrl) => p.newsPost.update({ where: { id: n.id }, data: { imageUrl: newUrl } }) });
		else if (r?.skipped) changes.push(r);
	}

	let totalOld = 0;
	let totalNew = 0;
	for (const c of changes) {
		if (c.skipped) {
			console.log(`SKIP   ${c.kind.padEnd(18)} ${(c.originalBytes / 1024).toFixed(0).padStart(6)}KB already optimized  ${c.label}`);
			continue;
		}
		totalOld += c.originalBytes;
		totalNew += c.newBytes;
		console.log(`${DRY_RUN ? 'WOULD' : 'DID  '}  ${c.kind.padEnd(18)} ${(c.originalBytes / 1024).toFixed(0).padStart(6)}KB -> ${(c.newBytes / 1024).toFixed(0).padStart(6)}KB  ${c.label}`);
		console.log(`         old: ${c.url}`);
		if (!DRY_RUN) {
			console.log(`         new: ${c.newUrl}`);
			await c.apply(c.newUrl);
		}
	}

	console.log(
		`\nTotal: ${(totalOld / 1024).toFixed(0)}KB -> ${(totalNew / 1024).toFixed(0)}KB across ${changes.filter((c) => !c.skipped).length} files${DRY_RUN ? ' (dry run, nothing written)' : ''}`,
	);

	await p.$disconnect();
})().catch((e) => {
	console.error(e);
	process.exit(1);
});
