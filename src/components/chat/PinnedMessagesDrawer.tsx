"use client";

import { useCallback, useEffect, useState } from "react";
import { Avatar, Box, Drawer, IconButton, Typography } from "@mui/material";
import { Close, PushPin } from "@mui/icons-material";
import type { SocketMessage, PinTogglePayload } from "@/types/socket";
import { useSocket } from "@/hooks/useSocket";
import MentionText from "@/components/chat/MentionText";

interface PinnedMessagesDrawerProps {
  open: boolean;
  onClose: () => void;
  channelId: string;
}

const DRAWER_WIDTH = 340;

function formatTimestamp(iso: string): string {
  return new Date(iso).toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

export default function PinnedMessagesDrawer({ open, onClose, channelId }: PinnedMessagesDrawerProps) {
  const [pins, setPins] = useState<SocketMessage[]>([]);
  const [loading, setLoading] = useState(false);
  const { socket } = useSocket();

  useEffect(() => {
    if (!open) return;
    setLoading(true);
    fetch(`/api/channels/${channelId}/pins`)
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data?.messages) setPins(data.messages);
      })
      .finally(() => setLoading(false));
  }, [open, channelId]);

  const handlePinToggle = useCallback((payload: PinTogglePayload) => {
    if (payload.channelId !== channelId) return;
    if (payload.pinned) {
      // Refetch to get full message data
      fetch(`/api/channels/${channelId}/pins`)
        .then((res) => (res.ok ? res.json() : null))
        .then((data) => {
          if (data?.messages) setPins(data.messages);
        });
    } else {
      setPins((prev) => prev.filter((m) => m.id !== payload.messageId));
    }
  }, [channelId]);

  useEffect(() => {
    if (!socket) return;
    socket.on("pin:toggle", handlePinToggle);
    return () => { socket.off("pin:toggle", handlePinToggle); };
  }, [socket, handlePinToggle]);

  return (
    <Drawer anchor="right" open={open} onClose={onClose}>
      <Box sx={{ width: DRAWER_WIDTH, display: "flex", flexDirection: "column", height: "100%" }}>
        <Box sx={{ px: 2, py: 1.5, display: "flex", alignItems: "center", borderBottom: 1, borderColor: "divider" }}>
          <PushPin sx={{ fontSize: 20, mr: 1, color: "text.secondary" }} />
          <Typography variant="subtitle1" fontWeight={700} sx={{ flex: 1 }}>
            Pinned Messages
          </Typography>
          <IconButton size="small" onClick={onClose} aria-label="Close pinned messages">
            <Close sx={{ fontSize: 20 }} />
          </IconButton>
        </Box>
        <Box sx={{ flex: 1, overflowY: "auto", px: 2, py: 1 }}>
          {loading && (
            <Typography color="text.secondary" sx={{ py: 2, textAlign: "center" }}>Loading…</Typography>
          )}
          {!loading && pins.length === 0 && (
            <Typography color="text.secondary" sx={{ py: 4, textAlign: "center" }}>
              No pinned messages in this channel.
            </Typography>
          )}
          {pins.map((msg) => (
            <Box
              key={msg.id}
              sx={{ display: "flex", gap: 1.5, py: 1, borderBottom: 1, borderColor: "divider" }}
            >
              <Avatar
                sx={{ width: 32, height: 32, bgcolor: "primary.main", fontSize: 13 }}
                src={msg.author.avatarUrl ?? undefined}
              >
                {msg.author.username[0].toUpperCase()}
              </Avatar>
              <Box sx={{ minWidth: 0, flex: 1 }}>
                <Box sx={{ display: "flex", alignItems: "baseline", gap: 1 }}>
                  <Typography variant="body2" fontWeight={600}>{msg.author.username}</Typography>
                  <Typography variant="caption" color="text.secondary">{formatTimestamp(msg.createdAt)}</Typography>
                </Box>
                <Typography variant="body2" sx={{ whiteSpace: "pre-wrap", wordBreak: "break-word" }}>
                  <MentionText content={msg.content} />
                </Typography>
              </Box>
            </Box>
          ))}
        </Box>
      </Box>
    </Drawer>
  );
}
