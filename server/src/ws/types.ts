export interface WsData {
  instanceId: string;
  userId: string | null;
  authenticated: boolean;
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

export type ClientMessage = AuthMessage | MoveMessage;

export type ServerMessage =
  | { type: "auth_required" }
  | { type: "auth_ok" }
  | { type: "error"; message: string }
  | { type: "state"; payload: unknown };
