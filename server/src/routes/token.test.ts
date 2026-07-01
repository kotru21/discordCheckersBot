import { describe, expect, test } from "bun:test";
import { exchangeCodeForToken } from "./token";

describe("exchangeCodeForToken", () => {
  test("throws when code is empty", async () => {
    await expect(exchangeCodeForToken("")).rejects.toThrow(/code/i);
  });
});
