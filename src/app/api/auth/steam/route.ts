export async function GET() {
  // Define the URL to redirect after Steam authentication
  const redirectUrl = encodeURIComponent(process.env.STEAM_REDIRECT_URI || 'http://localhost:3000/api/auth/steam/callback');
  const callbackUrl = encodeURIComponent(process.env.STEAM_CALLBACK_URL || 'http://localhost:3000/api/auth/steam/callback');
  const redirectQuery = encodeURIComponent(''); // If needed, add any query parameters here

  const steamLoginUrl = `https://steamcommunity.com/openid/login?openid.mode=checkid_setup&openid.ns=http%3A%2F%2Fspecs.openid.net%2Fauth%2F2.0&openid.identity=http%3A%2F%2Fspecs.openid.net%2Fauth%2F2.0%2Fidentifier_select&openid.claimed_id=http%3A%2F%2Fspecs.openid.net%2Fauth%2F2.0%2Fidentifier_select&openid.return_to=${redirectUrl}%3FredirectUrl%3D${callbackUrl}%26callbackUrl%3D${callbackUrl}%26redirectQuery%3D&openid.realm=${redirectUrl}`;

  // Return the Steam login URL to be used in the frontend
  return new Response(JSON.stringify({ url: steamLoginUrl }), {
    headers: { 'Content-Type': 'application/json' },
  });
}
