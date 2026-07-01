import { createContext, useContext } from "react";
import type { DiscordSession } from "./bootstrap";

export const DiscordSessionContext = createContext<DiscordSession | null>(null);

export function useDiscordSessionContext(): DiscordSession | null {
  return useContext(DiscordSessionContext);
}
