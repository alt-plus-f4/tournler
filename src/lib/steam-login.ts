export function redirectToSteam(): void {
    const redirectUri = process.env.STEAM_REDIRECT_URI || 'http://localhost:3000/api/auth/steam/callback';
    const state = Math.random().toString(36).substring(7); // Random state (for security)
  
    const steamLoginUrl = `https://steamcommunity.com/openid/login?openid.ns=http://specs.openid.net/auth/2.0&openid.mode=checkid_setup&openid.return_to=${redirectUri}&openid.realm=${redirectUri}&openid.response_nonce=${state}&openid.assoc_handle=${state}`;
  
    // Redirect user to Steam login page
    window.location.href = steamLoginUrl;
  }
  