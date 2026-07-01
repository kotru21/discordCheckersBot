function required(name: string): string {
  const value = Bun.env[name];
  if (!value) {
    throw new Error(`Missing env var: ${name}`);
  }
  return value;
}

export const config = {
  token: required("DISCORD_TOKEN"),
  clientId: required("DISCORD_CLIENT_ID"),
  guildId: Bun.env.DISCORD_GUILD_ID,
};
