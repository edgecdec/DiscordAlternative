"use client";

import { useEffect, useRef, useState } from "react";
import { Avatar, Box, Typography } from "@mui/material";
import type { SocketMessage } from "@/types/socket";

interface MessageListProps {
  channelId: string;
}

function formatTimestamp(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

export default function MessageList({ channelId }: MessageListProps) {
  const [messages, setMessages] = useState<SocketMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setLoading(true);
    setMessages([]);
    fetch(`/api/channels/${channelId}/messages`)
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data?.messages) {
          setMessages(data.messages.reverse());
        }
      })
      .finally(() => setLoading(false));
  }, [channelId]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "instant" });
  }, [messages.length]);

  if (loading) {
    return (
      <Box sx={{ flex: 1, display: "flex", justifyContent: "center", alignItems: "center" }}>
        <Typography color="text.secondary">Loading messages…</Typography>
      </Box>
    );
  }

  if (messages.length === 0) {
    return (
      <Box sx={{ flex: 1, display: "flex", justifyContent: "center", alignItems: "center" }}>
        <Typography color="text.secondary">No messages yet. Start the conversation!</Typography>
      </Box>
    );
  }

  return (
    <Box sx={{ flex: 1, overflowY: "auto", px: 2, py: 1 }}>
      {messages.map((msg) => (
        <Box key={msg.id} sx={{ display: "flex", gap: 1.5, py: 0.75 }}>
          <Avatar
            sx={{ width: 36, height: 36, mt: 0.5, bgcolor: "primary.main", fontSize: 14 }}
            src={msg.author.avatarUrl ?? undefined}
          >
            {msg.author.username[0].toUpperCase()}
          </Avatar>
          <Box sx={{ minWidth: 0 }}>
            <Box sx={{ display: "flex", alignItems: "baseline", gap: 1 }}>
              <Typography variant="body2" fontWeight={600}>
                {msg.author.username}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                {formatTimestamp(msg.createdAt)}
              </Typography>
            </Box>
            <Typography
              variant="body2"
              sx={{
                whiteSpace: "pre-wrap",
                wordBreak: "break-word",
                color: msg.deleted ? "text.disabled" : "text.primary",
                fontStyle: msg.deleted ? "italic" : "normal",
              }}
            >
              {msg.deleted ? "This message has been deleted" : msg.content}
            </Typography>
          </Box>
        </Box>
      ))}
      <div ref={bottomRef} />
    </Box>
  );
}
