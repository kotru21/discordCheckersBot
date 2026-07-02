import { describe, expect, test } from "bun:test";
import { validateDiscordAccessToken } from "./validateDiscordToken";

describe("validateDiscordAccessToken", () => {
  test("throws when token is empty", async () => {
    await expect(validateDiscordAccessToken("")).rejects.toThrow(
      /access token/i
    );
  });

  test("throws when token is whitespace", async () => {
    await expect(validateDiscordAccessToken("   ")).rejects.toThrow(
      /access token/i
    );
  });
});
