"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Typography } from "@mui/material";
import { useSocket } from "@/hooks/useSocket";
import type { TypingBroadcastPayload } from "@/types/socket";

const TYPING_TIMEOUT_MS = 4000;

interface TypingIndicatorProps {
  channelId: string;
}

export default function TypingIndicator({ channelId }: TypingIndicatorProps) {
  const { socket } = useSocket();
  const [typingUsers, setTypingUsers] = useState<Map<string, string>>(new Map());
  const timers = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());

  const clearUserTimer = useCallback((userId: string) => {
    const t = timers.current.get(userId);
    if (t) {
      clearTimeout(t);
      timers.current.delete(userId);
    }
  }, []);

  const removeUser = useCallback((userId: string) => {
    clearUserTimer(userId);
    setTypingUsers((prev) => {
      const next = new Map(prev);
      next.delete(userId);
      return next;
    });
  }, [clearUserTimer]);

  const addUser = useCallback(
    (userId: string, username: string) => {
      clearUserTimer(userId);
      setTypingUsers((prev) => {
        const next = new Map(prev);
        next.set(userId, username);
        return next;
      });
      timers.current.set(
        userId,
        setTimeout(() => removeUser(userId), TYPING_TIMEOUT_MS)
      );
    },
    [clearUserTimer, removeUser]
  );

  useEffect(() => {
    if (!socket) return;

    const onStart = (payload: TypingBroadcastPayload) => {
      if (payload.channelId === channelId) {
        addUser(payload.userId, payload.username);
      }
    };

    const onStop = (payload: TypingBroadcastPayload) => {
      if (payload.channelId === channelId) {
        removeUser(payload.userId);
      }
    };

    socket.on("typing:start", onStart);
    socket.on("typing:stop", onStop);

    return () => {
      socket.off("typing:start", onStart);
      socket.off("typing:stop", onStop);
      // Clear all timers and state on cleanup
      timers.current.forEach((t) => clearTimeout(t));
      timers.current.clear();
      setTypingUsers(new Map());
    };
  }, [socket, channelId, addUser, removeUser]);

  const names = Array.from(typingUsers.values());
  if (names.length === 0) return null;

  const text =
    names.length === 1
      ? `${names[0]} is typing…`
      : `${names.length} users are typing…`;

  return (
    <Typography
      variant="caption"
      sx={{ px: 2, pb: 0.5, color: "text.secondary", minHeight: 20 }}
    >
      {text}
    </Typography>
  );
}
