const DISCORD_USER_URL = "https://discord.com/api/users/@me";

export interface DiscordUser {
  id: string;
  username: string;
}

export async function validateDiscordAccessToken(
  accessToken: string
): Promise<DiscordUser> {
  const token = accessToken.trim();
  if (!token) {
    throw new Error("Missing access token");
  }

  const response = await fetch(DISCORD_USER_URL, {
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!response.ok) {
    throw new Error("Invalid access token");
  }

  const user = (await response.json()) as { id?: string; username?: string };
  if (!user.id) {
    throw new Error("Invalid access token");
  }

  return { id: user.id, username: user.username ?? "unknown" };
}
