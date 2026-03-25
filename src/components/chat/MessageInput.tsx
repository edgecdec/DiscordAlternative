"use client";

import { useCallback, useEffect, useRef, useState, type KeyboardEvent } from "react";
import { Box, IconButton, TextField } from "@mui/material";
import { Send } from "@mui/icons-material";
import { useSocket } from "@/hooks/useSocket";
import { MESSAGE_MAX } from "@/lib/constants";

const TYPING_EMIT_INTERVAL_MS = 2000;
const TYPING_STOP_DELAY_MS = 3000;

interface MessageInputProps {
  channelId: string;
}

export default function MessageInput({ channelId }: MessageInputProps) {
  const [content, setContent] = useState("");
  const { socket } = useSocket();
  const lastTypingEmit = useRef(0);
  const stopTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isTyping = useRef(false);

  const emitStop = useCallback(() => {
    if (!isTyping.current || !socket) return;
    isTyping.current = false;
    socket.emit("typing:stop", { channelId });
  }, [socket, channelId]);

  const clearStopTimer = useCallback(() => {
    if (stopTimer.current) {
      clearTimeout(stopTimer.current);
      stopTimer.current = null;
    }
  }, []);

  const handleTyping = useCallback(() => {
    if (!socket) return;
    const now = Date.now();
    if (now - lastTypingEmit.current >= TYPING_EMIT_INTERVAL_MS) {
      lastTypingEmit.current = now;
      isTyping.current = true;
      socket.emit("typing:start", { channelId });
    }
    clearStopTimer();
    stopTimer.current = setTimeout(emitStop, TYPING_STOP_DELAY_MS);
  }, [socket, channelId, emitStop, clearStopTimer]);

  // Cleanup on unmount or channel change
  useEffect(() => {
    return () => {
      clearStopTimer();
      emitStop();
    };
  }, [clearStopTimer, emitStop]);

  const send = useCallback(() => {
    const trimmed = content.trim();
    if (!trimmed || !socket) return;
    socket.emit("message:create", { channelId, content: trimmed });
    setContent("");
    clearStopTimer();
    emitStop();
    lastTypingEmit.current = 0;
  }, [content, socket, channelId, clearStopTimer, emitStop]);

  const handleKeyDown = useCallback(
    (e: KeyboardEvent<HTMLDivElement>) => {
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        send();
      }
    },
    [send]
  );

  return (
    <Box sx={{ px: 2, py: 1, display: "flex", gap: 1, alignItems: "flex-end" }}>
      <TextField
        fullWidth
        multiline
        maxRows={4}
        size="small"
        placeholder="Send a message…"
        value={content}
        onChange={(e) => {
          setContent(e.target.value);
          handleTyping();
        }}
        onKeyDown={handleKeyDown}
        slotProps={{ htmlInput: { maxLength: MESSAGE_MAX } }}
        sx={{
          "& .MuiOutlinedInput-root": {
            bgcolor: "background.default",
          },
        }}
      />
      <IconButton
        color="primary"
        onClick={send}
        disabled={!content.trim()}
        aria-label="Send message"
      >
        <Send />
      </IconButton>
    </Box>
  );
}
