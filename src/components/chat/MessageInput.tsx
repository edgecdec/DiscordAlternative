"use client";

import { useCallback, useState, type KeyboardEvent } from "react";
import { Box, IconButton, TextField } from "@mui/material";
import { Send } from "@mui/icons-material";
import { useSocket } from "@/hooks/useSocket";
import { MESSAGE_MAX } from "@/lib/constants";

interface MessageInputProps {
  channelId: string;
}

export default function MessageInput({ channelId }: MessageInputProps) {
  const [content, setContent] = useState("");
  const { socket } = useSocket();

  const send = useCallback(() => {
    const trimmed = content.trim();
    if (!trimmed || !socket) return;
    socket.emit("message:create", { channelId, content: trimmed });
    setContent("");
  }, [content, socket, channelId]);

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
        onChange={(e) => setContent(e.target.value)}
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
