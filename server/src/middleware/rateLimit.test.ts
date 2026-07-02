import { describe, expect, test } from "bun:test";
import { createRateLimiter } from "../middleware/rateLimit";

describe("createRateLimiter", () => {
  test("blocks requests above the limit", () => {
    const limiter = createRateLimiter(2, 60_000);

    expect(limiter("client-a")).toBe(false);
    expect(limiter("client-a")).toBe(false);
    expect(limiter("client-a")).toBe(true);
  });

  test("tracks clients independently", () => {
    const limiter = createRateLimiter(1, 60_000);

    expect(limiter("client-a")).toBe(false);
    expect(limiter("client-b")).toBe(false);
    expect(limiter("client-a")).toBe(true);
    expect(limiter("client-b")).toBe(true);
  });
});
