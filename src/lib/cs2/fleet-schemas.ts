import { z } from 'zod';
import { hostSchema, portSchema } from './pool-builder';

const slug = z
	.string()
	.trim()
	.min(1, 'A short id is required')
	.max(32)
	.regex(/^[a-z0-9][a-z0-9-]*$/, 'Use lowercase letters, numbers and dashes');

const region = z
	.string()
	.trim()
	.min(2)
	.max(32)
	.regex(/^[a-z0-9-]+$/, 'Use lowercase letters, numbers and dashes');

const secret = z
	.string()
	.min(24, 'Agent secret must be at least 24 characters')
	.max(128)
	// eslint-disable-next-line no-control-regex
	.regex(/^[^\u0000-\u001f\u007f]*$/, 'Secret contains control characters');

const agentUrl = z
	.string()
	.trim()
	.url('Agent URL must be a full URL')
	.max(300)
	.refine((u) => /^https?:\/\//i.test(u), 'Agent URL must be http(s)');

export const hostInputSchema = z
	.object({
		slug,
		name: z.string().trim().min(1, 'A name is required').max(80),
		region: region.default('eu'),
		publicHost: hostSchema,
		agentUrl: agentUrl.nullable().optional(),
		agentSecret: secret.optional(),
		portRangeStart: portSchema.min(1024, 'Use a port of 1024 or higher').default(27015),
		// Each server uses game, RCON (+1) and GOTV (+5), so servers must be at least 10 ports apart.
		portStep: z.number().int().min(10, 'Step must be at least 10').max(100).default(10),
		maxServers: z.number().int().min(1).max(32).default(4),
	})
	.strict();

export const hostPatchSchema = z
	.object({
		name: z.string().trim().min(1).max(80).optional(),
		region: region.optional(),
		publicHost: hostSchema.optional(),
		agentUrl: agentUrl.nullable().optional(),
		agentSecret: secret.optional(),
		portRangeStart: portSchema.min(1024).optional(),
		portStep: z.number().int().min(10).max(100).optional(),
		maxServers: z.number().int().min(1).max(32).optional(),
	})
	.strict();

export const createManagedServerSchema = z
	.object({
		name: z.string().trim().min(1).max(80).optional(),
		region: region.optional(),
		startMap: z
			.string()
			.trim()
			.regex(/^[A-Za-z0-9_]{1,40}$/, 'Invalid map name')
			.optional(),
	})
	.strict();

export const serverPatchSchema = z
	.object({
		name: z.string().trim().min(1).max(80).optional(),
		region: region.optional(),
		status: z.enum(['ACTIVE', 'DRAINING', 'DISABLED']).optional(),
		rconPassword: z
			.string()
			.min(1)
			.max(128)
			// eslint-disable-next-line no-control-regex
			.regex(/^[^\u0000-\u001f\u007f]*$/, 'Password contains control characters')
			.optional(),
	})
	.strict();

export const powerSchema = z.object({ action: z.enum(['start', 'stop', 'restart']) }).strict();
