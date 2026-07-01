import { useEffect } from "react";
import { discordSdk } from "./bootstrap";
import { assignPlayerSide } from "./assignSides";
import { useGameStore } from "../store/gameStore";

interface ActivityLobbyProps {
  userId: string;
  onStart: () => void;
}

export function ActivityLobby({ userId, onStart }: ActivityLobbyProps) {
  const setParticipants = useGameStore((s) => s.setParticipants);
  const setMyPlayer = useGameStore((s) => s.setMyPlayer);
  const setPlayMode = useGameStore((s) => s.setPlayMode);
  const participants = useGameStore((s) => s.participants);

  useEffect(() => {
    const syncParticipants = async () => {
      const { participants: connected } =
        await discordSdk.commands.getActivityInstanceConnectedParticipants();
      const ids = connected.map((p) => p.id);
      setParticipants(ids);
      setMyPlayer(assignPlayerSide(ids, userId));
      if (ids.length >= 2) {
        setPlayMode("discord_pvp");
        onStart();
      }
    };

    void syncParticipants();
    const unsubscribe = discordSdk.subscribe(
      "ACTIVITY_INSTANCE_PARTICIPANTS_UPDATE",
      ({ participants: connected }) => {
        const ids = connected.map((p) => p.id);
        setParticipants(ids);
        setMyPlayer(assignPlayerSide(ids, userId));
        if (ids.length >= 2) {
          setPlayMode("discord_pvp");
          onStart();
        }
      }
    );

    return () => {
      void unsubscribe;
    };
  }, [userId, onStart, setParticipants, setMyPlayer, setPlayMode]);

  return (
    <div className="activity-lobby">
      <h1>Beagle vs Corgi</h1>
      <p>Waiting for opponent… ({participants.length}/2)</p>
      <p>You will be {assignPlayerSide(participants, userId) ?? "spectator"}</p>
    </div>
  );
}
