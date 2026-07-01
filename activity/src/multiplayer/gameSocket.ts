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



type ErrorMessage = {

  type: "error";

  message?: string;

};



function resolveApiHost(): string {

  const productionHost = "discord-checkers-server-2dbcedabcdf8.herokuapp.com";

  const raw =

    import.meta.env.VITE_API_HOST ??

    (import.meta.env.PROD ? productionHost : "localhost:3001");

  return raw.replace(/^https?:\/\//, "").replace(/\/$/, "");

}



function buildWebSocketUrl(instanceId: string): string {

  const query = `instanceId=${encodeURIComponent(instanceId)}`;

  const host = resolveApiHost();

  const protocol =

    import.meta.env.PROD || host !== "localhost:3001" ? "wss" : "ws";

  return `${protocol}://${host}/api/ws?${query}`;

}



export function connectGameSocket(

  instanceId: string,

  onState: (msg: RoomStateMessage) => void,

  onError?: (message: string) => void

): WebSocket {

  const socket = new WebSocket(buildWebSocketUrl(instanceId));



  socket.addEventListener("message", (event) => {

    const data = JSON.parse(String(event.data)) as RoomStateMessage | ErrorMessage;

    if (data.type === "state") {

      onState(data);

      return;

    }

    if (data.type === "error") {

      onError?.(data.message ?? "Move rejected");

    }

  });



  return socket;

}

