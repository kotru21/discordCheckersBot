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
  const setPlayMode = useGameStore((s) => s.setPlayMode);
  const participants = useGameStore((s) => s.participants);

  useEffect(() => {
    const syncParticipants = async () => {
      const { participants: connected } =
        await discordSdk.commands.getActivityInstanceConnectedParticipants();
      const ids = connected.map((p) => p.id);
      setParticipants(ids);
      if (ids.length >= 2) {
        setPlayMode("discord_pvp");
        onStart();
      }
    };

    const onParticipantsUpdate = ({
      participants: connected,
    }: {
      participants: Array<{ id: string }>;
    }) => {
      const ids = connected.map((p) => p.id);
      setParticipants(ids);
      if (ids.length >= 2) {
        setPlayMode("discord_pvp");
        onStart();
      }
    };

    void syncParticipants();
    void discordSdk.subscribe(
      "ACTIVITY_INSTANCE_PARTICIPANTS_UPDATE",
      onParticipantsUpdate
    );

    return () => {
      void discordSdk.unsubscribe(
        "ACTIVITY_INSTANCE_PARTICIPANTS_UPDATE",
        onParticipantsUpdate
      );
    };
  }, [userId, onStart, setParticipants, setPlayMode]);

  const previewSide = assignPlayerSide(participants, userId);

  return (
    <div className="activity-lobby">
      <h1>Beagle vs Corgi</h1>
      <p>Waiting for opponent… ({participants.length}/2)</p>
      <p>
        {previewSide
          ? `Likely side: ${previewSide} (confirmed when game starts)`
          : "Side assigned when both players join"}
      </p>
    </div>
  );
}
