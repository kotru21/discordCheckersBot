import { useCallback, useEffect, useRef, type RefObject } from "react";
import { GAME_MODES } from "@shared/config/constants";
import type { Board } from "@shared/types/game.types";
import type { Player } from "@shared/types/game.types";
import type { DiscordSession } from "../discord/bootstrap";
import { useDiscordWsAuth } from "../discord/discordWsAuthContext";
import { resolvePlayerSideFromRoom } from "../discord/assignSides";
import { getValidMovesWithCapturePriority } from "../services/MoveService";
import { useGameStore } from "../store/gameStore";
import { createGameSocketConnection } from "./gameSocket";
import type { RoomStatePayload } from "./gameSocket";
import type { PvpBoardSyncBridge } from "./usePvpBoardSync";

function buildGameMessage(
  activePlayer: Player,
  myPlayer: Player | null,
  gameOver: boolean,
  winner: Player | null,
  players: RoomStatePayload["players"]
): string {
  if (!gameOver && myPlayer && (!players.beagle || !players.corgi)) {
    return "Waiting for opponent…";
  }

  if (gameOver) {
    if (winner && myPlayer && winner === myPlayer) {
      return "You won!";
    }
    if (winner && myPlayer) {
      return "You lost!";
    }
    return "Game over";
  }
  if (myPlayer && activePlayer === myPlayer) {
    return `Your turn (${myPlayer})`;
  }
  if (myPlayer) {
    return `Opponent's turn… (you are ${myPlayer})`;
  }
  return "Connecting to game…";
}

function applyChainSelection(
  payload: RoomStatePayload,
  myPlayer: Player | null,
  setSelectedPiece: (piece: { row: number; col: number } | null) => void,
  setValidMoves: (moves: { row: number; col: number }[]) => void,
  setGameMessage: (message: string) => void
): boolean {
  const chain = payload.pendingChain;
  const isMyTurn =
    myPlayer !== null &&
    payload.activePlayer === myPlayer &&
    !payload.gameOver;

  if (!chain || !isMyTurn) {
    setSelectedPiece(null);
    setValidMoves([]);
    return false;
  }

  const { moves, mustCapture } = getValidMovesWithCapturePriority(
    payload.board,
    chain.row,
    chain.col,
    GAME_MODES.CLASSIC
  );
  setSelectedPiece({ row: chain.row, col: chain.col });
  setValidMoves([...moves]);
  if (mustCapture && moves.length > 0) {
    setGameMessage("Continue capture! Finish the chain.");
  }
  return true;
}

export function useMultiplayerSync(
  session: DiscordSession | null,
  pvpBridgeRef: RefObject<PvpBoardSyncBridge | null>
) {
  const wsAccessToken = useDiscordWsAuth();
  const playMode = useGameStore((s) => s.playMode);
  const setBoard = useGameStore((s) => s.setBoard);
  const setActivePlayer = useGameStore((s) => s.setActivePlayer);
  const setMyPlayer = useGameStore((s) => s.setMyPlayer);
  const setGameOver = useGameStore((s) => s.setGameOver);
  const setGameMessage = useGameStore((s) => s.setGameMessage);
  const setSelectedPiece = useGameStore((s) => s.setSelectedPiece);
  const setValidMoves = useGameStore((s) => s.setValidMoves);

  const connectionRef = useRef<ReturnType<typeof createGameSocketConnection> | null>(
    null
  );
  const prevBoardRef = useRef<Board | null>(null);

  useEffect(() => {
    if (playMode !== "discord_pvp" || !session || !wsAccessToken) {
      return;
    }

    const connection = createGameSocketConnection(
      session.instanceId,
      wsAccessToken,
      {
        onState: ({ payload }) => {
          const prevBoard =
            prevBoardRef.current ?? useGameStore.getState().board;
          const myPlayer = resolvePlayerSideFromRoom(
            payload.players,
            session.userId
          );

          const applyStoreUpdate = () => {
            setMyPlayer(myPlayer);
            setBoard(payload.board);
            setActivePlayer(payload.activePlayer);
            setGameOver(payload.gameOver);
            setGameMessage(
              buildGameMessage(
                payload.activePlayer,
                myPlayer,
                payload.gameOver,
                payload.winner,
                payload.players
              )
            );
            prevBoardRef.current = payload.board;

            if (
              !applyChainSelection(
                payload,
                myPlayer,
                setSelectedPiece,
                setValidMoves,
                setGameMessage
              )
            ) {
              setSelectedPiece(null);
              setValidMoves([]);
            }
          };

          const bridge = pvpBridgeRef.current;
          if (bridge) {
            bridge.handleIncomingState(prevBoard, payload, applyStoreUpdate);
          } else {
            applyStoreUpdate();
          }
        },
        onError: (message) => {
          setGameMessage(message);
        },
        onConnectionChange: (connected) => {
          if (!connected) {
            setGameMessage("Reconnecting…");
          }
        },
      }
    );

    connectionRef.current = connection;

    return () => {
      connection.close();
      connectionRef.current = null;
      prevBoardRef.current = null;
    };
  }, [
    playMode,
    session,
    wsAccessToken,
    pvpBridgeRef,
    setBoard,
    setActivePlayer,
    setMyPlayer,
    setGameOver,
    setGameMessage,
    setSelectedPiece,
    setValidMoves,
  ]);

  const sendMove = useCallback(
    (fromRow: number, fromCol: number, toRow: number, toCol: number) => {
      if (!session || playMode !== "discord_pvp") {
        return;
      }
      connectionRef.current?.sendMove(fromRow, fromCol, toRow, toCol);
    },
    [session, playMode]
  );

  const sendRematch = useCallback(() => {
    if (!session || playMode !== "discord_pvp") {
      return;
    }
    connectionRef.current?.sendRematch();
  }, [session, playMode]);

  return { sendMove, sendRematch };
}
