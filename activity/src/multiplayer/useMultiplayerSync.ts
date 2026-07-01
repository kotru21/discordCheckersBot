import { useCallback, useEffect, useRef } from "react";
import type { DiscordSession } from "../discord/bootstrap";
import { resolvePlayerSideFromRoom } from "../discord/assignSides";
import { useGameStore } from "../store/gameStore";
import { connectGameSocket } from "./gameSocket";
import type { Player } from "@shared/types/game.types";

function buildGameMessage(
  activePlayer: Player,
  myPlayer: Player | null,
  gameOver: boolean,
  winner: Player | null
): string {
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

export function useMultiplayerSync(session: DiscordSession | null) {
  const playMode = useGameStore((s) => s.playMode);
  const setBoard = useGameStore((s) => s.setBoard);
  const setActivePlayer = useGameStore((s) => s.setActivePlayer);
  const setMyPlayer = useGameStore((s) => s.setMyPlayer);
  const setGameOver = useGameStore((s) => s.setGameOver);
  const setGameMessage = useGameStore((s) => s.setGameMessage);
  const setSelectedPiece = useGameStore((s) => s.setSelectedPiece);
  const setValidMoves = useGameStore((s) => s.setValidMoves);

  const socketRef = useRef<WebSocket | null>(null);

  useEffect(() => {
    if (playMode !== "discord_pvp" || !session) {
      return;
    }

    const socket = connectGameSocket(
      session.instanceId,
      ({ payload }) => {
        const myPlayer = resolvePlayerSideFromRoom(
          payload.players,
          session.userId
        );
        setMyPlayer(myPlayer);
        setBoard(payload.board);
        setActivePlayer(payload.activePlayer);
        setGameOver(payload.gameOver);
        setGameMessage(
          buildGameMessage(
            payload.activePlayer,
            myPlayer,
            payload.gameOver,
            payload.winner
          )
        );
        setSelectedPiece(null);
        setValidMoves([]);
      },
      (message) => {
        setGameMessage(message);
      }
    );

    socketRef.current = socket;

    const sendJoin = () => {
      socket.send(
        JSON.stringify({ type: "join", userId: session.userId })
      );
    };

    if (socket.readyState === WebSocket.OPEN) {
      sendJoin();
    } else {
      socket.addEventListener("open", sendJoin, { once: true });
    }

    return () => {
      socket.close();
      socketRef.current = null;
    };
  }, [
    playMode,
    session,
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
      const socket = socketRef.current;
      if (!socket || socket.readyState !== WebSocket.OPEN) {
        return;
      }
      socket.send(
        JSON.stringify({
          type: "move",
          userId: session.userId,
          move: { fromRow, fromCol, toRow, toCol },
        })
      );
    },
    [session, playMode]
  );

  return { sendMove };
}
