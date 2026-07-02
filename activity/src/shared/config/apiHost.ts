/** Hostname (with optional port) for the game API — no protocol or trailing slash. */
export function resolveApiHost(): string {
  const raw = import.meta.env.VITE_API_HOST;
  if (raw) {
    return raw.replace(/^https?:\/\//, "").replace(/\/$/, "");
  }
  if (import.meta.env.PROD) {
    throw new Error("VITE_API_HOST is required in production builds");
  }
  return "localhost:3001";
}

export function buildWebSocketUrl(instanceId: string): string {
  const query = `instanceId=${encodeURIComponent(instanceId)}`;
  const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
  return `${protocol}//${window.location.host}/api/ws?${query}`;
}
