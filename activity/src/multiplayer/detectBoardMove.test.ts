import { describe, expect, it } from "vitest";
import { BOT, EMPTY, PLAYER } from "@shared/config/constants";
import type { Board } from "@shared/types/game.types";
import { detectBoardMove, isSameMove } from "./detectBoardMove";

function emptyBoard(): Board {
  return Array.from({ length: 10 }, () =>
    Array.from({ length: 10 }, () => EMPTY)
  ) as Board;
}

describe("detectBoardMove", () => {
  it("detects a quiet move", () => {
    const prev = emptyBoard();
    const next = emptyBoard();
    prev[6][1] = PLAYER;
    next[5][0] = PLAYER;

    expect(detectBoardMove(prev, next)).toEqual({
      fromRow: 6,
      fromCol: 1,
      toRow: 5,
      toCol: 0,
      wasCapture: false,
    });
  });

  it("detects a capture move", () => {
    const prev = emptyBoard();
    const next = emptyBoard();
    prev[6][1] = PLAYER;
    prev[5][2] = BOT;
    next[4][3] = PLAYER;

    const move = detectBoardMove(prev, next);
    expect(move).toEqual({
      fromRow: 6,
      fromCol: 1,
      toRow: 4,
      toCol: 3,
      wasCapture: true,
    });
  });

  it("returns null when boards are identical", () => {
    const board = emptyBoard();
    board[3][4] = PLAYER;
    expect(detectBoardMove(board, board)).toBeNull();
  });
});

describe("isSameMove", () => {
  it("compares move coordinates", () => {
    const move = {
      fromRow: 6,
      fromCol: 1,
      toRow: 5,
      toCol: 0,
      wasCapture: false,
    };
    expect(isSameMove(move, { ...move, wasCapture: true })).toBe(true);
    expect(isSameMove(move, { ...move, toCol: 2 })).toBe(false);
  });
});
