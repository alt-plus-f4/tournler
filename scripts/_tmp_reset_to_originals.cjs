const { PrismaClient } = require('@prisma/client');
const p = new PrismaClient();

const B = 'https://6q0iedxcfemxlbr8.public.blob.vercel-storage.com';

const tournamentOriginals = {
	3: { bannerUrl: `${B}/banners/Elsys%20Gaming%20Tournament-banner-RDCYm803eoLV1J6ihisfJIHpyE3uyU.png`, logoUrl: `${B}/logos/Elsys%20Gaming%20Tournament-logo-Z5YrVwTF9RgFIvFIFJezFqbKyyBWHg.png` },
	5: { bannerUrl: `${B}/banners/HLTV%20Awards%202024-banner-s0VpyG91t4XW06qC72uscQ4u0Oa1Qf.png`, logoUrl: `${B}/logos/HLTV%20Awards%202024-logo-Frse9NXdODHulpJsNI4SyCxc8Ih5vm.png` },
	8: { bannerUrl: `${B}/banners/BLAST.tv%20Austin%20Major%202025-banner-1NmnRv9UyS8rpG2LkOfWPMBqFGjuBa.png`, logoUrl: `${B}/logos/BLAST.tv%20Austin%20Major%202025-logo-covkliNL9mYe4tqb1OVn6od1jgVqlq.png` },
	4: { bannerUrl: `${B}/banners/IEM%20Katowice%202025-banner-CZx6GaQqH4bXDlDoANu0N5b7uGMoaM.png`, logoUrl: `${B}/logos/IEM%20Katowice%202025-logo-78aRZJWFySg5HoGfohQTepUCHbysHw.png` },
	24: { bannerUrl: `${B}/banners/tournament-24-1790348950516.png`, logoUrl: `${B}/logos/tournament-24-1790348950516.png` },
	7: { bannerUrl: `${B}/banners/IEM%20Melbourne%202025-banner-9HsMGi8OGtIv3VYtfzQEr2X1Tafvmf.png`, logoUrl: `${B}/logos/IEM%20Melbourne%202025-logo-W8Xr4zgEGhugPqmwEuSAcYIt2mSgZP.png` },
	2: { bannerUrl: `${B}/banners/Blast%20Bounty-banner-w8nvbxBHrKwILx2SOZjm1K7UT7kLw6.png`, logoUrl: `${B}/logos/Blast%20Bounty-logo-nM3prgq0PlQrMKZ5jGKndXUzhIw64a.png` },
	6: { bannerUrl: `${B}/banners/PGL%20Cluj-Napoca%202025-banner-ZJFFFMxLtfZyUNSwIsZrfryfyDCfD1.png`, logoUrl: `${B}/logos/PGL%20Cluj-Napoca%202025-logo-BURurkf5OfqfSoBBKcyVwAYGSQtZ7n.png` },
};

const newsOriginals = {
	1: `${B}/news/post-1-1789529241170.png`,
	2: `${B}/news/post-1790276799611-29f35710.jpg`,
};

(async () => {
	for (const [id, data] of Object.entries(tournamentOriginals)) {
		await p.cs2Tournament.update({ where: { id: Number(id) }, data });
		console.log('reset tournament', id, data);
	}
	for (const [id, imageUrl] of Object.entries(newsOriginals)) {
		await p.newsPost.update({ where: { id: Number(id) }, data: { imageUrl } });
		console.log('reset news', id, imageUrl);
	}
	await p.$disconnect();
})();
