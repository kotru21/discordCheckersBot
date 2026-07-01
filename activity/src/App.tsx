import React, { useState } from "react";
import { GameProvider } from "./contexts/GameContext";
import { GameBoard } from "./components/GameBoard";
import { MainMenu } from "./components/MainMenu";
import { ActivityLobby } from "./discord/ActivityLobby";
import { useDiscordSessionContext } from "./discord/ActivityShell";

const inDiscord = new URLSearchParams(window.location.search).has("frame_id");

const App = () => {
  const session = useDiscordSessionContext();
  const [gameStarted, setGameStarted] = useState(!inDiscord);

  if (inDiscord && session && !gameStarted) {
    return (
      <ActivityLobby
        userId={session.userId}
        onStart={() => setGameStarted(true)}
      />
    );
  }

  return (
    <GameProvider>
      {gameStarted ? (
        <GameBoard onReturnToMenu={() => setGameStarted(false)} />
      ) : (
        <MainMenu onStartGame={() => setGameStarted(true)} />
      )}
    </GameProvider>
  );
};

export default App;
