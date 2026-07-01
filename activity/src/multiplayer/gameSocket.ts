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

export function connectGameSocket(
  instanceId: string,
  onState: (msg: RoomStateMessage) => void
): WebSocket {
  const protocol = window.location.protocol === "https:" ? "wss" : "ws";
  const host = import.meta.env.VITE_API_HOST ?? "localhost:3001";
  const socket = new WebSocket(
    `${protocol}://${host}/api/ws?instanceId=${instanceId}`
  );

  socket.addEventListener("message", (event) => {
    const data = JSON.parse(String(event.data)) as RoomStateMessage;
    if (data.type === "state") {
      onState(data);
    }
  });

  return socket;
}
