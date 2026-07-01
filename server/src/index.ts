import type { ServerWebSocket } from "bun";
import { Hono } from "hono";
import { exchangeCodeForToken } from "./routes/token";
import { CheckersRoom } from "./rooms/checkersRoom";

const app = new Hono();

app.post("/api/token", async (c) => {
  try {
    const { code } = (await c.req.json()) as { code?: string };
    const token = await exchangeCodeForToken(code ?? "");
    return c.json(token);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Token exchange failed";
    return c.json({ error: message }, 400);
  }
});

app.get("/api/health", (c) => c.json({ ok: true }));

const rooms = new Map<string, CheckersRoom>();

function getRoom(instanceId: string): CheckersRoom {
  const existing = rooms.get(instanceId);
  if (existing) {
    return existing;
  }
  const room = new CheckersRoom(instanceId);
  rooms.set(instanceId, room);
  return room;
}

interface WsData {
  instanceId: string;
}

type WsClient = ServerWebSocket<WsData>;

interface JoinMessage {
  type: "join";
  userId: string;
}

interface MoveMessage {
  type: "move";
  userId: string;
  move: {
    fromRow: number;
    fromCol: number;
    toRow: number;
    toCol: number;
  };
}

type ClientMessage = JoinMessage | MoveMessage;

const port = Number(Bun.env.SERVER_PORT ?? 3001);

Bun.serve<WsData>({
  port,
  fetch(req, server) {
    const url = new URL(req.url);
    if (url.pathname === "/api/ws") {
      const instanceId = url.searchParams.get("instanceId") ?? "local";
      const upgraded = server.upgrade(req, { data: { instanceId } });
      if (upgraded) {
        return undefined;
      }
      return new Response("WebSocket upgrade failed", { status: 400 });
    }
    return app.fetch(req, server);
  },
  websocket: {
    open(ws: WsClient) {
      const room = getRoom(ws.data.instanceId);
      ws.subscribe(ws.data.instanceId);
      ws.send(
        JSON.stringify({ type: "state", payload: room.getState() })
      );
    },
    message(ws: WsClient, message) {
      const room = getRoom(ws.data.instanceId);
      const data = JSON.parse(String(message)) as ClientMessage;

      try {
        if (data.type === "join") {
          room.join(data.userId);
        } else if (data.type === "move") {
          room.submitMove(data.userId, data.move);
        }
      } catch (error) {
        const message =
          error instanceof Error ? error.message : "Request failed";
        ws.send(JSON.stringify({ type: "error", message }));
        return;
      }

      ws.publish(
        ws.data.instanceId,
        JSON.stringify({ type: "state", payload: room.getState() })
      );
    },
  },
});

console.log(`Server listening on :${port}`);
