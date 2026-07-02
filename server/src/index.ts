import { Hono } from "hono";
import { isProductionInstanceId } from "./auth/validateActivityInstance";
import { createRateLimiter, getClientIp } from "./middleware/rateLimit";
import { securityHeaders } from "./middleware/securityHeaders";
import { RoomRegistry } from "./rooms/roomRegistry";
import { exchangeCodeForToken } from "./routes/token";
import { tokenBodySchema } from "./validation/schemas";
import { createWebSocketHandlers } from "./ws/handleMessage";
import type { WsData } from "./ws/types";
import { logger } from "./logger";

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
    const body = tokenBodySchema.safeParse(await c.req.json());
    if (!body.success) {
      return c.json({ error: "Invalid request body" }, 400);
    }
    const token = await exchangeCodeForToken(body.data.code);
    return c.json({ access_token: token.access_token });
  } catch (error) {
    logger.error("Token exchange error", {
      error: error instanceof Error ? error.message : "unknown",
    });
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
      const rawInstanceId = url.searchParams.get("instanceId");
      if (Bun.env.NODE_ENV === "production" && !isProductionInstanceId(rawInstanceId)) {
        return new Response("Invalid instanceId", { status: 400 });
      }
      const instanceId = rawInstanceId ?? "local";
      const upgraded = server.upgrade(req, {
        data: {
          instanceId,
          userId: null,
          authenticated: false,
          rateLimitKey: crypto.randomUUID(),
        },
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

logger.info("Server listening", { port });
