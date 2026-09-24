import 'server-only';
import { NextResponse } from 'next/server';
import type { ServiceResult } from './service';

/** ServiceResult → JSON response (`{ error }` on failure, with Retry-After on 429). */
export function respond(result: ServiceResult) {
	if (result.ok) return NextResponse.json(result.body, { status: 200 });
	const headers = result.retryAfter ? { 'Retry-After': String(result.retryAfter) } : undefined;
	return NextResponse.json({ error: result.error }, { status: result.status, headers });
}
