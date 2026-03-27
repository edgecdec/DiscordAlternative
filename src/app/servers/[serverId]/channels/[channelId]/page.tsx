"use client";

import { useCallback, useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { Box, Typography, useMediaQuery } from "@mui/material";
import { Tag, VolumeUp } from "@mui/icons-material";
import { useSocket } from "@/hooks/useSocket";
import type { SocketMessage } from "@/types/socket";
import MessageList from "@/components/chat/MessageList";
import MessageInput from "@/components/chat/MessageInput";
import TypingIndicator from "@/components/chat/TypingIndicator";
import VoiceChannel from "@/components/voice/VoiceChannel";

interface ChannelInfo {
  name: string;
  type: string;
}

function markChannelRead(channelId: string) {
  fetch(`/api/channels/${channelId}/read`, { method: "PATCH" });
}

export default function ChannelPage() {
  const params = useParams();
  const channelId = params?.channelId as string;
  const serverId = params?.serverId as string;
  const [channel, setChannel] = useState<ChannelInfo | null>(null);
  const { socket, joinChannel, leaveChannel, connected } = useSocket();
  const isMobile = useMediaQuery("(max-width:767px)");
  const [replyTo, setReplyTo] = useState<SocketMessage | null>(null);

  useEffect(() => {
    setReplyTo(null);
  }, [channelId]);

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

  const onNewMessage = useCallback(() => {
    markChannelRead(channelId);
  }, [channelId]);

  useEffect(() => {
    if (!channelId || !isText) return;
    markChannelRead(channelId);
    if (!socket) return;
    socket.on("message:new", onNewMessage);
    return () => {
      socket.off("message:new", onNewMessage);
    };
  }, [channelId, isText, socket, onNewMessage]);

  return (
    <Box sx={{ flex: 1, display: "flex", flexDirection: "column", height: "100%" }}>
      <Box
        sx={{
          pl: isMobile ? 6 : 2,
          pr: 2,
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
          <MessageList channelId={channelId} onReply={setReplyTo} />
          <TypingIndicator channelId={channelId} />
          <MessageInput channelId={channelId} replyTo={replyTo} onCancelReply={() => setReplyTo(null)} />
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
