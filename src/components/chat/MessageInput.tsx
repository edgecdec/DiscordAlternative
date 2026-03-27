"use client";

import { useCallback, useEffect, useMemo, useRef, useState, type KeyboardEvent, type ChangeEvent } from "react";
import { Box, IconButton, LinearProgress, TextField, Typography } from "@mui/material";
import { AttachFile, Close, EmojiEmotions, Reply as ReplyIcon, Send } from "@mui/icons-material";
import EmojiPicker from "./EmojiPicker";
import { useSocket } from "@/hooks/useSocket";
import { FILE_UPLOAD_MAX_BYTES, MESSAGE_MAX } from "@/lib/constants";
import type { SocketMessage } from "@/types/socket";
import MentionAutocomplete, { type MentionMember } from "./MentionAutocomplete";

const TYPING_EMIT_INTERVAL_MS = 2000;
const TYPING_STOP_DELAY_MS = 3000;

interface MessageInputProps {
  channelId: string;
  serverId: string;
  replyTo?: SocketMessage | null;
  onCancelReply?: () => void;
}

function getMentionQuery(value: string, cursorPos: number): { query: string; start: number } | null {
  const before = value.slice(0, cursorPos);
  const match = before.match(/@(\w*)$/);
  if (!match) return null;
  return { query: match[1], start: match.index! };
}

