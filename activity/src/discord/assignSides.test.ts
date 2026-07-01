import { describe, expect, test } from "vitest";
import { assignPlayerSide } from "./assignSides";

describe("assignPlayerSide", () => {
  test("first user is beagle, second is corgi", () => {
    expect(assignPlayerSide(["u1"], "u1")).toBe("beagle");
    expect(assignPlayerSide(["u1", "u2"], "u2")).toBe("corgi");
  });

  test("third+ users are spectators", () => {
    expect(assignPlayerSide(["u1", "u2", "u3"], "u3")).toBeNull();
  });
});
