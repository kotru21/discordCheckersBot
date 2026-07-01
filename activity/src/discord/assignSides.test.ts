import { describe, expect, test } from "vitest";
import { assignPlayerSide, resolvePlayerSideFromRoom } from "./assignSides";

describe("assignPlayerSide", () => {
  test("first sorted user is beagle, second is corgi", () => {
    expect(assignPlayerSide(["u2", "u1"], "u1")).toBe("beagle");
    expect(assignPlayerSide(["u2", "u1"], "u2")).toBe("corgi");
  });

  test("third+ users are spectators", () => {
    expect(assignPlayerSide(["u1", "u2", "u3"], "u3")).toBeNull();
  });
});

describe("resolvePlayerSideFromRoom", () => {
  test("maps server player slots to sides", () => {
    const players = { beagle: "u1", corgi: "u2" };
    expect(resolvePlayerSideFromRoom(players, "u1")).toBe("beagle");
    expect(resolvePlayerSideFromRoom(players, "u2")).toBe("corgi");
    expect(resolvePlayerSideFromRoom(players, "u3")).toBeNull();
  });
});
