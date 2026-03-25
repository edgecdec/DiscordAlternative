"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Avatar, Box, CircularProgress, Typography } from "@mui/material";
import type { SocketMessage, MessageDeletedPayload } from "@/types/socket";
import { useSocket } from "@/hooks/useSocket";

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
    fetch(`/api/channels/${channelId}/messages`)
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data?.messages) {
          setMessages(data.messages.reverse());
          cursorRef.current = data.nextCursor ?? null;
          setHasMore(!!data.nextCursor);
        }
      })
      .finally(() => setLoading(false));
  }, [channelId]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "instant" });
  }, [loading]);

  const loadOlder = useCallback(async () => {
    if (loadingMore || !cursorRef.current) return;
    setLoadingMore(true);
    const container = containerRef.current;
    const prevHeight = container?.scrollHeight ?? 0;
    try {
      const res = await fetch(
        `/api/channels/${channelId}/messages?cursor=${cursorRef.current}`
      );
      if (!res.ok) return;
      const data = await res.json();
      if (data?.messages?.length) {
        const older: SocketMessage[] = data.messages.reverse();
        setMessages((prev) => [...older, ...prev]);
        cursorRef.current = data.nextCursor ?? null;
        setHasMore(!!data.nextCursor);
        requestAnimationFrame(() => {
          if (container) {
            container.scrollTop = container.scrollHeight - prevHeight;
          }
        });
      } else {
        setHasMore(false);
        cursorRef.current = null;
      }
    } finally {
      setLoadingMore(false);
    }
  }, [channelId, loadingMore]);

  const handleScroll = useCallback(() => {
    const container = containerRef.current;
    if (!container || !hasMore || loadingMore) return;
    if (container.scrollTop === 0) {
      loadOlder();
    }
  }, [hasMore, loadingMore, loadOlder]);

  const handleNew = useCallback((msg: SocketMessage) => {
    if (msg.channelId !== channelId) return;
    setMessages((prev) => [...prev, msg]);
    requestAnimationFrame(() => {
      bottomRef.current?.scrollIntoView({ behavior: "smooth" });
    });
  }, [channelId]);

  const handleUpdated = useCallback((msg: SocketMessage) => {
    if (msg.channelId !== channelId) return;
    setMessages((prev) => prev.map((m) => (m.id === msg.id ? msg : m)));
  }, [channelId]);

  const handleDeleted = useCallback((payload: MessageDeletedPayload) => {
    setMessages((prev) =>
      prev.map((m) =>
        m.id === payload.messageId ? { ...m, deleted: true } : m
      )
    );
  }, []);

  useEffect(() => {
    if (!socket) return;
    socket.on("message:new", handleNew);
    socket.on("message:updated", handleUpdated);
    socket.on("message:deleted", handleDeleted);
    return () => {
      socket.off("message:new", handleNew);
      socket.off("message:updated", handleUpdated);
      socket.off("message:deleted", handleDeleted);
    };
  }, [socket, handleNew, handleUpdated, handleDeleted]);

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
    <Box
      ref={containerRef}
      onScroll={handleScroll}
      sx={{ flex: 1, overflowY: "auto", px: 2, py: 1 }}
    >
      {loadingMore && (
        <Box sx={{ display: "flex", justifyContent: "center", py: 1 }}>
          <CircularProgress size={24} />
        </Box>
      )}
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
