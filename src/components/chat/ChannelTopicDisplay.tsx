"use client";

import { useCallback, useState } from "react";
import { Box, ClickAwayListener, TextField, Tooltip, Typography } from "@mui/material";
import { CHANNEL_TOPIC_MAX } from "@/lib/constants";

interface ChannelTopicDisplayProps {
  channelId: string;
  topic: string | null;
  canEdit: boolean;
  onTopicUpdated: (topic: string | null) => void;
}

export default function ChannelTopicDisplay({ channelId, topic, canEdit, onTopicUpdated }: ChannelTopicDisplayProps) {
  const [expanded, setExpanded] = useState(false);
  const [editing, setEditing] = useState(false);
  const [editValue, setEditValue] = useState("");

  const startEdit = useCallback(() => {
    if (!canEdit) return;
    setEditValue(topic ?? "");
    setEditing(true);
  }, [canEdit, topic]);

  const cancelEdit = useCallback(() => {
    setEditing(false);
  }, []);

  const saveEdit = useCallback(async () => {
    setEditing(false);
    const trimmed = editValue.trim();
    const newTopic = trimmed || null;
    if (newTopic === topic) return;
    const res = await fetch(`/api/channels/${channelId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ topic: newTopic }),
    });
    if (res.ok) onTopicUpdated(newTopic);
  }, [editValue, topic, channelId, onTopicUpdated]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); saveEdit(); }
    if (e.key === "Escape") cancelEdit();
  }, [saveEdit, cancelEdit]);

  if (editing) {
    return (
      <ClickAwayListener onClickAway={saveEdit}>
        <TextField
          size="small"
          variant="standard"
          value={editValue}
          onChange={(e) => setEditValue(e.target.value)}
          onKeyDown={handleKeyDown}
          autoFocus
          placeholder="Set a channel topic"
          slotProps={{ htmlInput: { maxLength: CHANNEL_TOPIC_MAX } }}
          sx={{ flex: 1, ml: 1, "& .MuiInput-input": { fontSize: "0.75rem", py: 0 } }}
        />
      </ClickAwayListener>
    );
  }

  if (!topic) {
    if (!canEdit) return null;
    return (
      <Typography
        variant="caption"
        color="text.disabled"
        onClick={startEdit}
        sx={{ ml: 1, cursor: "pointer", "&:hover": { color: "text.secondary" } }}
      >
        Set a topic
      </Typography>
    );
  }

  return (
    <Tooltip title={topic} enterDelay={500} disableHoverListener={expanded}>
      <Box
        onClick={() => canEdit && !expanded ? startEdit() : setExpanded(!expanded)}
        sx={{ ml: 1, cursor: "pointer", minWidth: 0, flex: expanded ? 1 : undefined, maxWidth: expanded ? "100%" : 200 }}
      >
        <Typography
          variant="caption"
          color="text.secondary"
          sx={{
            display: "block",
            overflow: expanded ? "visible" : "hidden",
            textOverflow: expanded ? "clip" : "ellipsis",
            whiteSpace: expanded ? "normal" : "nowrap",
          }}
        >
          {topic}
        </Typography>
      </Box>
    </Tooltip>
  );
}
