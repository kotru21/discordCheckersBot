import type { ReactNode } from "react";
import { useDiscordSession } from "./useDiscordSession";

export function ActivityShell({ children }: { children: ReactNode }) {
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

  return <>{children}</>;
}
