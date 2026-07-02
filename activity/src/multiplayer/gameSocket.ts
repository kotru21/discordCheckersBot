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

type AuthRequiredMessage = {
  type: "auth_required";
};

type AuthOkMessage = {
  type: "auth_ok";
};

type ServerMessage =
  | RoomStateMessage
  | ErrorMessage
  | AuthRequiredMessage
  | AuthOkMessage;

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

function parseServerMessage(raw: string): ServerMessage | null {
  try {
    return JSON.parse(raw) as ServerMessage;
  } catch {
    return null;
  }
}

export function connectGameSocket(
  instanceId: string,
  accessToken: string,
  onState: (msg: RoomStateMessage) => void,
  onError?: (message: string) => void
): WebSocket {
  const socket = new WebSocket(buildWebSocketUrl(instanceId));

  const authenticate = () => {
    socket.send(JSON.stringify({ type: "auth", accessToken }));
  };

  socket.addEventListener("open", authenticate);

  socket.addEventListener("message", (event) => {
    const data = parseServerMessage(String(event.data));
    if (!data) {
      onError?.("Invalid server message");
      return;
    }

    if (data.type === "state") {
      onState(data);
      return;
    }

    if (data.type === "error") {
      onError?.(data.message ?? "Request failed");
    }
  });

  return socket;
}
