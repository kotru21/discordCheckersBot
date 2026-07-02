import type { Context, Next } from "hono";

export async function securityHeaders(c: Context, next: Next): Promise<void> {
  await next();
  c.header("X-Content-Type-Options", "nosniff");
  c.header("Referrer-Policy", "strict-origin-when-cross-origin");
  c.header("X-Frame-Options", "DENY");
}
