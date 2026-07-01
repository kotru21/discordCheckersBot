const DISCORD_TOKEN_URL = "https://discord.com/api/oauth2/token";

export async function exchangeCodeForToken(code: string): Promise<{ access_token: string }> {
  if (!code.trim()) throw new Error("Missing OAuth code");

  const clientId = Bun.env.DISCORD_CLIENT_ID;
  const clientSecret = Bun.env.DISCORD_CLIENT_SECRET;
  if (!clientId || !clientSecret) throw new Error("Missing Discord OAuth credentials");

  const body = new URLSearchParams({
    client_id: clientId,
    client_secret: clientSecret,
    grant_type: "authorization_code",
    code,
  });

  const response = await fetch(DISCORD_TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Discord token exchange failed: ${response.status} ${text}`);
  }

  return (await response.json()) as { access_token: string };
}
