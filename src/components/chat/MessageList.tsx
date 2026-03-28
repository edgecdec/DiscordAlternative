"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Avatar, Box, CircularProgress, IconButton, Tooltip, Typography } from "@mui/material";
import { ChatBubbleOutline, PushPin, Reply as ReplyIcon } from "@mui/icons-material";
import type { SocketMessage, MessageDeletedPayload, ReactionBroadcastPayload, PinTogglePayload, ReadUpdatePayload } from "@/types/socket";
import { useSocket } from "@/hooks/useSocket";
import { useAuth } from "@/hooks/useAuth";
import MessageAttachment from "@/components/chat/MessageAttachment";
import ReactionBar from "@/components/chat/ReactionBar";
import ReplyQuote from "@/components/chat/ReplyQuote";
import MentionText, { extractFirstUrl } from "@/components/chat/MentionText";
import LinkPreview from "@/components/chat/LinkPreview";
import ReadReceipts from "@/components/chat/ReadReceipts";

interface MessageListProps {
  channelId: string;
  serverId?: string;
  onReply?: (msg: SocketMessage) => void;
  onOpenThread?: (threadId: string, threadName: string, messageId: string) => void;
  userRole?: string;
}

const PIN_ROLES = ["OWNER", "ADMIN", "MODERATOR"];
const READ_RECEIPT_TAIL = 10;

