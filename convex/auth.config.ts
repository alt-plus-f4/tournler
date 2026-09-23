// Verifies the RS256 tokens Tournler signs in src/lib/convex-auth.ts. CONVEX_AUTH_JWKS is a data:
// URI holding the public key (printed by scripts/generate-convex-auth-key.mjs), so Convex never
// has to fetch keys from the app.
export default {
	providers: [
		{
			type: 'customJwt',
			applicationID: 'convex',
			issuer: 'tournler',
			jwks: process.env.CONVEX_AUTH_JWKS!,
			algorithm: 'RS256',
		},
	],
};
