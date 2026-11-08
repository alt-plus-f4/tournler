import type { ServerHost } from '@prisma/client';
import { z } from 'zod';

export const hostIdSchema = z.coerce.number().int().positive();

export type PublicHost = ReturnType<typeof toPublicHost>;

/** Fields about a host that may reach the client. The agent secret never does; only whether one is set. */
export function toPublicHost(host: ServerHost & { _count?: { servers: number } }) {
	return {
		id: host.id,
		slug: host.slug,
		name: host.name,
		region: host.region,
		publicHost: host.publicHost,
		agentUrl: host.agentUrl,
		hasAgent: Boolean(host.agentUrl && host.agentSecretEnc),
		portRangeStart: host.portRangeStart,
		portStep: host.portStep,
		maxServers: host.maxServers,
		serverCount: host._count?.servers ?? 0,
	};
}
