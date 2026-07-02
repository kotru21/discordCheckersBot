import { logger } from "../logger";

const ACTIVITY_INSTANCE_URL =
  "https://discord.com/api/applications";

export interface ActivityInstance {
  applicationId: string;
  instanceId: string;
  users: string[];
}

function getDiscordBotCredentials(): { applicationId: string; botToken: string } {
  const applicationId = Bun.env.DISCORD_CLIENT_ID;
  const botToken = Bun.env.DISCORD_TOKEN;

  if (!applicationId || !botToken) {
    throw new Error("Missing Discord bot credentials");
  }

  return { applicationId, botToken };
}

export async function fetchActivityInstance(
  instanceId: string
): Promise<ActivityInstance> {
  const id = instanceId.trim();
  if (!id) {
    throw new Error("Missing activity instance");
  }

  const { applicationId, botToken } = getDiscordBotCredentials();
  const url = `${ACTIVITY_INSTANCE_URL}/${applicationId}/activity-instances/${encodeURIComponent(id)}`;

  const response = await fetch(url, {
    headers: { Authorization: `Bot ${botToken}` },
  });

  if (response.status === 404) {
    throw new Error("Activity instance not found");
  }

  if (!response.ok) {
    logger.error("Activity instance lookup failed", {
      status: response.status,
      body: (await response.text()).slice(0, 200),
    });
    throw new Error("Activity instance lookup failed");
  }

  const payload = (await response.json()) as {
    application_id?: string;
    instance_id?: string;
    users?: string[];
  };

  if (!payload.instance_id || !Array.isArray(payload.users)) {
    throw new Error("Activity instance lookup failed");
  }

  return {
    applicationId: payload.application_id ?? applicationId,
    instanceId: payload.instance_id,
    users: payload.users,
  };
}

export function isLocalDevInstance(instanceId: string): boolean {
  if (instanceId !== "local") {
    return false;
  }
  return Bun.env.NODE_ENV !== "production";
}

export function isProductionInstanceId(instanceId: string | null): boolean {
  const id = instanceId?.trim() ?? "";
  return id.length > 0 && id !== "local";
}

export async function assertUserInActivityInstance(
  userId: string,
  instanceId: string
): Promise<void> {
  if (isLocalDevInstance(instanceId)) {
    return;
  }

  const instance = await fetchActivityInstance(instanceId);
  if (!instance.users.includes(userId)) {
    throw new Error("Not a participant in this activity instance");
  }
}
