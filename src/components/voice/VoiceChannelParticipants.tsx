"use client";

import { useEffect, useState, useCallback } from "react";
import { Box, Typography, Avatar } from "@mui/material";
import { useSocket } from "@/hooks/useSocket";
import type { VoiceBroadcastPayload, VoiceParticipantsPayload } from "@/types/socket";

interface VoiceParticipant {
  userId: string;
  username: string;
}

interface VoiceChannelParticipantsProps {
  channelId: string;
}

export default function VoiceChannelParticipants({ channelId }: VoiceChannelParticipantsProps) {
  const { socket } = useSocket();
  const [participants, setParticipants] = useState<VoiceParticipant[]>([]);

  const handleJoined = useCallback((payload: VoiceBroadcastPayload) => {
    if (payload.channelId !== channelId) return;
    setParticipants((prev) => {
      if (prev.some((p) => p.userId === payload.userId)) return prev;
      return [...prev, { userId: payload.userId, username: payload.username }];
    });
  }, [channelId]);

  const handleLeft = useCallback((payload: VoiceBroadcastPayload) => {
    if (payload.channelId !== channelId) return;
    setParticipants((prev) => prev.filter((p) => p.userId !== payload.userId));
  }, [channelId]);

  const handleList = useCallback((payload: VoiceParticipantsPayload) => {
    if (payload.channelId !== channelId) return;
    setParticipants(payload.participants);
  }, [channelId]);

  useEffect(() => {
    if (!socket) return;
    socket.on("voice:joined", handleJoined);
    socket.on("voice:left", handleLeft);
    socket.on("voice:participants", handleList);
    socket.emit("voice:participants", { channelId });
    return () => {
      socket.off("voice:joined", handleJoined);
      socket.off("voice:left", handleLeft);
      socket.off("voice:participants", handleList);
    };
  }, [socket, channelId, handleJoined, handleLeft, handleList]);

  if (participants.length === 0) return null;

  return (
    <Box sx={{ pl: 4, pr: 1, pb: 0.5 }}>
      {participants.map((p) => (
        <Box key={p.userId} sx={{ display: "flex", alignItems: "center", gap: 1, py: 0.25 }}>
          <Avatar sx={{ width: 20, height: 20, fontSize: 10, bgcolor: "primary.main" }}>
            {p.username.charAt(0).toUpperCase()}
          </Avatar>
          <Typography variant="caption" color="text.secondary" noWrap>
            {p.username}
          </Typography>
        </Box>
      ))}
    </Box>
  );
}
