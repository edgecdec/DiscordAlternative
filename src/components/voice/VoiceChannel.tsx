"use client";

import { useCallback, useEffect, useState } from "react";
import { Box, Typography, IconButton, CircularProgress, Avatar } from "@mui/material";
import { Mic, MicOff, CallEnd } from "@mui/icons-material";
import {
  LiveKitRoom,
  RoomAudioRenderer,
  useParticipants,
  useLocalParticipant,
  useConnectionState,
  useIsSpeaking,
} from "@livekit/components-react";
import { Track, ConnectionState } from "livekit-client";
import type { Participant } from "livekit-client";

const LIVEKIT_URL = process.env.NEXT_PUBLIC_LIVEKIT_URL;

interface VoiceChannelProps {
  channelId: string;
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

function RoomContent({ onDisconnect }: { onDisconnect: () => void }) {
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
      <RoomAudioRenderer />
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

export default function VoiceChannel({ channelId }: VoiceChannelProps) {
  const [token, setToken] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [joined, setJoined] = useState(false);

  const fetchToken = useCallback(async () => {
    setError(null);
    try {
      const res = await fetch("/api/livekit/token", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ channelId }),
      });
      if (!res.ok) {
        const data = await res.json();
        setError(data.error || "Failed to get token");
        return;
      }
      const data = await res.json();
      setToken(data.token);
    } catch {
      setError("Failed to connect to voice server");
    }
  }, [channelId]);

  useEffect(() => {
    setToken(null);
    setJoined(false);
    setError(null);
  }, [channelId]);

  const handleJoin = useCallback(() => {
    setJoined(true);
    fetchToken();
  }, [fetchToken]);

  const handleDisconnect = useCallback(() => {
    setToken(null);
    setJoined(false);
  }, []);

  if (error) {
    return (
      <Box sx={{ flex: 1, display: "flex", flexDirection: "column", justifyContent: "center", alignItems: "center", gap: 2 }}>
        <Typography color="error">{error}</Typography>
        <IconButton onClick={handleJoin} color="primary">
          <Mic />
        </IconButton>
      </Box>
    );
  }

  if (!joined) {
    return (
      <Box sx={{ flex: 1, display: "flex", flexDirection: "column", justifyContent: "center", alignItems: "center", gap: 2 }}>
        <Typography color="text.secondary">Click to join voice channel</Typography>
        <IconButton onClick={handleJoin} color="primary" sx={{ bgcolor: "action.hover", p: 2 }}>
          <Mic sx={{ fontSize: 32 }} />
        </IconButton>
      </Box>
    );
  }

  if (!token) {
    return (
      <Box sx={{ flex: 1, display: "flex", justifyContent: "center", alignItems: "center" }}>
        <CircularProgress size={32} />
      </Box>
    );
  }

  return (
    <Box sx={{ flex: 1, display: "flex", flexDirection: "column" }}>
      <LiveKitRoom
        serverUrl={LIVEKIT_URL}
        token={token}
        connect={true}
        audio={true}
        onDisconnected={handleDisconnect}
        style={{ display: "flex", flexDirection: "column", flex: 1 }}
      >
        <RoomContent onDisconnect={handleDisconnect} />
      </LiveKitRoom>
    </Box>
  );
}
