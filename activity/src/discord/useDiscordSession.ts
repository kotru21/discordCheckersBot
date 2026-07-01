import { useEffect, useState } from "react";
import { bootstrapDiscordSession, type DiscordSession } from "./bootstrap";

interface SessionState {
  session: DiscordSession | null;
  loading: boolean;
  error: string | null;
}

export function useDiscordSession(): SessionState {
  const [state, setState] = useState<SessionState>({
    session: null,
    loading: true,
    error: null,
  });

  useEffect(() => {
    bootstrapDiscordSession()
      .then((session) => setState({ session, loading: false, error: null }))
      .catch((err: unknown) => {
        const message =
          err instanceof Error ? err.message : "Discord bootstrap failed";
        setState({ session: null, loading: false, error: message });
      });
  }, []);

  return state;
}
