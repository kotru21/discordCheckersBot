import { describe, expect, test } from "bun:test";
import { isLocalDevInstance } from "./validateActivityInstance";

describe("validateActivityInstance", () => {
  test("skips lookup for local dev instance id", () => {
    expect(isLocalDevInstance("local")).toBe(true);
    expect(isLocalDevInstance("i-123-gc-456-789")).toBe(false);
  });
});
