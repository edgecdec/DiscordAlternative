"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Avatar, Box, CircularProgress, Divider, IconButton, TextField, Typography } from "@mui/material";
import { Close, Send, Tag } from "@mui/icons-material";
import type { SocketMessage } from "@/types/socket";
import { useSocket } from "@/hooks/useSocket";
import { useAuth } from "@/hooks/useAuth";
import { MESSAGE_MAX } from "@/lib/constants";
import MentionText from "@/components/chat/MentionText";
import MessageAttachment from "@/components/chat/MessageAttachment";

interface ThreadPanelProps {
  threadId: string;
  threadName: string;
  channelId: string;
  serverId: string;
  onClose: () => void;
}

function formatTimestamp(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleString(undefined, { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });
}

export default function ThreadPanel({ threadId, threadName, channelId, serverId, onClose }: ThreadPanelProps) {
  const [messages, setMessages] = useState<SocketMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [content, setContent] = useState("");
  const [sending, setSending] = useState(false);
  const [hasMore, setHasMore] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const cursorRef = useRef<string | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const { socket } = useSocket();
  const { user } = useAuth();

  useEffect(() => {
    setLoading(true);
    setMessages([]);
    cursorRef.current = null;
    fetch(`/api/threads/${threadId}/messages`)
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data?.messages) {
          setMessages(data.messages.reverse());
          cursorRef.current = data.nextCursor ?? null;
          setHasMore(!!data.nextCursor);
        }
      })
      .finally(() => setLoading(false));
  }, [threadId]);

  useEffect(() => {
    if (!loading) bottomRef.current?.scrollIntoView({ behavior: "instant" });
  }, [loading]);

  // Listen for new messages in this thread via the channel room
  useEffect(() => {
    if (!socket) return;
    const handleNew = (msg: SocketMessage) => {
      if (msg.threadId !== threadId) return;
      setMessages((prev) => [...prev, msg]);
      requestAnimationFrame(() => bottomRef.current?.scrollIntoView({ behavior: "smooth" }));
    };
    socket.on("message:new", handleNew);
    return () => { socket.off("message:new", handleNew); };
  }, [socket, threadId]);

  const loadOlder = useCallback(async () => {
    if (loadingMore || !cursorRef.current) return;
    setLoadingMore(true);
    const container = containerRef.current;
    const prevHeight = container?.scrollHeight ?? 0;
    try {
      const res = await fetch(`/api/threads/${threadId}/messages?cursor=${cursorRef.current}`);
      if (!res.ok) return;
      const data = await res.json();
      if (data?.messages?.length) {
        setMessages((prev) => [...data.messages.reverse(), ...prev]);
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
  }, [threadId, loadingMore]);

  const handleScroll = useCallback(() => {
    const container = containerRef.current;
    if (!container || !hasMore || loadingMore) return;
    if (container.scrollTop === 0) loadOlder();
  }, [hasMore, loadingMore, loadOlder]);

  const send = useCallback(async () => {
    const trimmed = content.trim();
    if (!trimmed || sending) return;
    setSending(true);
    try {
      const res = await fetch(`/api/threads/${threadId}/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: trimmed }),
      });
      if (res.ok) {
        const data = await res.json();
        // Only add if not already added by socket
        setMessages((prev) => prev.some((m) => m.id === data.message.id) ? prev : [...prev, data.message]);
        setContent("");
        requestAnimationFrame(() => bottomRef.current?.scrollIntoView({ behavior: "smooth" }));
      }
    } finally {
      setSending(false);
    }
  }, [content, sending, threadId]);

  return (
    <Box sx={{ width: 360, borderLeft: 1, borderColor: "divider", display: "flex", flexDirection: "column", height: "100%" }}>
      {/* Header */}
      <Box sx={{ px: 2, py: 1, borderBottom: 1, borderColor: "divider", display: "flex", alignItems: "center", gap: 1 }}>
        <Tag sx={{ fontSize: 18, color: "text.secondary" }} />
        <Typography variant="subtitle2" fontWeight={700} noWrap sx={{ flex: 1 }}>
          {threadName}
        </Typography>
        <IconButton size="small" onClick={onClose} aria-label="Close thread">
          <Close sx={{ fontSize: 18 }} />
        </IconButton>
      </Box>

      {/* Messages */}
      <Box ref={containerRef} onScroll={handleScroll} sx={{ flex: 1, overflowY: "auto", px: 2, py: 1 }}>
        {loadingMore && (
          <Box sx={{ display: "flex", justifyContent: "center", py: 1 }}>
            <CircularProgress size={20} />
          </Box>
        )}
        {loading ? (
          <Box sx={{ display: "flex", justifyContent: "center", alignItems: "center", height: "100%" }}>
            <Typography variant="body2" color="text.secondary">Loading…</Typography>
          </Box>
        ) : messages.length === 0 ? (
          <Box sx={{ display: "flex", justifyContent: "center", alignItems: "center", height: "100%" }}>
            <Typography variant="body2" color="text.secondary">No replies yet</Typography>
          </Box>
        ) : (
          messages.map((msg) => (
            <Box key={msg.id} sx={{ display: "flex", gap: 1, py: 0.5 }}>
              <Avatar sx={{ width: 28, height: 28, mt: 0.25, bgcolor: "primary.main", fontSize: 12 }} src={msg.author.avatarUrl ?? undefined}>
                {msg.author.username[0].toUpperCase()}
              </Avatar>
              <Box sx={{ minWidth: 0, flex: 1 }}>
                <Box sx={{ display: "flex", alignItems: "baseline", gap: 0.5 }}>
                  <Typography variant="caption" fontWeight={600}>{msg.author.username}</Typography>
                  <Typography variant="caption" color="text.secondary" sx={{ fontSize: "0.65rem" }}>{formatTimestamp(msg.createdAt)}</Typography>
                </Box>
                <Typography variant="body2" sx={{ whiteSpace: "pre-wrap", wordBreak: "break-word", color: msg.deleted ? "text.disabled" : "text.primary", fontStyle: msg.deleted ? "italic" : "normal" }}>
                  {msg.deleted ? "This message has been deleted" : <MentionText content={msg.content} serverId={serverId} />}
                </Typography>
                {!msg.deleted && msg.fileUrl && <MessageAttachment fileUrl={msg.fileUrl} />}
              </Box>
            </Box>
          ))
        )}
        <div ref={bottomRef} />
      </Box>

      <Divider />

      {/* Input */}
      <Box sx={{ px: 2, py: 1, display: "flex", gap: 1, alignItems: "flex-end" }}>
        <TextField
          fullWidth
          multiline
          maxRows={3}
          size="small"
          placeholder="Reply in thread…"
          value={content}
          onChange={(e) => setContent(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); }
          }}
          slotProps={{ htmlInput: { maxLength: MESSAGE_MAX } }}
          sx={{ "& .MuiOutlinedInput-root": { bgcolor: "background.default" } }}
        />
        <IconButton color="primary" onClick={send} disabled={!content.trim() || sending} aria-label="Send reply">
          <Send />
        </IconButton>
      </Box>
    </Box>
  );
}
