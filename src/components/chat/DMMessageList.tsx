"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Avatar, Box, CircularProgress, Typography } from "@mui/material";
import type { DirectMessagePayload } from "@/types/socket";
import { useSocket } from "@/hooks/useSocket";
import MentionText from "@/components/chat/MentionText";

interface DMMessageListProps {
  otherUserId: string;
}

function formatTimestamp(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleString(undefined, { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });
}

export default function DMMessageList({ otherUserId }: DMMessageListProps) {
  const [messages, setMessages] = useState<DirectMessagePayload[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const cursorRef = useRef<string | null>(null);
  const { socket } = useSocket();

  useEffect(() => {
    setLoading(true);
    setMessages([]);
    cursorRef.current = null;
    setHasMore(false);
    fetch(`/api/dm/${otherUserId}`)
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data?.messages) {
          const mapped: DirectMessagePayload[] = data.messages.map((m: DirectMessagePayload) => ({
            ...m,
            createdAt: m.createdAt,
            updatedAt: m.updatedAt,
          }));
          setMessages(mapped.reverse());
          cursorRef.current = data.nextCursor ?? null;
          setHasMore(!!data.nextCursor);
        }
      })
      .finally(() => setLoading(false));
  }, [otherUserId]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "instant" });
  }, [loading]);

  const loadOlder = useCallback(async () => {
    if (loadingMore || !cursorRef.current) return;
    setLoadingMore(true);
    const container = containerRef.current;
    const prevHeight = container?.scrollHeight ?? 0;
    try {
      const res = await fetch(`/api/dm/${otherUserId}?cursor=${cursorRef.current}`);
      if (!res.ok) return;
      const data = await res.json();
      if (data?.messages?.length) {
        const older: DirectMessagePayload[] = data.messages.reverse();
        setMessages((prev) => [...older, ...prev]);
        cursorRef.current = data.nextCursor ?? null;
        setHasMore(!!data.nextCursor);
        requestAnimationFrame(() => {
          if (container) container.scrollTop = container.scrollHeight - prevHeight;
        });
      } else {
        setHasMore(false);
        cursorRef.current = null;
      }
    } finally {
      setLoadingMore(false);
    }
  }, [otherUserId, loadingMore]);

  const handleScroll = useCallback(() => {
    const container = containerRef.current;
    if (!container || !hasMore || loadingMore) return;
    if (container.scrollTop === 0) loadOlder();
  }, [hasMore, loadingMore, loadOlder]);

  const handleNew = useCallback((msg: DirectMessagePayload) => {
    if (msg.senderId !== otherUserId && msg.receiverId !== otherUserId) return;
    setMessages((prev) => [...prev, msg]);
    requestAnimationFrame(() => {
      bottomRef.current?.scrollIntoView({ behavior: "smooth" });
    });
  }, [otherUserId]);

  useEffect(() => {
    if (!socket) return;
    socket.on("dm:new", handleNew);
    return () => { socket.off("dm:new", handleNew); };
  }, [socket, handleNew]);

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
    <Box ref={containerRef} onScroll={handleScroll} sx={{ flex: 1, overflowY: "auto", px: 2, py: 1 }}>
      {loadingMore && (
        <Box sx={{ display: "flex", justifyContent: "center", py: 1 }}>
          <CircularProgress size={24} />
        </Box>
      )}
      {messages.map((msg) => (
        <Box key={msg.id} sx={{ display: "flex", gap: 1.5, py: 0.75 }}>
          <Avatar
            sx={{ width: 36, height: 36, mt: 0.5, bgcolor: "primary.main", fontSize: 14 }}
            src={msg.sender.avatarUrl ?? undefined}
          >
            {msg.sender.username[0].toUpperCase()}
          </Avatar>
          <Box sx={{ minWidth: 0, flex: 1 }}>
            <Box sx={{ display: "flex", alignItems: "baseline", gap: 1 }}>
              <Typography variant="body2" fontWeight={600}>{msg.sender.username}</Typography>
              <Typography variant="caption" color="text.secondary">{formatTimestamp(msg.createdAt)}</Typography>
            </Box>
            <Typography variant="body2" sx={{ whiteSpace: "pre-wrap", wordBreak: "break-word" }}>
              <MentionText content={msg.content} />
            </Typography>
          </Box>
        </Box>
      ))}
      <div ref={bottomRef} />
    </Box>
  );
}
