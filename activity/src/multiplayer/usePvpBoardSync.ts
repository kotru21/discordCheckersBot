import { useCallback, useRef } from "react";
import type { PieceAnimationInfo } from "@shared/types/pieceAnimation.types";
import type { Board } from "@shared/types/game.types";
import { useAnimationStore } from "../features/animation";
import type { RoomStatePayload } from "./gameSocket";
import {
  detectBoardMove,
  isSameMove,
  type DetectedMove,
} from "./detectBoardMove";

export interface PvpBoardSyncBridge {
  playLocalMove: (move: DetectedMove) => void;
  handleIncomingState: (
    prevBoard: Board,
    payload: RoomStatePayload,
    applyStoreUpdate: () => void
  ) => void;
}

export function usePvpBoardSync(
  setCurrentAnimation: (animation: PieceAnimationInfo | null) => void
): PvpBoardSyncBridge {
  const { startAnimation } = useAnimationStore();
  const pendingLocalMoveRef = useRef<DetectedMove | null>(null);
  const queuedApplyRef = useRef<(() => void) | null>(null);

  const runAnimation = useCallback(
    (move: DetectedMove, onComplete: () => void) => {
      const animationId = startAnimation(
        move.fromRow,
        move.fromCol,
        move.toRow,
        move.toCol,
        move.wasCapture,
        () => {
          setCurrentAnimation(null);
          onComplete();
          if (queuedApplyRef.current) {
            const next = queuedApplyRef.current;
            queuedApplyRef.current = null;
            next();
          }
        }
      );

      setCurrentAnimation({
        fromRow: move.fromRow,
        fromCol: move.fromCol,
        toRow: move.toRow,
        toCol: move.toCol,
        animationId,
      });
    },
    [setCurrentAnimation, startAnimation]
  );

  const playLocalMove = useCallback(
    (move: DetectedMove) => {
      pendingLocalMoveRef.current = move;
      runAnimation(move, () => {
        pendingLocalMoveRef.current = null;
      });
    },
    [runAnimation]
  );

  const handleIncomingState = useCallback(
    (
      prevBoard: Board,
      payload: RoomStatePayload,
      applyStoreUpdate: () => void
    ) => {
      const detected = detectBoardMove(prevBoard, payload.board);
      const pending = pendingLocalMoveRef.current;

      if (detected && pending && isSameMove(detected, pending)) {
        pendingLocalMoveRef.current = null;
        queuedApplyRef.current = applyStoreUpdate;
        return;
      }

      if (detected) {
        runAnimation(detected, applyStoreUpdate);
        return;
      }

      pendingLocalMoveRef.current = null;
      applyStoreUpdate();
    },
    [runAnimation]
  );

  return { playLocalMove, handleIncomingState };
}
