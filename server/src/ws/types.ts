export interface WsData {
  instanceId: string;
  userId: string | null;
  authenticated: boolean;
  rateLimitKey: string;
}

export interface AuthMessage {
  type: "auth";
  accessToken: string;
}

export interface MoveMessage {
  type: "move";
  move: {
    fromRow: number;
    fromCol: number;
    toRow: number;
    toCol: number;
  };
}

export interface RematchMessage {
  type: "rematch";
}

export type ClientMessage = AuthMessage | MoveMessage | RematchMessage;

export type ServerMessage =
  | { type: "auth_required" }
  | { type: "auth_ok" }
  | { type: "error"; message: string }
  | { type: "state"; payload: unknown };
