import { describe, expect, spyOn, test } from "bun:test";
import { RoomRegistry } from "./roomRegistry";

describe("RoomRegistry", () => {
  test("creates one room per instance id", () => {
    const registry = new RoomRegistry(60_000, 0);
    const first = registry.get("room-a");
    const second = registry.get("room-a");

    expect(first).toBe(second);
    expect(registry.roomCount()).toBe(1);
  });

  test("sweep removes stale rooms", () => {
    const registry = new RoomRegistry(1_000, 0);
    registry.get("stale-room");
    registry.get("fresh-room");

    expect(registry.roomCount()).toBe(2);

    const now = Date.now();
    spyOn(Date, "now").mockReturnValue(now + 2_000);
    registry.sweep();

    expect(registry.roomCount()).toBe(0);
  });
});
