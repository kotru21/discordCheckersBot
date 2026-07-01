import type { Player } from "@shared/types/game.types";

export interface RoomPlayers {
  beagle: string | null;
  corgi: string | null;
}

/** Lobby preview only — Discord participant order is not reliable across clients. */
export function assignPlayerSide(
  participantIds: string[],
  userId: string
): Player | null {
  const sortedIds = [...participantIds].sort();
  const index = sortedIds.indexOf(userId);
  if (index === 0) {
    return "beagle";
  }
  if (index === 1) {
    return "corgi";
  }
  return null;
}

/** Authoritative side from server room state. */
export function resolvePlayerSideFromRoom(
  players: RoomPlayers,
  userId: string
): Player | null {
  if (players.beagle === userId) {
    return "beagle";
  }
  if (players.corgi === userId) {
    return "corgi";
  }
  return null;
}
