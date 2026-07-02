import {
  createInitialBoard,
  checkGameStatus,
  executeMove,
  getValidMovesWithCapturePriority,
  pieceUtils,
  type Board,
  type GameMode,
  type Player,
} from "@discord-checkers/game";

export interface MoveInput {
  fromRow: number;
  fromCol: number;
  toRow: number;
  toCol: number;
}

export interface RoomState {
  roomId: string;
  board: Board;
  activePlayer: Player;
  players: { beagle: string | null; corgi: string | null };
  gameMode: GameMode;
  pendingChain: { row: number; col: number } | null;
  gameOver: boolean;
  winner: Player | null;
}

const PVP_GAME_MODE: GameMode = "classic";

export class CheckersRoom {
  private state: RoomState;

  constructor(roomId: string) {
    this.state = {
      roomId,
      board: createInitialBoard(),
      activePlayer: "beagle",
      players: { beagle: null, corgi: null },
      gameMode: PVP_GAME_MODE,
      pendingChain: null,
      gameOver: false,
      winner: null,
    };
  }

  join(userId: string): RoomState {
    const { beagle, corgi } = this.state.players;

    if (beagle === userId || corgi === userId) {
      return this.getState();
    }

    if (!beagle) {
      this.state.players.beagle = userId;
      return this.getState();
    }

    if (!corgi && beagle !== userId) {
      this.state.players.corgi = userId;
      return this.getState();
    }

    throw new Error("Room is full");
  }

  leave(userId: string): RoomState {
    if (this.state.players.beagle === userId) {
      this.state.players.beagle = null;
    } else if (this.state.players.corgi === userId) {
      this.state.players.corgi = null;
    }
    return this.getState();
  }

  rematch(userId: string): RoomState {
    if (!this.state.gameOver) {
      throw new Error("Game is still in progress");
    }

    const { beagle, corgi } = this.state.players;
    if (userId !== beagle && userId !== corgi) {
      throw new Error("Not in this game");
    }

    const players = { beagle, corgi };
    this.state = {
      roomId: this.state.roomId,
      board: createInitialBoard(),
      activePlayer: "beagle",
      players,
      gameMode: PVP_GAME_MODE,
      pendingChain: null,
      gameOver: false,
      winner: null,
    };
    return this.getState();
  }

  getState(): RoomState {
    return structuredClone(this.state);
  }

  submitMove(userId: string, move: MoveInput): RoomState {
    if (this.state.gameOver) {
      throw new Error("Game over");
    }

    const expectedUser =
      this.state.activePlayer === "beagle"
        ? this.state.players.beagle
        : this.state.players.corgi;

    if (userId !== expectedUser) {
      throw new Error("Not your turn");
    }

    const { fromRow, fromCol, toRow, toCol } = move;

    if (this.state.pendingChain) {
      const { row, col } = this.state.pendingChain;
      if (fromRow !== row || fromCol !== col) {
        throw new Error("Must continue capture chain");
      }
    }

    const piece = this.state.board[fromRow]?.[fromCol] ?? null;
    const isBeagleTurn = this.state.activePlayer === "beagle";

    if (isBeagleTurn && !pieceUtils.isPlayerPiece(piece)) {
      throw new Error("Illegal move");
    }
    if (!isBeagleTurn && !pieceUtils.isBotPiece(piece)) {
      throw new Error("Illegal move");
    }

    const { moves } = getValidMovesWithCapturePriority(
      this.state.board,
      fromRow,
      fromCol,
      this.state.gameMode
    );

    const allowed = moves.some((m) => m.row === toRow && m.col === toCol);
    if (!allowed) {
      throw new Error("Illegal move");
    }

    const wasCapture =
      Math.abs(toRow - fromRow) >= 2 && Math.abs(toCol - fromCol) >= 2;

    this.state.board = executeMove(
      this.state.board,
      fromRow,
      fromCol,
      toRow,
      toCol
    );

    if (wasCapture) {
      const { moves: chainMoves, mustCapture } = getValidMovesWithCapturePriority(
        this.state.board,
        toRow,
        toCol,
        this.state.gameMode
      );

      if (mustCapture && chainMoves.length > 0) {
        this.state.pendingChain = { row: toRow, col: toCol };
        return this.finishIfGameOver();
      }
    }

    this.state.pendingChain = null;
    this.state.activePlayer =
      this.state.activePlayer === "beagle" ? "corgi" : "beagle";

    return this.finishIfGameOver();
  }

  private finishIfGameOver(): RoomState {
    const status = checkGameStatus(this.state.board, this.state.gameMode);
    if (status) {
      this.state.gameOver = true;
      this.state.winner = status;
      this.state.pendingChain = null;
    }
    return this.getState();
  }
}
