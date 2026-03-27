"use client";

import { useCallback, useRef, useState, type KeyboardEvent } from "react";
import { Box, IconButton, TextField } from "@mui/material";
import { Send } from "@mui/icons-material";
import { useSocket } from "@/hooks/useSocket";
import { MESSAGE_MAX } from "@/lib/constants";

interface DMMessageInputProps {
  receiverId: string;
}

export default function DMMessageInput({ receiverId }: DMMessageInputProps) {
  const [content, setContent] = useState("");
  const { socket } = useSocket();
  const inputRef = useRef<HTMLInputElement>(null);

  const send = useCallback(() => {
    const trimmed = content.trim();
    if (!trimmed || !socket) return;
    socket.emit("dm:create", { receiverId, content: trimmed });
    setContent("");
  }, [content, socket, receiverId]);

  const handleKeyDown = useCallback(
    (e: KeyboardEvent<HTMLDivElement>) => {
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        send();
      }
    },
    [send],
  );

  return (
    <Box sx={{ px: 2, py: 1 }}>
      <Box sx={{ display: "flex", gap: 1, alignItems: "flex-end" }}>
        <TextField
          fullWidth
          multiline
          maxRows={4}
          size="small"
          placeholder="Send a message…"
          value={content}
          onChange={(e) => setContent(e.target.value)}
          onKeyDown={handleKeyDown}
          inputRef={inputRef}
          slotProps={{ htmlInput: { maxLength: MESSAGE_MAX } }}
          sx={{ "& .MuiOutlinedInput-root": { bgcolor: "background.default" } }}
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
    </Box>
  );
}
