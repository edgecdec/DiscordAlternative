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
import { SERVER_NAME_MAX } from "@/lib/constants";

interface CreateServerDialogProps {
  open: boolean;
  onClose: () => void;
}

export default function CreateServerDialog({
  open,
  onClose,
}: CreateServerDialogProps) {
  const [name, setName] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleSubmit = async () => {
    const trimmed = name.trim();
    if (!trimmed) {
      setError("Server name is required");
      return;
    }
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/servers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: trimmed }),
      });
      if (!res.ok) {
        const data = await res.json();
        setError(data.error || "Failed to create server");
        return;
      }
      const data = await res.json();
      setName("");
      onClose();
      router.push(`/servers/${data.server.id}`);
    } catch {
      setError("Network error");
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setName("");
    setError("");
    onClose();
  };

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="xs" fullWidth>
      <DialogTitle>Create a Server</DialogTitle>
      <DialogContent>
        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}
        <TextField
          autoFocus
          label="Server Name"
          fullWidth
          value={name}
          onChange={(e) => setName(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !loading) handleSubmit();
          }}
          slotProps={{ htmlInput: { maxLength: SERVER_NAME_MAX } }}
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
          disabled={loading || !name.trim()}
        >
          Create
        </Button>
      </DialogActions>
    </Dialog>
  );
}
