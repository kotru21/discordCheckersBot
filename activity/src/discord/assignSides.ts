import type { Player } from "@shared/types/game.types";

export function assignPlayerSide(
  participantIds: string[],
  userId: string
): Player | null {
  if (participantIds[0] === userId) {
    return "beagle";
  }
  if (participantIds[1] === userId) {
    return "corgi";
  }
  return null;
}
