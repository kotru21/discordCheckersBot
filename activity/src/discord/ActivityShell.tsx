import {
  createContext,
  useContext,
  type ReactNode,
} from "react";
import { useDiscordSession } from "./useDiscordSession";
import type { DiscordSession } from "./bootstrap";

const inDiscord = new URLSearchParams(window.location.search).has("frame_id");

const DiscordSessionContext = createContext<DiscordSession | null>(null);

export function useDiscordSessionContext(): DiscordSession | null {
  return useContext(DiscordSessionContext);
}

function DiscordActivityShell({ children }: { children: ReactNode }) {
  const { session, loading, error } = useDiscordSession();

  if (loading) {
    return <div className="activity-loading">Connecting to Discord…</div>;
  }
  if (error) {
    return <div className="activity-error">{error}</div>;
  }
  if (!session) {
    return <div className="activity-error">No Discord session</div>;
  }

  return (
    <DiscordSessionContext.Provider value={session}>
      {children}
    </DiscordSessionContext.Provider>
  );
}

export function ActivityShell({ children }: { children: ReactNode }) {
  if (!inDiscord) {
    return (
      <DiscordSessionContext.Provider value={null}>
        {children}
      </DiscordSessionContext.Provider>
    );
  }

  return <DiscordActivityShell>{children}</DiscordActivityShell>;
}
