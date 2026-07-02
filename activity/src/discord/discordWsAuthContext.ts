import { createContext, useContext } from "react";

export const DiscordWsAuthContext = createContext<string | null>(null);

export function useDiscordWsAuth(): string | null {
  return useContext(DiscordWsAuthContext);
}
