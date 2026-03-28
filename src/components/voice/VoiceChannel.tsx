"use client";

import { useCallback } from "react";
import { Box, Typography, IconButton, CircularProgress, Avatar } from "@mui/material";
import { Mic, MicOff, CallEnd } from "@mui/icons-material";
import {
  useParticipants,
  useLocalParticipant,
  useConnectionState,
  useIsSpeaking,
} from "@livekit/components-react";
import { ConnectionState } from "livekit-client";
import type { Participant } from "livekit-client";
import { useVoice } from "@/hooks/useVoice";

interface VoiceChannelProps {
  channelId: string;
  channelName: string;
  serverId: string;
}

function ParticipantTile({ participant }: { participant: Participant }) {
  const isSpeaking = useIsSpeaking(participant);
  const displayName = participant.name || participant.identity;

  return (
    <Box sx={{ display: "flex", alignItems: "center", gap: 1.5, px: 2, py: 1 }}>
      <Avatar
        sx={{
          width: 36,
          height: 36,
          bgcolor: "primary.main",
          border: isSpeaking ? 2 : 0,
          borderColor: "success.main",
          fontSize: 16,
        }}
      >
        {displayName.charAt(0).toUpperCase()}
      </Avatar>
      <Typography variant="body2" color="text.primary">
        {displayName}
      </Typography>
      {!participant.isMicrophoneEnabled && (
        <MicOff sx={{ fontSize: 16, color: "text.secondary" }} />
      )}
    </Box>
  );
}

function ConnectedView({ onDisconnect }: { onDisconnect: () => void }) {
  const participants = useParticipants();
  const { isMicrophoneEnabled, localParticipant } = useLocalParticipant();
  const connectionState = useConnectionState();

  const toggleMic = useCallback(async () => {
    await localParticipant.setMicrophoneEnabled(!isMicrophoneEnabled);
  }, [localParticipant, isMicrophoneEnabled]);

  if (connectionState === ConnectionState.Connecting) {
    return (
      <Box sx={{ flex: 1, display: "flex", justifyContent: "center", alignItems: "center" }}>
        <CircularProgress size={32} />
      </Box>
    );
  }

  return (
    <>
      <Box sx={{ flex: 1, overflowY: "auto", py: 1 }}>
        {participants.map((p) => (
          <ParticipantTile key={p.identity} participant={p} />
        ))}
      </Box>
      <Box
        sx={{
          display: "flex",
          justifyContent: "center",
          gap: 2,
          py: 2,
          borderTop: 1,
          borderColor: "divider",
        }}
      >
        <IconButton onClick={toggleMic} color={isMicrophoneEnabled ? "default" : "error"}>
          {isMicrophoneEnabled ? <Mic /> : <MicOff />}
        </IconButton>
        <IconButton onClick={onDisconnect} color="error">
          <CallEnd />
        </IconButton>
      </Box>
    </>
  );
}

export default function VoiceChannel({ channelId, channelName, serverId }: VoiceChannelProps) {
  const { voice, joinVoice, disconnectVoice } = useVoice();
  const isConnectedHere = voice?.channelId === channelId;

  const handleJoin = useCallback(async () => {
    try {
      await joinVoice({ channelId, channelName, serverId });
    } catch {
      // error handled by provider
    }
  }, [joinVoice, channelId, channelName, serverId]);

  if (!isConnectedHere) {
    return (
      <Box sx={{ flex: 1, display: "flex", flexDirection: "column", justifyContent: "center", alignItems: "center", gap: 2 }}>
        <Typography color="text.secondary">
          {voice ? "Connected to another voice channel" : "Click to join voice channel"}
        </Typography>
        <IconButton onClick={handleJoin} color="primary" sx={{ bgcolor: "action.hover", p: 2 }}>
          <Mic sx={{ fontSize: 32 }} />
        </IconButton>
      </Box>
    );
  }

  return (
    <Box sx={{ flex: 1, display: "flex", flexDirection: "column" }}>
      <ConnectedView onDisconnect={disconnectVoice} />
    </Box>
  );
}
