import 'server-only';
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';

// Self-hosted (not next/font — that optimizer doesn't run inside next/og's Satori renderer, which
// needs raw font bytes via ImageResponse's `fonts` option). Static Latin-subset woff files, read
// once at module scope per the "Predictable values" pattern (they don't depend on request data).
// Same families the app already uses (see src/app/layout.tsx and DESIGN.md's numeric token).
const FONT_DIR = join(process.cwd(), 'src/lib/og/fonts');

async function loadFont(file: string) {
	return readFile(join(FONT_DIR, file));
}

let cached: Promise<{
	robotoRegular: Buffer;
	robotoBold: Buffer;
	robotoBlack: Buffer;
	robotoMonoRegular: Buffer;
	robotoMonoBold: Buffer;
}> | null = null;

/** Every OG card's font set, loaded once and reused across requests/instances. */
export function ogFonts() {
	if (!cached) {
		cached = Promise.all([loadFont('Roboto-Regular.woff'), loadFont('Roboto-Bold.woff'), loadFont('Roboto-Black.woff'), loadFont('RobotoMono-Regular.woff'), loadFont('RobotoMono-Bold.woff')]).then(
			([robotoRegular, robotoBold, robotoBlack, robotoMonoRegular, robotoMonoBold]) => ({ robotoRegular, robotoBold, robotoBlack, robotoMonoRegular, robotoMonoBold }),
		);
	}
	return cached;
}

/** `ImageResponse`'s `fonts` array, built from `ogFonts()`. */
export async function ogFontConfig() {
	const f = await ogFonts();
	return [
		{ name: 'Roboto', data: f.robotoRegular, weight: 400 as const, style: 'normal' as const },
		{ name: 'Roboto', data: f.robotoBold, weight: 700 as const, style: 'normal' as const },
		{ name: 'Roboto', data: f.robotoBlack, weight: 900 as const, style: 'normal' as const },
		{ name: 'Roboto Mono', data: f.robotoMonoRegular, weight: 400 as const, style: 'normal' as const },
		{ name: 'Roboto Mono', data: f.robotoMonoBold, weight: 700 as const, style: 'normal' as const },
	];
}
