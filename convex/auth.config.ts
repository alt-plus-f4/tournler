// Verifies the RS256 tokens Tournler signs in src/lib/convex-auth.ts. CONVEX_AUTH_JWKS is a data:
// URI holding the public key (printed by scripts/generate-convex-auth-key.mjs), so Convex never
// has to fetch keys from the app.
export default {
	providers: [
		{
			type: 'customJwt',
			applicationID: 'convex',
			// Convex requires a URL-shaped issuer (a bare 'tournler' is rejected at push time). It is only
			// compared with the token's `iss`; nothing is fetched from it. Must match CONVEX_AUTH_ISSUER.
			issuer: 'https://tournler.auth',
			jwks: process.env.CONVEX_AUTH_JWKS!,
			algorithm: 'RS256',
		},
	],
};
