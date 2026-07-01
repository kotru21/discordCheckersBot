import {
  DiscordSDK,
  DiscordSDKMock,
  patchUrlMappings,
} from "@discord/embedded-app-sdk";

const clientId =
  import.meta.env.VITE_DISCORD_CLIENT_ID ?? "0000000000000000000";

function createSdk(): DiscordSDK | DiscordSDKMock {
  const inDiscord = new URLSearchParams(window.location.search).has("frame_id");
  return inDiscord
    ? new DiscordSDK(clientId)
    : new DiscordSDKMock(clientId, null, null, null);
}

export const discordSdk = createSdk();

export interface DiscordSession {
  userId: string;
  username: string;
  accessToken: string;
  instanceId: string;
}

export async function bootstrapDiscordSession(): Promise<DiscordSession> {
  await discordSdk.ready();

  const apiHost = import.meta.env.VITE_API_HOST ?? "localhost:3001";
  patchUrlMappings([{ prefix: "/api", target: apiHost }], {
    patchFetch: true,
    patchWebSocket: true,
    patchXhr: true,
  });

  const { code } = await discordSdk.commands.authorize({
    client_id: clientId,
    response_type: "code",
    state: "",
    prompt: "none",
    scope: ["identify", "guilds", "rpc.activities.write"],
  });

  const { access_token } = await fetch("/api/token", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ code }),
  }).then(async (r) => {
    const payload = (await r.json()) as { access_token?: string; error?: string };
    if (!r.ok) {
      throw new Error(payload.error ?? "Token exchange failed");
    }
    if (!payload.access_token) {
      throw new Error("Token exchange returned no access_token");
    }
    return payload as { access_token: string };
  });

  const auth = await discordSdk.commands.authenticate({ access_token });

  return {
    userId: auth.user.id,
    username: auth.user.username,
    accessToken: access_token,
    instanceId: discordSdk.instanceId,
  };
}
