import { EMPTY } from "@shared/config/constants";
import type { Board } from "@shared/types/game.types";

export interface DetectedMove {
  fromRow: number;
  fromCol: number;
  toRow: number;
  toCol: number;
  wasCapture: boolean;
}

function pieceSide(piece: string): "beagle" | "corgi" | null {
  if (piece.includes("beagle")) {
    return "beagle";
  }
  if (piece.includes("corgi")) {
    return "corgi";
  }
  return null;
}

export function detectBoardMove(prev: Board, next: Board): DetectedMove | null {
  const emptied: { row: number; col: number; side: "beagle" | "corgi" }[] = [];
  const filled: { row: number; col: number; side: "beagle" | "corgi" }[] = [];

  for (let row = 0; row < prev.length; row++) {
    for (let col = 0; col < prev[row].length; col++) {
      const before = prev[row][col];
      const after = next[row][col];
      if (before === after) {
        continue;
      }

      if (before !== EMPTY && before !== null) {
        const side = pieceSide(before);
        if (side) {
          emptied.push({ row, col, side });
        }
      }

      if (after !== EMPTY && after !== null) {
        const side = pieceSide(after);
        if (side) {
          filled.push({ row, col, side });
        }
      }
    }
  }

  if (filled.length !== 1) {
    return null;
  }

  const destination = filled[0];
  const movers = emptied.filter((cell) => cell.side === destination.side);

  if (movers.length !== 1) {
    return null;
  }

  const origin = movers[0];
  const wasCapture = emptied.length > 1;

  return {
    fromRow: origin.row,
    fromCol: origin.col,
    toRow: destination.row,
    toCol: destination.col,
    wasCapture,
  };
}

export function isSameMove(a: DetectedMove, b: DetectedMove): boolean {
  return (
    a.fromRow === b.fromRow &&
    a.fromCol === b.fromCol &&
    a.toRow === b.toRow &&
    a.toCol === b.toCol
  );
}
