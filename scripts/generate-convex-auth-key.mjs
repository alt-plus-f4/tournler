// Generates the key pair that lets Convex verify Tournler users (see src/lib/convex-auth.ts).
//   node scripts/generate-convex-auth-key.mjs
// Prints two values:
//   CONVEX_AUTH_PRIVATE_KEY -> Vercel env (and .env locally). Keep secret.
//   CONVEX_AUTH_JWKS        -> Convex env. The value contains ';', so it MUST be quoted when set from a
//                              shell, or the shell cuts it at 'data:text/plain' and Convex can't verify tokens.
import { createHash, generateKeyPairSync } from 'crypto';

const { privateKey, publicKey } = generateKeyPairSync('rsa', { modulusLength: 2048 });
const jwk = publicKey.export({ format: 'jwk' });
const kid = createHash('sha256').update(JSON.stringify({ e: jwk.e, kty: jwk.kty, n: jwk.n })).digest('base64url');
const jwks = JSON.stringify({ keys: [{ ...jwk, alg: 'RS256', use: 'sig', kid }] });

const pem = privateKey.export({ type: 'pkcs8', format: 'pem' }).toString();
console.log(`CONVEX_AUTH_PRIVATE_KEY="${pem.trim().replace(/\n/g, '\\n')}"\n`);
const jwksValue = `data:text/plain;charset=utf-8;base64,${Buffer.from(jwks).toString('base64')}`;
console.log(`CONVEX_AUTH_JWKS=${jwksValue}\n`);
console.log('Set it on each Convex deployment with the value quoted:');
console.log(`  npx convex env set CONVEX_AUTH_JWKS '${jwksValue}'          # dev`);
console.log(`  npx convex env set CONVEX_AUTH_JWKS '${jwksValue}' --prod   # production`);
