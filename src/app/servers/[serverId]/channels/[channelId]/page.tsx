"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { Box, Typography } from "@mui/material";
import { Tag, VolumeUp } from "@mui/icons-material";
import { useSocket } from "@/hooks/useSocket";
import MessageList from "@/components/chat/MessageList";
import MessageInput from "@/components/chat/MessageInput";
import TypingIndicator from "@/components/chat/TypingIndicator";
import VoiceChannel from "@/components/voice/VoiceChannel";

interface ChannelInfo {
  name: string;
  type: string;
}

export default function ChannelPage() {
  const params = useParams();
  const channelId = params?.channelId as string;
  const serverId = params?.serverId as string;
  const [channel, setChannel] = useState<ChannelInfo | null>(null);
  const { joinChannel, leaveChannel, connected } = useSocket();

  useEffect(() => {
    if (!serverId) return;
    fetch(`/api/servers/${serverId}`)
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (!data) return;
        const ch = data.server.channels.find(
          (c: { id: string; name: string; type: string }) => c.id === channelId
        );
        if (ch) setChannel({ name: ch.name, type: ch.type });
      });
  }, [serverId, channelId]);

  const isText = !channel || channel.type === "TEXT";
  const isVoice = channel?.type === "VOICE" || channel?.type === "VIDEO";
  const ChannelIcon = isVoice ? VolumeUp : Tag;

  useEffect(() => {
    if (!channelId || !connected || !isText) return;
    joinChannel(channelId);
    return () => {
      leaveChannel(channelId);
    };
  }, [channelId, connected, joinChannel, leaveChannel, isText]);

  return (
    <Box sx={{ flex: 1, display: "flex", flexDirection: "column", height: "100%" }}>
      <Box
        sx={{
          px: 2,
          py: 1,
          borderBottom: 1,
          borderColor: "divider",
          display: "flex",
          alignItems: "center",
          gap: 1,
        }}
      >
        <ChannelIcon sx={{ color: "text.secondary", fontSize: 20 }} />
        <Typography variant="subtitle1" fontWeight={700}>
          {channel?.name ?? "Loading..."}
        </Typography>
      </Box>
      {isText && channel ? (
        <>
          <MessageList channelId={channelId} />
          <TypingIndicator channelId={channelId} />
          <MessageInput channelId={channelId} />
        </>
      ) : !channel ? (
        <Box sx={{ flex: 1, display: "flex", justifyContent: "center", alignItems: "center" }}>
          <Typography color="text.secondary">Loading...</Typography>
        </Box>
      ) : (
        <VoiceChannel channelId={channelId} />
      )}
    </Box>
  );
}
