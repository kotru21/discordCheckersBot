import type { Board, Player } from "@shared/types/game.types";

export interface RoomStatePayload {
  board: Board;
  activePlayer: Player;
  players: { beagle: string | null; corgi: string | null };
  gameOver: boolean;
  winner: Player | null;
  pendingChain: { row: number; col: number } | null;
}

export type RoomStateMessage = {
  type: "state";
  payload: RoomStatePayload;
};

function buildWebSocketUrl(instanceId: string): string {
  const query = `instanceId=${encodeURIComponent(instanceId)}`;
  const inDiscord = new URLSearchParams(window.location.search).has("frame_id");

  // Inside Discord iframe, use relative URL so patchUrlMappings proxies to the API host
  if (inDiscord) {
    return `/api/ws?${query}`;
  }

  const protocol = window.location.protocol === "https:" ? "wss" : "ws";
  const host = import.meta.env.VITE_API_HOST ?? "localhost:3001";
  return `${protocol}://${host}/api/ws?${query}`;
}

export function connectGameSocket(
  instanceId: string,
  onState: (msg: RoomStateMessage) => void
): WebSocket {
  const socket = new WebSocket(buildWebSocketUrl(instanceId));

  socket.addEventListener("message", (event) => {
    const data = JSON.parse(String(event.data)) as RoomStateMessage;
    if (data.type === "state") {
      onState(data);
    }
  });

  return socket;
}
