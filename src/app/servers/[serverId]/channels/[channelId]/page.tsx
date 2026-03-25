"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { Box, Typography } from "@mui/material";
import { Tag } from "@mui/icons-material";
import { useSocket } from "@/hooks/useSocket";
import MessageList from "@/components/chat/MessageList";
import MessageInput from "@/components/chat/MessageInput";
import TypingIndicator from "@/components/chat/TypingIndicator";

interface ChannelInfo {
  name: string;
  type: string;
}

export default function ChannelPage() {
  const params = useParams();
  const channelId = params?.channelId as string;
  const serverId = params?.serverId as string;
  const [channel, setChannel] = useState<ChannelInfo | null>(null);
  const { joinChannel, leaveChannel } = useSocket();

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

  useEffect(() => {
    if (!channelId) return;
    joinChannel(channelId);
    return () => {
      leaveChannel(channelId);
    };
  }, [channelId, joinChannel, leaveChannel]);

  const isText = !channel || channel.type === "TEXT";

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
        <Tag sx={{ color: "text.secondary", fontSize: 20 }} />
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
        <Box sx={{ flex: 1, display: "flex", justifyContent: "center", alignItems: "center" }}>
          <Typography color="text.secondary">
            Voice channels are not yet supported.
          </Typography>
        </Box>
      )}
    </Box>
  );
}
