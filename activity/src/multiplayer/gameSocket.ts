import type { Board, Player } from "@shared/types/game.types";
import { buildWebSocketUrl } from "@shared/config/apiHost";

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

const MAX_RECONNECT_ATTEMPTS = 8;
const BASE_RECONNECT_MS = 1000;

function parseServerMessage(raw: string): ServerMessage | null {
  try {
    return JSON.parse(raw) as ServerMessage;
  } catch {
    return null;
  }
}

export interface GameSocketCallbacks {
  onState: (msg: RoomStateMessage) => void;
  onError?: (message: string) => void;
  onConnectionChange?: (connected: boolean) => void;
}

export interface GameSocketConnection {
  close: () => void;
  sendMove: (
    fromRow: number,
    fromCol: number,
    toRow: number,
    toCol: number
  ) => void;
  sendRematch: () => void;
}

export function createGameSocketConnection(
  instanceId: string,
  accessToken: string,
  callbacks: GameSocketCallbacks
): GameSocketConnection {
  let socket: WebSocket | null = null;
  let closed = false;
  let reconnectAttempts = 0;
  let reconnectTimer: ReturnType<typeof setTimeout> | null = null;

  const authenticate = () => {
    socket?.send(JSON.stringify({ type: "auth", accessToken }));
  };

  const scheduleReconnect = () => {
    if (closed || reconnectAttempts >= MAX_RECONNECT_ATTEMPTS) {
      if (!closed) {
        callbacks.onError?.("Connection lost");
      }
      return;
    }
    const delay = BASE_RECONNECT_MS * 2 ** reconnectAttempts;
    reconnectAttempts++;
    reconnectTimer = setTimeout(connect, delay);
  };

  const connect = () => {
    socket = new WebSocket(buildWebSocketUrl(instanceId));

    socket.addEventListener("open", () => {
      reconnectAttempts = 0;
      callbacks.onConnectionChange?.(true);
      authenticate();
    });

    socket.addEventListener("message", (event) => {
      const data = parseServerMessage(String(event.data));
      if (!data) {
        callbacks.onError?.("Invalid server message");
        return;
      }

      if (data.type === "state") {
        callbacks.onState(data);
        return;
      }

      if (data.type === "error") {
        callbacks.onError?.(data.message ?? "Request failed");
      }
    });

    socket.addEventListener("close", () => {
      callbacks.onConnectionChange?.(false);
      socket = null;
      if (!closed) {
        scheduleReconnect();
      }
    });

    socket.addEventListener("error", () => {
      callbacks.onError?.("WebSocket error");
    });
  };

  connect();

  return {
    close: () => {
      closed = true;
      if (reconnectTimer) {
        clearTimeout(reconnectTimer);
        reconnectTimer = null;
      }
      socket?.close();
      socket = null;
    },
    sendMove(fromRow, fromCol, toRow, toCol) {
      if (!socket || socket.readyState !== WebSocket.OPEN) {
        return;
      }
      socket.send(
        JSON.stringify({
          type: "move",
          move: { fromRow, fromCol, toRow, toCol },
        })
      );
    },
    sendRematch() {
      if (!socket || socket.readyState !== WebSocket.OPEN) {
        return;
      }
      socket.send(JSON.stringify({ type: "rematch" }));
    },
  };
}