export default function MessageInput({ channelId, serverId, replyTo, onCancelReply }: MessageInputProps) {
  const [content, setContent] = useState("");
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [pendingFile, setPendingFile] = useState<{ name: string; url: string } | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [members, setMembers] = useState<MentionMember[]>([]);
  const [mentionAnchor, setMentionAnchor] = useState<HTMLElement | null>(null);
  const [mentionQuery, setMentionQuery] = useState("");
  const [mentionStart, setMentionStart] = useState(-1);
  const [mentionIdx, setMentionIdx] = useState(0);
  const [emojiAnchor, setEmojiAnchor] = useState<HTMLElement | null>(null);
  const { socket } = useSocket();
  const lastTypingEmit = useRef(0);
  const stopTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isTyping = useRef(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!serverId) return;
    fetch(`/api/servers/${serverId}/members`)
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data?.members) {
          setMembers(data.members.map((m: { user: MentionMember }) => m.user));
        }
      });
  }, [serverId]);

  const filtered = useMemo(
    () =>
      mentionAnchor
        ? members.filter((m) => m.username.toLowerCase().startsWith(mentionQuery.toLowerCase())).slice(0, 10)
        : [],
    [members, mentionQuery, mentionAnchor],
  );

  const mentionOpen = mentionAnchor !== null && filtered.length > 0;

  const closeMention = useCallback(() => {
    setMentionAnchor(null);
    setMentionStart(-1);
    setMentionIdx(0);
  }, []);

  const selectMention = useCallback(
    (username: string) => {
      if (!username || mentionStart < 0) {
        closeMention();
        return;
      }
      const before = content.slice(0, mentionStart);
      const cursorPos = inputRef.current?.selectionStart ?? content.length;
      const after = content.slice(cursorPos);
      const inserted = `${before}@${username} ${after}`;
      setContent(inserted);
      closeMention();
      // Restore cursor after React re-render
      const newPos = mentionStart + username.length + 2; // @username + space
      requestAnimationFrame(() => {
        inputRef.current?.setSelectionRange(newPos, newPos);
        inputRef.current?.focus();
      });
    },
    [content, mentionStart, closeMention],
  );

  const updateMentionState = useCallback(
    (value: string, el: HTMLInputElement | null) => {
      const pos = el?.selectionStart ?? value.length;
      const result = getMentionQuery(value, pos);
      if (result) {
        setMentionQuery(result.query);
        setMentionStart(result.start);
        setMentionAnchor(el);
        setMentionIdx(0);
      } else {
        closeMention();
      }
    },
    [closeMention],
  );

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

  useEffect(() => {
    return () => {
      clearStopTimer();
      emitStop();
    };
  }, [clearStopTimer, emitStop]);

  const send = useCallback(() => {
    const trimmed = content.trim();
    if ((!trimmed && !pendingFile) || !socket) return;
    socket.emit("message:create", {
      channelId,
      content: trimmed || "",
      ...(pendingFile ? { fileUrl: pendingFile.url } : {}),
      ...(replyTo ? { replyToId: replyTo.id } : {}),
    });
    setContent("");
    setPendingFile(null);
    setUploadError(null);
    closeMention();
    onCancelReply?.();
    clearStopTimer();
    emitStop();
    lastTypingEmit.current = 0;
  }, [content, pendingFile, socket, channelId, replyTo, onCancelReply, clearStopTimer, emitStop, closeMention]);

  const handleKeyDown = useCallback(
    (e: KeyboardEvent<HTMLDivElement>) => {
      if (mentionOpen) {
        if (e.key === "ArrowUp") {
          e.preventDefault();
          setMentionIdx((prev) => (prev <= 0 ? filtered.length - 1 : prev - 1));
          return;
        }
        if (e.key === "ArrowDown") {
          e.preventDefault();
          setMentionIdx((prev) => (prev >= filtered.length - 1 ? 0 : prev + 1));
          return;
        }
        if (e.key === "Tab" || (e.key === "Enter" && !e.shiftKey)) {
          e.preventDefault();
          if (filtered[mentionIdx]) selectMention(filtered[mentionIdx].username);
          return;
        }
        if (e.key === "Escape") {
          e.preventDefault();
          closeMention();
          return;
        }
      }
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        send();
      }
    },
    [send, mentionOpen, filtered, mentionIdx, selectMention, closeMention],
  );

  const handleFileSelect = useCallback(async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (e.target) e.target.value = "";
    if (!file) return;

    if (file.size > FILE_UPLOAD_MAX_BYTES) {
      setUploadError(`File exceeds ${FILE_UPLOAD_MAX_BYTES / (1024 * 1024)}MB limit`);
      return;
    }

    setUploading(true);
    setUploadProgress(0);
    setUploadError(null);

    const formData = new FormData();
    formData.append("file", file);

    try {
      const xhr = new XMLHttpRequest();
      const result = await new Promise<{ url: string }>((resolve, reject) => {
        xhr.upload.addEventListener("progress", (ev) => {
          if (ev.lengthComputable) setUploadProgress(Math.round((ev.loaded / ev.total) * 100));
        });
        xhr.addEventListener("load", () => {
          if (xhr.status >= 200 && xhr.status < 300) {
            resolve(JSON.parse(xhr.responseText));
          } else {
            reject(new Error(JSON.parse(xhr.responseText)?.error || "Upload failed"));
          }
        });
        xhr.addEventListener("error", () => reject(new Error("Upload failed")));
        xhr.open("POST", "/api/upload");
        xhr.send(formData);
      });
      setPendingFile({ name: file.name, url: result.url });
    } catch (err) {
      setUploadError(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setUploading(false);
    }
  }, []);

  const clearPendingFile = useCallback(() => {
    setPendingFile(null);
    setUploadError(null);
  }, []);

  const handleEmojiSelect = useCallback(
    (emoji: string) => {
      const el = inputRef.current;
      const pos = el?.selectionStart ?? content.length;
      setContent((prev) => prev.slice(0, pos) + emoji + prev.slice(pos));
      requestAnimationFrame(() => {
        const newPos = pos + emoji.length;
        el?.setSelectionRange(newPos, newPos);
        el?.focus();
      });
    },
    [content],
  );

  return (
    <Box sx={{ px: 2, py: 1, position: "relative" }}>
      {replyTo && (
        <Box sx={{ display: "flex", alignItems: "center", gap: 0.5, mb: 0.5, pl: 1, borderLeft: 2, borderColor: "primary.main" }}>
          <ReplyIcon sx={{ fontSize: 14, color: "text.secondary", transform: "scaleX(-1)" }} />
          <Typography variant="caption" fontWeight={600} color="text.secondary">
            Replying to {replyTo.author.username}
          </Typography>
          <Typography variant="caption" color="text.secondary" noWrap sx={{ flex: 1, maxWidth: 300 }}>
            — {replyTo.content.length > 60 ? replyTo.content.slice(0, 60) + "…" : replyTo.content}
          </Typography>
          <IconButton size="small" onClick={onCancelReply} aria-label="Cancel reply">
            <Close sx={{ fontSize: 14 }} />
          </IconButton>
        </Box>
      )}
      {uploading && <LinearProgress variant="determinate" value={uploadProgress} sx={{ mb: 1, borderRadius: 1 }} />}
      {uploadError && (
        <Typography variant="caption" color="error" sx={{ display: "block", mb: 0.5 }}>
          {uploadError}
        </Typography>
      )}
      {pendingFile && (
        <Box sx={{ display: "flex", alignItems: "center", gap: 0.5, mb: 0.5 }}>
          <AttachFile sx={{ fontSize: 16, color: "text.secondary" }} />
          <Typography variant="caption" color="text.secondary" noWrap sx={{ maxWidth: 200 }}>
            {pendingFile.name}
          </Typography>
          <IconButton size="small" onClick={clearPendingFile} aria-label="Remove attachment">
            <Close sx={{ fontSize: 14 }} />
          </IconButton>
        </Box>
      )}
      <MentionAutocomplete
        filtered={filtered}
        anchorEl={mentionAnchor}
        selectedIndex={mentionIdx}
        onSelect={selectMention}
      />
      <Box sx={{ display: "flex", gap: 1, alignItems: "flex-end" }}>
        <input type="file" hidden ref={fileInputRef} onChange={handleFileSelect} />
        <IconButton
          onClick={() => fileInputRef.current?.click()}
          disabled={uploading}
          aria-label="Attach file"
          sx={{ color: "text.secondary" }}
        >
          <AttachFile />
        </IconButton>
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
            updateMentionState(e.target.value, e.target as HTMLInputElement);
          }}
          onKeyDown={handleKeyDown}
          inputRef={inputRef}
          slotProps={{ htmlInput: { maxLength: MESSAGE_MAX } }}
          sx={{ "& .MuiOutlinedInput-root": { bgcolor: "background.default" } }}
        />
        <IconButton
          onClick={(e) => setEmojiAnchor(e.currentTarget)}
          aria-label="Emoji picker"
          sx={{ color: "text.secondary" }}
        >
          <EmojiEmotions />
        </IconButton>
        <IconButton
          color="primary"
          onClick={send}
          disabled={!content.trim() && !pendingFile}
          aria-label="Send message"
        >
          <Send />
        </IconButton>
      </Box>
      <EmojiPicker
        anchorEl={emojiAnchor}
        onClose={() => setEmojiAnchor(null)}
        onSelect={handleEmojiSelect}
      />
    </Box>
  );
}
