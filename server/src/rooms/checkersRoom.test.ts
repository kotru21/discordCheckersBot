import { describe, expect, test } from "bun:test";
import { CheckersRoom } from "./checkersRoom";

describe("CheckersRoom", () => {
  test("assigns beagle to first joiner and rejects move from wrong player", () => {
    const room = new CheckersRoom("room-1");
    room.join("user-a");
    room.join("user-b");

    expect(room.getState().players.beagle).toBe("user-a");
    expect(room.getState().players.corgi).toBe("user-b");

    expect(() =>
      room.submitMove("user-b", {
        fromRow: 6,
        fromCol: 1,
        toRow: 5,
        toCol: 0,
      })
    ).toThrow(/not your turn/i);
  });

  test("accepts valid quiet move from beagle", () => {
    const room = new CheckersRoom("room-2");
    room.join("user-a");
    room.join("user-b");

    const state = room.submitMove("user-a", {
      fromRow: 6,
      fromCol: 1,
      toRow: 5,
      toCol: 0,
    });

    expect(state.activePlayer).toBe("corgi");
    expect(state.gameOver).toBe(false);
  });

  test("rejects third player when room is full", () => {
    const room = new CheckersRoom("room-3");
    room.join("user-a");
    room.join("user-b");

    expect(() => room.join("user-c")).toThrow(/room is full/i);
  });

  test("leave clears player slot", () => {
    const room = new CheckersRoom("room-4");
    room.join("user-a");
    room.join("user-b");

    const state = room.leave("user-b");
    expect(state.players.corgi).toBeNull();
    expect(state.players.beagle).toBe("user-a");
  });

  test("rematch resets board when game is over", () => {
    const room = new CheckersRoom("room-5");
    room.join("user-a");
    room.join("user-b");
    (
      room as unknown as { state: { gameOver: boolean; winner: string } }
    ).state.gameOver = true;
    (
      room as unknown as { state: { gameOver: boolean; winner: string } }
    ).state.winner = "beagle";

    const state = room.rematch("user-a");
    expect(state.gameOver).toBe(false);
    expect(state.winner).toBeNull();
    expect(state.activePlayer).toBe("beagle");
    expect(state.players).toEqual({ beagle: "user-a", corgi: "user-b" });
  });

  test("rematch rejects while game is in progress", () => {
    const room = new CheckersRoom("room-6");
    room.join("user-a");

    expect(() => room.rematch("user-a")).toThrow(/still in progress/i);
  });
});
