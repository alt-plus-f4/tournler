import { parseStringPromise } from 'xml2js';

export async function authenticateWithSteam(redirectUri: string) {
  const steamOpenIdUrl = `https://steamcommunity.com/openid/login?openid.ns=http://specs.openid.net/auth/2.0&openid.mode=checkid_setup&openid.return_to=${redirectUri}&openid.realm=${redirectUri}`;

  const response = await fetch(steamOpenIdUrl);
  const text = await response.text();
  console.log(text);

  // Sanitize the XML response
  const sanitizedText = text.replace(/&/g, '&amp;');

  // Parse the XML response
  const result = await parseStringPromise(sanitizedText);

  // Extract the necessary information from the parsed XML
  const steamId = result?.['openid.response']?.['openid.claimed_id']?.[0];

  if (!steamId) {
    throw new Error('Failed to authenticate with Steam');
  }

  return { steamId };
}