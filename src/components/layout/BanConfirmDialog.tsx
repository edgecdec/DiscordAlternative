"use client";

import { useState } from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Button,
  Typography,
} from "@mui/material";

interface BanConfirmDialogProps {
  open: boolean;
  username: string;
  onClose: () => void;
  onConfirm: (reason: string) => void;
}

export default function BanConfirmDialog({ open, username, onClose, onConfirm }: BanConfirmDialogProps) {
  const [reason, setReason] = useState("");

  const handleConfirm = () => {
    onConfirm(reason.trim());
    setReason("");
  };

  const handleClose = () => {
    setReason("");
    onClose();
  };

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="xs" fullWidth>
      <DialogTitle>Ban {username}</DialogTitle>
      <DialogContent>
        <Typography variant="body2" sx={{ color: "text.secondary", mb: 2 }}>
          This will remove them from the server and prevent them from rejoining.
        </Typography>
        <TextField
          label="Reason (optional)"
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          fullWidth
          multiline
          rows={2}
          slotProps={{ htmlInput: { maxLength: 512 } }}
        />
      </DialogContent>
      <DialogActions>
        <Button onClick={handleClose}>Cancel</Button>
        <Button onClick={handleConfirm} color="error" variant="contained">
          Ban
        </Button>
      </DialogActions>
    </Dialog>
  );
}
