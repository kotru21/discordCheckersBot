import {
  DiscordSDK,
  DiscordSDKMock,
  patchUrlMappings,
} from "@discord/embedded-app-sdk";

const clientId =
  import.meta.env.VITE_DISCORD_CLIENT_ID ?? "0000000000000000000";

const PRODUCTION_API_HOST = "discord-checkers-server-2dbcedabcdf8.herokuapp.com";

function resolveApiHost(): string {
  const raw = import.meta.env.VITE_API_HOST ?? (import.meta.env.PROD ? PRODUCTION_API_HOST : "localhost:3001");
  return raw.replace(/^https?:\/\//, "").replace(/\/$/, "");
}

function buildApiUrl(path: string): string {
  return `https://${resolveApiHost()}${path.startsWith("/") ? path : `/${path}`}`;
}

async function readApiJson<T>(response: Response): Promise<T> {
  const text = await response.text();
  try {
    return JSON.parse(text) as T;
  } catch {
    throw new Error(
      `API returned non-JSON (${response.status}): ${text.slice(0, 160)}`,
    );
  }
}

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
  instanceId: string;
}

export interface BootstrapResult {
  session: DiscordSession;
  wsAccessToken: string;
}

export async function bootstrapDiscordSession(): Promise<BootstrapResult> {
  await discordSdk.ready();

  const apiHost = resolveApiHost();
  patchUrlMappings([{ prefix: "/api", target: `${apiHost}/api` }], {
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

  const { access_token } = await fetch(buildApiUrl("/api/token"), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ code }),
  }).then(async (r) => {
    const payload = await readApiJson<{ access_token?: string; error?: string }>(r);
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
    session: {
      userId: auth.user.id,
      username: auth.user.username,
      instanceId: discordSdk.instanceId,
    },
    wsAccessToken: access_token,
  };
}
