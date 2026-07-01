import { Hono } from "hono";
import { exchangeCodeForToken } from "./routes/token";

const app = new Hono();

app.post("/api/token", async (c) => {
  try {
    const { code } = (await c.req.json()) as { code?: string };
    const token = await exchangeCodeForToken(code ?? "");
    return c.json(token);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Token exchange failed";
    return c.json({ error: message }, 400);
  }
});

app.get("/api/health", (c) => c.json({ ok: true }));

const port = Number(Bun.env.SERVER_PORT ?? 3001);
Bun.serve({ port, fetch: app.fetch });
console.log(`Server listening on :${port}`);
