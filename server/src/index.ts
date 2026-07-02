import { Hono } from "hono";
import { createRateLimiter, getClientIp } from "./middleware/rateLimit";
import { securityHeaders } from "./middleware/securityHeaders";
import { RoomRegistry } from "./rooms/roomRegistry";
import { exchangeCodeForToken } from "./routes/token";
import { createWebSocketHandlers } from "./ws/handleMessage";
import type { WsData } from "./ws/types";

const tokenRateLimit = createRateLimiter(20, 60_000);
const roomRegistry = new RoomRegistry();
const wsHandlers = createWebSocketHandlers(roomRegistry);

const app = new Hono();
app.use("*", securityHeaders);

app.post("/api/token", async (c) => {
  const clientIp = getClientIp(c.req.raw);
  if (tokenRateLimit(clientIp)) {
    return c.json({ error: "Too many requests" }, 429);
  }

  try {
    const { code } = (await c.req.json()) as { code?: string };
    const token = await exchangeCodeForToken(code ?? "");
    return c.json(token);
  } catch (error) {
    console.error("Token exchange error:", error);
    return c.json({ error: "Token exchange failed" }, 400);
  }
});

app.get("/api/health", (c) => c.json({ ok: true }));

const port = Number(Bun.env.PORT ?? Bun.env.SERVER_PORT ?? 3001);

Bun.serve<WsData>({
  hostname: "0.0.0.0",
  port,
  fetch(req, server) {
    const url = new URL(req.url);
    if (url.pathname === "/api/ws") {
      const instanceId = url.searchParams.get("instanceId") ?? "local";
      const upgraded = server.upgrade(req, {
        data: { instanceId, userId: null, authenticated: false },
      });
      if (upgraded) {
        return undefined;
      }
      return new Response("WebSocket upgrade failed", { status: 400 });
    }
    return app.fetch(req, server);
  },
  websocket: wsHandlers,
});

console.warn(`Server listening on :${port}`);
