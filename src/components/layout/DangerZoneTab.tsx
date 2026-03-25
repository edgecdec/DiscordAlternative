"use client";

import { useState } from "react";
import {
  Box,
  Button,
  Typography,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Alert,
} from "@mui/material";
import { useRouter } from "next/navigation";

interface DangerZoneTabProps {
  serverId: string;
  serverName: string;
}

export default function DangerZoneTab({ serverId, serverName }: DangerZoneTabProps) {
  const router = useRouter();
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [confirmText, setConfirmText] = useState("");
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState("");

  const handleDelete = async () => {
    setDeleting(true);
    setError("");
    const res = await fetch(`/api/servers/${serverId}`, { method: "DELETE" });
    setDeleting(false);
    if (res.ok || res.status === 204) {
      setConfirmOpen(false);
      router.push("/servers");
    } else {
      const data = await res.json().catch(() => ({ error: "Failed to delete server" }));
      setError(data.error || "Failed to delete server");
    }
  };

  return (
    <Box sx={{ mt: 1 }}>
      <Typography variant="h6" sx={{ color: "error.main", mb: 1 }}>
        Danger Zone
      </Typography>
      <Box
        sx={{
          border: 1,
          borderColor: "error.main",
          borderRadius: 1,
          p: 2,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        <Box>
          <Typography variant="subtitle2">Delete this server</Typography>
          <Typography variant="body2" sx={{ color: "text.secondary" }}>
            This action is permanent and cannot be undone.
          </Typography>
        </Box>
        <Button
          variant="contained"
          color="error"
          onClick={() => setConfirmOpen(true)}
        >
          Delete Server
        </Button>
      </Box>

      <Dialog open={confirmOpen} onClose={() => setConfirmOpen(false)} maxWidth="xs" fullWidth>
        <DialogTitle>Delete Server</DialogTitle>
        <DialogContent>
          {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
          <Typography variant="body2" sx={{ mb: 2 }}>
            Type <strong>{serverName}</strong> to confirm deletion.
          </Typography>
          <TextField
            value={confirmText}
            onChange={(e) => setConfirmText(e.target.value)}
            fullWidth
            size="small"
            placeholder={serverName}
            autoFocus
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setConfirmOpen(false)}>Cancel</Button>
          <Button
            variant="contained"
            color="error"
            disabled={confirmText !== serverName || deleting}
            onClick={handleDelete}
          >
            {deleting ? "Deleting..." : "Delete"}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
