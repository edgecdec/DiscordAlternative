"use client";

import { useState } from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Button,
  Alert,
  ToggleButtonGroup,
  ToggleButton,
} from "@mui/material";
import { Tag, VolumeUp } from "@mui/icons-material";
import { CHANNEL_NAME_MAX } from "@/lib/constants";

interface CreateChannelDialogProps {
  open: boolean;
  onClose: () => void;
  serverId: string;
  onCreated: () => void;
}

const CHANNEL_TYPES = ["TEXT", "VOICE"] as const;
type ChannelType = (typeof CHANNEL_TYPES)[number];

export default function CreateChannelDialog({
  open,
  onClose,
  serverId,
  onCreated,
}: CreateChannelDialogProps) {
  const [name, setName] = useState("");
  const [type, setType] = useState<ChannelType>("TEXT");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    const trimmed = name.trim();
    if (!trimmed) {
      setError("Channel name is required");
      return;
    }
    setLoading(true);
    setError("");
    try {
      const res = await fetch(`/api/servers/${serverId}/channels`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: trimmed, type }),
      });
      if (!res.ok) {
        const data = await res.json();
        setError(data.error || "Failed to create channel");
        return;
      }
      setName("");
      setType("TEXT");
      onClose();
      onCreated();
    } catch {
      setError("Network error");
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setName("");
    setType("TEXT");
    setError("");
    onClose();
  };

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="xs" fullWidth>
      <DialogTitle>Create Channel</DialogTitle>
      <DialogContent>
        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}
        <ToggleButtonGroup
          value={type}
          exclusive
          onChange={(_, v) => v && setType(v as ChannelType)}
          size="small"
          sx={{ mt: 1, mb: 2 }}
          fullWidth
        >
          <ToggleButton value="TEXT">
            <Tag sx={{ mr: 0.5, fontSize: 18 }} /> Text
          </ToggleButton>
          <ToggleButton value="VOICE">
            <VolumeUp sx={{ mr: 0.5, fontSize: 18 }} /> Voice
          </ToggleButton>
        </ToggleButtonGroup>
        <TextField
          autoFocus
          label="Channel Name"
          fullWidth
          value={name}
          onChange={(e) => setName(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !loading) handleSubmit();
          }}
          slotProps={{ htmlInput: { maxLength: CHANNEL_NAME_MAX } }}
        />
      </DialogContent>
      <DialogActions>
        <Button onClick={handleClose} disabled={loading}>
          Cancel
        </Button>
        <Button
          onClick={handleSubmit}
          variant="contained"
          disabled={loading || !name.trim()}
        >
          Create
        </Button>
      </DialogActions>
    </Dialog>
  );
}
