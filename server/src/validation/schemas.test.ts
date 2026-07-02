import { describe, expect, test } from "bun:test";
import { clientMessageSchema, tokenBodySchema } from "./schemas";

describe("validation schemas", () => {
  test("accepts auth and move messages", () => {
    expect(
      clientMessageSchema.safeParse({
        type: "auth",
        accessToken: "token",
      }).success
    ).toBe(true);

    expect(
      clientMessageSchema.safeParse({
        type: "move",
        move: { fromRow: 6, fromCol: 1, toRow: 5, toCol: 0 },
      }).success
    ).toBe(true);

    expect(
      clientMessageSchema.safeParse({ type: "rematch" }).success
    ).toBe(true);
  });

  test("rejects invalid move coordinates", () => {
    const result = clientMessageSchema.safeParse({
      type: "move",
      move: { fromRow: 10, fromCol: 1, toRow: 5, toCol: 0 },
    });
    expect(result.success).toBe(false);
  });

  test("validates token body", () => {
    expect(tokenBodySchema.safeParse({ code: "abc" }).success).toBe(true);
    expect(tokenBodySchema.safeParse({ code: "" }).success).toBe(false);
    expect(tokenBodySchema.safeParse({}).success).toBe(false);
  });
});
