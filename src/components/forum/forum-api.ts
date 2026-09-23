import 'server-only';
import { NextResponse } from 'next/server';
import type { ZodError } from 'zod';

export const jsonError = (error: string, status: number, extra?: Record<string, unknown>) => NextResponse.json({ error, ...extra }, { status });

export const validationError = (error: ZodError) => {
	const fieldErrors = error.flatten().fieldErrors as Record<string, string[] | undefined>;
	const first = Object.values(fieldErrors).find((messages) => messages && messages.length > 0)?.[0] ?? error.issues[0]?.message ?? 'Invalid request';
	return jsonError(first, 400, { fieldErrors });
};

/** Returns a 429 response if `last` is within `cooldownMs`, otherwise null. */
export function cooldownResponse(last: Date | null | undefined, cooldownMs: number, what: string) {
	if (!last) return null;
	const remainingMs = cooldownMs - (Date.now() - last.getTime());
	if (remainingMs <= 0) return null;
	const seconds = Math.ceil(remainingMs / 1000);
	return NextResponse.json({ error: `You're posting too fast. Wait ${seconds}s before posting another ${what}.`, retryAfter: seconds }, { status: 429, headers: { 'Retry-After': String(seconds) } });
}
