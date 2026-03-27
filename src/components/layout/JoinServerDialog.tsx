"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Button,
  Alert,
} from "@mui/material";

interface JoinServerDialogProps {
  open: boolean;
  onClose: () => void;
}

function parseInviteCode(input: string): string {
  const trimmed = input.trim();
  const match = trimmed.match(/\/invite\/([A-Za-z0-9-]+)\/?$/);
  return match ? match[1] : trimmed;
}

export default function JoinServerDialog({ open, onClose }: JoinServerDialogProps) {
  const [input, setInput] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleSubmit = async () => {
    const code = parseInviteCode(input);
    if (!code) {
      setError("Please enter an invite code or link");
      return;
    }
    setLoading(true);
    setError("");
    try {
      const res = await fetch(`/api/servers/invite/${code}`, { method: "POST" });
      if (res.status === 409) {
        const lookup = await fetch(`/api/servers/invite/${code}`);
        if (lookup.ok) {
          const data = await lookup.json();
          handleClose();
          router.push(`/servers/${data.server.id}`);
        }
        return;
      }
      if (!res.ok) {
        const data = await res.json();
        setError(data.error || "Invalid invite code");
        return;
      }
      const data = await res.json();
      handleClose();
      router.push(`/servers/${data.server.id}`);
    } catch {
      setError("Network error");
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setInput("");
    setError("");
    onClose();
  };

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="xs" fullWidth>
      <DialogTitle>Join a Server</DialogTitle>
      <DialogContent>
        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}
        <TextField
          autoFocus
          label="Invite Code or Link"
          placeholder="https://discord.edgecdec.com/invite/abc123"
          fullWidth
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !loading) handleSubmit();
          }}
          sx={{ mt: 1 }}
        />
      </DialogContent>
      <DialogActions>
        <Button onClick={handleClose} disabled={loading}>
          Cancel
        </Button>
        <Button
          onClick={handleSubmit}
          variant="contained"
          disabled={loading || !input.trim()}
        >
          Join
        </Button>
      </DialogActions>
    </Dialog>
  );
}
