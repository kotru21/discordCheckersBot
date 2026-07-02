import type { ServerWebSocket } from "bun";
import { assertUserInActivityInstance } from "../auth/validateActivityInstance";
import { validateDiscordAccessToken } from "../auth/validateDiscordToken";
import { createRateLimiter } from "../middleware/rateLimit";
import type { RoomRegistry } from "../rooms/roomRegistry";
import { clientMessageSchema } from "../validation/schemas";
import type { ClientMessage, ServerMessage, WsData } from "./types";

type WsClient = ServerWebSocket<WsData>;

const wsAuthRateLimit = createRateLimiter(10, 60_000);
const wsMessageRateLimit = createRateLimiter(120, 60_000);

function send(ws: WsClient, message: ServerMessage): void {
  ws.send(JSON.stringify(message));
}

function parseClientMessage(raw: string | Buffer): ClientMessage | null {
  let json: unknown;
  try {
    json = JSON.parse(String(raw));
  } catch {
    return null;
  }

  const result = clientMessageSchema.safeParse(json);
  return result.success ? result.data : null;
}

function publishState(ws: WsClient, registry: RoomRegistry): void {
  const room = registry.get(ws.data.instanceId);
  ws.publish(
    ws.data.instanceId,
    JSON.stringify({ type: "state", payload: room.getState() })
  );
}

async function handleAuth(
  ws: WsClient,
  accessToken: string,
  registry: RoomRegistry
): Promise<void> {
  if (wsAuthRateLimit(`auth:${ws.data.rateLimitKey}`)) {
    send(ws, { type: "error", message: "Too many auth attempts" });
    return;
  }

  if (ws.data.authenticated) {
    send(ws, { type: "error", message: "Already authenticated" });
    return;
  }

  const user = await validateDiscordAccessToken(accessToken);
  await assertUserInActivityInstance(user.id, ws.data.instanceId);

  ws.data.userId = user.id;
  ws.data.authenticated = true;

  const room = registry.get(ws.data.instanceId);
  room.join(user.id);
  registry.touch(ws.data.instanceId);

  ws.subscribe(ws.data.instanceId);
  send(ws, { type: "auth_ok" });
  send(ws, { type: "state", payload: room.getState() });
  publishState(ws, registry);
}

function handleMove(ws: WsClient, message: ClientMessage, registry: RoomRegistry): void {
  if (wsMessageRateLimit(`msg:${ws.data.rateLimitKey}`)) {
    send(ws, { type: "error", message: "Too many messages" });
    return;
  }

  if (!ws.data.authenticated || !ws.data.userId) {
    send(ws, { type: "error", message: "Authentication required" });
    return;
  }

  if (message.type !== "move") {
    send(ws, { type: "error", message: "Invalid message" });
    return;
  }

  const room = registry.get(ws.data.instanceId);
  room.submitMove(ws.data.userId, message.move);
  registry.touch(ws.data.instanceId);
  publishState(ws, registry);
}

function handleRematch(ws: WsClient, registry: RoomRegistry): void {
  if (wsMessageRateLimit(`msg:${ws.data.rateLimitKey}`)) {
    send(ws, { type: "error", message: "Too many messages" });
    return;
  }

  if (!ws.data.authenticated || !ws.data.userId) {
    send(ws, { type: "error", message: "Authentication required" });
    return;
  }

  const room = registry.get(ws.data.instanceId);
  room.rematch(ws.data.userId);
  registry.touch(ws.data.instanceId);
  publishState(ws, registry);
}

export function createWebSocketHandlers(registry: RoomRegistry) {
  return {
    open(ws: WsClient): void {
      send(ws, { type: "auth_required" });
    },

    async message(ws: WsClient, raw: string | Buffer): Promise<void> {
      const data = parseClientMessage(raw);
      if (!data) {
        send(ws, { type: "error", message: "Invalid message format" });
        return;
      }

      try {
        if (data.type === "auth") {
          await handleAuth(ws, data.accessToken, registry);
          return;
        }

        if (data.type === "rematch") {
          handleRematch(ws, registry);
          return;
        }

        handleMove(ws, data, registry);
      } catch (error) {
        const message =
          error instanceof Error ? error.message : "Request failed";
        send(ws, { type: "error", message });
      }
    },

    close(ws: WsClient): void {
      ws.unsubscribe(ws.data.instanceId);

      if (ws.data.authenticated && ws.data.userId) {
        const room = registry.get(ws.data.instanceId);
        room.leave(ws.data.userId);
        registry.touch(ws.data.instanceId);
        publishState(ws, registry);
      }
    },
  };
}
