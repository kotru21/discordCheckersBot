import { GAME_MODES } from "../config/constants";
import type { GameMode } from "../types/game.types";

export const isCrazyJumpsMode = (mode: GameMode): boolean =>
  mode === GAME_MODES.CRAZY_JUMPS;