interface ReadReceiptUser {
  userId: string;
  username: string;
  avatarUrl: string | null;
  lastReadMessageId: string;
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

export default function MessageList({ channelId, serverId, onReply, onOpenThread, userRole }: MessageListProps) {
  const [messages, setMessages] = useState<SocketMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const cursorRef = useRef<string | null>(null);
  const { socket } = useSocket();
  const { user } = useAuth();
  const [readReceipts, setReadReceipts] = useState<ReadReceiptUser[]>([]);

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
    setReadReceipts([]);
    fetch(`/api/channels/${channelId}/read`)
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data?.receipts) setReadReceipts(data.receipts);
      });
  }, [channelId]);

  const handleReadUpdate = useCallback((payload: ReadUpdatePayload) => {
    if (payload.channelId !== channelId) return;
    setReadReceipts((prev) => {
      const filtered = prev.filter((r) => r.userId !== payload.userId);
      return [...filtered, {
        userId: payload.userId,
        username: payload.username,
        avatarUrl: payload.avatarUrl,
        lastReadMessageId: payload.lastReadMessageId,
      }];
    });
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

  const handleReactionAdd = useCallback((payload: ReactionBroadcastPayload) => {
    if (payload.channelId !== channelId) return;
    setMessages((prev) =>
      prev.map((m) => {
        if (m.id !== payload.messageId) return m;
        const reactions = { ...m.reactions };
        const existing = reactions[payload.emoji] ?? { count: 0, userReacted: false };
        reactions[payload.emoji] = {
          count: existing.count + 1,
          userReacted: existing.userReacted || payload.userId === user?.id,
        };
        return { ...m, reactions };
      })
    );
  }, [channelId, user?.id]);

  const handleReactionRemove = useCallback((payload: ReactionBroadcastPayload) => {
    if (payload.channelId !== channelId) return;
    setMessages((prev) =>
      prev.map((m) => {
        if (m.id !== payload.messageId) return m;
        const reactions = { ...m.reactions };
        const existing = reactions[payload.emoji];
        if (!existing) return m;
        const newCount = existing.count - 1;
        if (newCount <= 0) {
          delete reactions[payload.emoji];
        } else {
          reactions[payload.emoji] = {
            count: newCount,
            userReacted: payload.userId === user?.id ? false : existing.userReacted,
          };
        }
        return { ...m, reactions };
      })
    );
  }, [channelId, user?.id]);

  const handleReactionToggle = useCallback((messageId: string, emoji: string) => {
    if (!socket) return;
    socket.emit("reaction:toggle", { messageId, emoji });
  }, [socket]);

  const canPin = PIN_ROLES.includes(userRole ?? "");

  const handleCreateThread = useCallback(async (msg: SocketMessage) => {
    if (!onOpenThread) return;
    if (msg.thread) {
      onOpenThread(msg.thread.id, msg.thread.name, msg.id);
      return;
    }
    try {
      const res = await fetch(`/api/messages/${msg.id}/thread`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: msg.content.slice(0, 100) || "Thread" }),
      });
      if (!res.ok) return;
      const data = await res.json();
      if (data.thread) {
        setMessages((prev) =>
          prev.map((m) =>
            m.id === msg.id ? { ...m, thread: { id: data.thread.id, name: data.thread.name, archived: false, messageCount: 0 } } : m
          )
        );
        onOpenThread(data.thread.id, data.thread.name, msg.id);
      }
    } catch { /* ignore */ }
  }, [onOpenThread]);

  const handlePinToggle = useCallback((messageId: string) => {
    if (!socket) return;
    socket.emit("pin:toggle", { messageId });
  }, [socket]);

  const handlePinBroadcast = useCallback((payload: PinTogglePayload) => {
    if (payload.channelId !== channelId) return;
    setMessages((prev) =>
      prev.map((m) => (m.id === payload.messageId ? { ...m, pinned: payload.pinned } : m))
    );
  }, [channelId]);

  useEffect(() => {
    if (!socket) return;
    socket.on("message:new", handleNew);
    socket.on("message:updated", handleUpdated);
    socket.on("message:deleted", handleDeleted);
    socket.on("reaction:add", handleReactionAdd);
    socket.on("reaction:remove", handleReactionRemove);
    socket.on("pin:toggle", handlePinBroadcast);
    socket.on("read:update", handleReadUpdate);
    return () => {
      socket.off("message:new", handleNew);
      socket.off("message:updated", handleUpdated);
      socket.off("message:deleted", handleDeleted);
      socket.off("reaction:add", handleReactionAdd);
      socket.off("reaction:remove", handleReactionRemove);
      socket.off("pin:toggle", handlePinBroadcast);
      socket.off("read:update", handleReadUpdate);
    };
  }, [socket, handleNew, handleUpdated, handleDeleted, handleReactionAdd, handleReactionRemove, handlePinBroadcast, handleReadUpdate]);

  const readersMap = useMemo(() => {
    const map = new Map<string, ReadReceiptUser[]>();
    if (messages.length === 0) return map;
    const tailStart = Math.max(0, messages.length - READ_RECEIPT_TAIL);
    const tailIds = new Set(messages.slice(tailStart).map((m) => m.id));
    for (const r of readReceipts) {
      if (tailIds.has(r.lastReadMessageId)) {
        const list = map.get(r.lastReadMessageId) ?? [];
        list.push(r);
        map.set(r.lastReadMessageId, list);
      }
    }
    return map;
  }, [messages, readReceipts]);

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
        <Box
          key={msg.id}
          sx={{
            display: "flex",
            gap: 1.5,
            py: 0.75,
            "&:hover .reaction-add-btn": { opacity: 1 },
            "&:hover .reply-btn": { opacity: 1 },
            "&:hover .pin-btn": { opacity: 1 },
          }}
        >
          <Avatar
            sx={{ width: 36, height: 36, mt: 0.5, bgcolor: "primary.main", fontSize: 14 }}
            src={msg.author.avatarUrl ?? undefined}
          >
            {msg.author.username[0].toUpperCase()}
          </Avatar>
          <Box sx={{ minWidth: 0, flex: 1 }}>
            {msg.replyTo && <ReplyQuote replyTo={msg.replyTo} />}
            <Box sx={{ display: "flex", alignItems: "baseline", gap: 1 }}>
              <Typography variant="body2" fontWeight={600}>
                {msg.author.username}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                {formatTimestamp(msg.createdAt)}
              </Typography>
              {!msg.deleted && msg.updatedAt !== msg.createdAt && (
                <Tooltip title={`Edited ${formatTimestamp(msg.updatedAt)}`}>
                  <Typography variant="caption" color="text.secondary" sx={{ cursor: "default", fontStyle: "italic" }}>
                    (edited)
                  </Typography>
                </Tooltip>
              )}
              {!msg.deleted && msg.pinned && (
                <Tooltip title="Pinned">
                  <PushPin sx={{ fontSize: 14, color: "text.secondary", alignSelf: "center" }} />
                </Tooltip>
              )}
              {!msg.deleted && (
                <Box sx={{ ml: "auto", display: "flex", gap: 0.25 }}>
                  {canPin && (
                    <Tooltip title={msg.pinned ? "Unpin" : "Pin"}>
                      <IconButton
                        size="small"
                        className="pin-btn"
                        onClick={() => handlePinToggle(msg.id)}
                        sx={{ opacity: 0, p: 0.25 }}
                        aria-label={msg.pinned ? "Unpin message" : "Pin message"}
                      >
                        <PushPin sx={{ fontSize: 16, color: msg.pinned ? "primary.main" : "text.secondary" }} />
                      </IconButton>
                    </Tooltip>
                  )}
                  {onReply && (
                    <IconButton
                      size="small"
                      className="reply-btn"
                      onClick={() => onReply(msg)}
                      sx={{ opacity: 0, p: 0.25 }}
                      aria-label="Reply"
                    >
                      <ReplyIcon sx={{ fontSize: 16 }} />
                    </IconButton>
                  )}
                  {onOpenThread && !msg.threadId && (
                    <Tooltip title={msg.thread ? "View Thread" : "Create Thread"}>
                      <IconButton
                        size="small"
                        className="reply-btn"
                        onClick={() => handleCreateThread(msg)}
                        sx={{ opacity: 0, p: 0.25 }}
                        aria-label={msg.thread ? "View thread" : "Create thread"}
                      >
                        <ChatBubbleOutline sx={{ fontSize: 16 }} />
                      </IconButton>
                    </Tooltip>
                  )}
                </Box>
              )}
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
              {msg.deleted ? "This message has been deleted" : <MentionText content={msg.content} serverId={serverId} />}
            </Typography>
            {!msg.deleted && msg.fileUrl && (
              <MessageAttachment fileUrl={msg.fileUrl} />
            )}
            {!msg.deleted && (() => {
              const url = extractFirstUrl(msg.content);
              return url ? <LinkPreview url={url} /> : null;
            })()}
            {!msg.deleted && (
              <ReactionBar
                reactions={msg.reactions ?? {}}
                onToggle={(emoji) => handleReactionToggle(msg.id, emoji)}
              />
            )}
            {!msg.deleted && msg.thread && onOpenThread && (
              <Box
                onClick={() => onOpenThread(msg.thread!.id, msg.thread!.name, msg.id)}
                sx={{ display: "inline-flex", alignItems: "center", gap: 0.5, mt: 0.5, cursor: "pointer", color: "primary.main", "&:hover": { textDecoration: "underline" } }}
              >
                <ChatBubbleOutline sx={{ fontSize: 14 }} />
                <Typography variant="caption" fontWeight={600}>
                  {msg.thread.messageCount} {msg.thread.messageCount === 1 ? "reply" : "replies"}
                </Typography>
              </Box>
            )}
            {readersMap.has(msg.id) && (
              <Box sx={{ display: "flex", justifyContent: "flex-end", mt: 0.25 }}>
                <ReadReceipts readers={readersMap.get(msg.id)!} />
              </Box>
            )}
          </Box>
        </Box>
      ))}
      <div ref={bottomRef} />
    </Box>
  );
}
