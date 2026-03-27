"use client";

import { useState } from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Typography,
} from "@mui/material";

const SLOW_MODE_OPTIONS = [
  { label: "Off", value: 0 },
  { label: "5s", value: 5 },
  { label: "10s", value: 10 },
  { label: "30s", value: 30 },
  { label: "1m", value: 60 },
  { label: "5m", value: 300 },
] as const;

interface ChannelSettingsDialogProps {
  open: boolean;
  onClose: () => void;
  channelId: string;
  channelName: string;
  slowModeSeconds: number;
  onUpdated: (newSlowMode: number) => void;
}

export default function ChannelSettingsDialog({
  open,
  onClose,
  channelId,
  channelName,
  slowModeSeconds,
  onUpdated,
}: ChannelSettingsDialogProps) {
  const [value, setValue] = useState(slowModeSeconds);
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await fetch(`/api/channels/${channelId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ slowModeSeconds: value }),
      });
      if (res.ok) {
        onUpdated(value);
        onClose();
      }
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="xs" fullWidth>
      <DialogTitle>#{channelName} Settings</DialogTitle>
      <DialogContent>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          Slow mode limits how often users can send messages.
        </Typography>
        <FormControl fullWidth size="small">
          <InputLabel>Slow Mode</InputLabel>
          <Select
            value={value}
            label="Slow Mode"
            onChange={(e) => setValue(Number(e.target.value))}
          >
            {SLOW_MODE_OPTIONS.map((opt) => (
              <MenuItem key={opt.value} value={opt.value}>
                {opt.label}
              </MenuItem>
            ))}
          </Select>
        </FormControl>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
        <Button onClick={handleSave} disabled={saving || value === slowModeSeconds} variant="contained">
          Save
        </Button>
      </DialogActions>
    </Dialog>
  );
}
