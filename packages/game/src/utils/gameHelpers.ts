import {
  BOT,
  BOT_KING,
  PLAYER,
  PLAYER_KING,
  EMPTY,
  BOARD_SIZE,
} from "../config/constants";
import { logger } from "../logger";
import type { Board, PieceType, Player } from "../types/game.types";

export function isMyTurn(
  activePlayer: Player,
  myPlayer: Player | null
): boolean {
  return myPlayer !== null && activePlayer === myPlayer;
}

export const pieceUtils = {
  isPlayerPiece: (piece: PieceType) =>
    piece === PLAYER || piece === PLAYER_KING,
  isBotPiece: (piece: PieceType) => piece === BOT || piece === BOT_KING,
  isKing: (piece: PieceType) => piece === PLAYER_KING || piece === BOT_KING,
  isEmpty: (piece: PieceType) => piece === EMPTY,

  getPieceOwner: (piece: PieceType) => {
    if (pieceUtils.isPlayerPiece(piece)) {
      return "player" as const;
    }
    if (pieceUtils.isBotPiece(piece)) {
      return "bot" as const;
    }
    return null;
  },
};

export const boardUtils = {
  isValidPosition: (row: number, col: number) => {
    return row >= 0 && row < BOARD_SIZE && col >= 0 && col < BOARD_SIZE;
  },

  isDarkSquare: (row: number, col: number) => {
    return (row + col) % 2 === 1;
  },

  isValidSquare: (row: number, col: number) => {
    return (
      boardUtils.isValidPosition(row, col) && boardUtils.isDarkSquare(row, col)
    );
  },

  copyBoard: (board: Board): Board => {
    return board.map((row) => [...row]);
  },

  countPieces: (board: Board) => {
    let playerPieces = 0;
    let botPieces = 0;
    let playerKings = 0;
    let botKings = 0;

    for (let row = 0; row < BOARD_SIZE; row++) {
      for (let col = 0; col < BOARD_SIZE; col++) {
        const piece = board[row][col];
        if (piece === PLAYER) {
          playerPieces++;
        } else if (piece === BOT) {
          botPieces++;
        } else if (piece === PLAYER_KING) {
          playerKings++;
        } else if (piece === BOT_KING) {
          botKings++;
        }
      }
    }

    return { playerPieces, botPieces, playerKings, botKings };
  },
};

export const validationUtils = {
  validateMove: (
    board: Board,
    fromRow: number,
    fromCol: number,
    toRow: number,
    toCol: number
  ) => {
    if (
      !boardUtils.isValidSquare(fromRow, fromCol) ||
      !boardUtils.isValidSquare(toRow, toCol)
    ) {
      throw new Error("Недопустимые координаты хода");
    }

    if (pieceUtils.isEmpty(board[fromRow][fromCol])) {
      throw new Error("Нет фигуры для перемещения");
    }

    if (!pieceUtils.isEmpty(board[toRow][toCol])) {
      throw new Error("Целевая клетка занята");
    }

    return true;
  },

  validateBoard: (board: Board) => {
    if (!Array.isArray(board) || board.length !== BOARD_SIZE) {
      throw new Error("Неверный размер доски");
    }

    for (const row of board) {
      if (!Array.isArray(row) || row.length !== BOARD_SIZE) {
        throw new Error("Неверный размер строки доски");
      }
    }

    return true;
  },

  validateInternationalDraughtsRules: (board: Board) => {
    try {
      validationUtils.validateBoard(board);

      let playerCount = 0;
      let botCount = 0;

      for (let row = 0; row < BOARD_SIZE; row++) {
        for (let col = 0; col < BOARD_SIZE; col++) {
          const piece = board[row][col];

          if (piece !== EMPTY) {
            if (!boardUtils.isDarkSquare(row, col)) {
              throw new Error(
                `Фигура на светлой клетке (${row}, ${col}) - нарушение правил международных шашек`
              );
            }

            if (pieceUtils.isPlayerPiece(piece)) {
              playerCount++;
            } else if (pieceUtils.isBotPiece(piece)) {
              botCount++;
            }
          }
        }
      }

      if (playerCount > 20 || botCount > 20) {
        throw new Error(
          "Превышено максимальное количество фигур для международных шашек"
        );
      }

      return true;
    } catch (error) {
      logger.error(
        "Ошибка валидации правил международных шашек:",
        (error as Error).message
      );
      throw error;
    }
  },
};
