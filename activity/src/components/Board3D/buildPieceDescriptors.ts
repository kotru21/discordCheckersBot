import { EMPTY } from "@shared/config/constants";
import type { Board, PieceType, Player, Position } from "@shared/types/game.types";
import type { PieceAnimationInfo } from "@shared/types/pieceAnimation.types";
import type { PlayMode } from "../../store/gameStore";
import { pieceUtils } from "../../utils/gameHelpers";

export interface PieceDescriptor {
  key: string;
  boardRow: number;
  boardCol: number;
  type: "beagle" | "corgi";
  isKing: boolean;
  pointerTarget: boolean;
  animationId: string | null;
}

function isPiecePointerTarget(
  cell: PieceType,
  playMode: PlayMode,
  myPlayer: Player | null
): boolean {
  if (playMode === "discord_pvp") {
    if (myPlayer === "beagle") {
      return pieceUtils.isPlayerPiece(cell);
    }
    if (myPlayer === "corgi") {
      return pieceUtils.isBotPiece(cell);
    }
    return false;
  }
  return pieceUtils.isPlayerPiece(cell);
}

export function buildPieceDescriptors(
  board: Board,
  selectedPiece: Position | null,
  currentAnimation: PieceAnimationInfo | null | undefined,
  myPlayer: Player | null = null,
  playMode: PlayMode = "solo_bot"
): PieceDescriptor[] {
  const out: PieceDescriptor[] = [];
  const anim = currentAnimation ?? null;

  for (let row = 0; row < board.length; row++) {
    for (let col = 0; col < board[row].length; col++) {
      const cell = board[row][col];
      if (cell === EMPTY || cell === null) {
        continue;
      }
      const type = cell.includes("beagle") ? "beagle" : "corgi";
      const isKing = cell.includes("-king");
      const isAnimating =
        anim !== null && anim.fromRow === row && anim.fromCol === col;

      out.push({
        key: `piece-${row}-${col}`,
        boardRow: row,
        boardCol: col,
        type,
        isKing,
        pointerTarget: isPiecePointerTarget(cell, playMode, myPlayer),
        animationId: isAnimating ? anim.animationId : null,
      });
    }
  }

  return out;
}
