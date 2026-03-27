"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Avatar, Box, List, ListItemButton, ListItemAvatar, ListItemText, Typography } from "@mui/material";
import { ChatBubbleOutline } from "@mui/icons-material";

interface Conversation {
  user: { id: string; username: string; avatarUrl: string | null };
  lastMessageAt: string;
}

function formatTime(iso: string): string {
  const d = new Date(iso);
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffDays = Math.floor(diffMs / 86_400_000);
  if (diffDays === 0) return d.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });
  if (diffDays === 1) return "Yesterday";
  return d.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

export default function DMPage() {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  const fetchConversations = useCallback(async () => {
    const res = await fetch("/api/dm/conversations");
    if (res.ok) {
      const data = await res.json();
      setConversations(data.conversations);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchConversations();
  }, [fetchConversations]);

  return (
    <Box sx={{ flex: 1, display: "flex", flexDirection: "column", height: "100%" }}>
      <Box sx={{ px: 2, py: 1, borderBottom: 1, borderColor: "divider" }}>
        <Typography variant="subtitle1" fontWeight={700}>Direct Messages</Typography>
      </Box>
      {loading ? (
        <Box sx={{ flex: 1, display: "flex", justifyContent: "center", alignItems: "center" }}>
          <Typography color="text.secondary">Loading…</Typography>
        </Box>
      ) : conversations.length === 0 ? (
        <Box sx={{ flex: 1, display: "flex", flexDirection: "column", justifyContent: "center", alignItems: "center", gap: 1 }}>
          <ChatBubbleOutline sx={{ fontSize: 48, color: "text.disabled" }} />
          <Typography color="text.secondary">No conversations yet</Typography>
        </Box>
      ) : (
        <List sx={{ flex: 1, overflowY: "auto", p: 0 }}>
          {conversations.map((c) => (
            <ListItemButton key={c.user.id} onClick={() => router.push(`/dm/${c.user.id}`)}>
              <ListItemAvatar>
                <Avatar src={c.user.avatarUrl ?? undefined} sx={{ bgcolor: "primary.main" }}>
                  {c.user.username[0].toUpperCase()}
                </Avatar>
              </ListItemAvatar>
              <ListItemText
                primary={c.user.username}
                secondary={formatTime(c.lastMessageAt)}
              />
            </ListItemButton>
          ))}
        </List>
      )}
    </Box>
  );
}
