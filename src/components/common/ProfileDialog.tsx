"use client";

import { useState } from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  Alert,
  Tabs,
  Tab,
  Box,
} from "@mui/material";
import { useAuth } from "@/hooks/useAuth";
import { USERNAME_MIN, USERNAME_MAX, PASSWORD_MIN, PASSWORD_MAX } from "@/lib/constants";

interface ProfileDialogProps {
  open: boolean;
  onClose: () => void;
}

export default function ProfileDialog({ open, onClose }: ProfileDialogProps) {
  const { user, refreshUser } = useAuth();
  const [tab, setTab] = useState(0);
  const [username, setUsername] = useState("");
  const [avatarUrl, setAvatarUrl] = useState("");
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [saving, setSaving] = useState(false);

  const handleOpen = () => {
    setUsername(user?.username ?? "");
    setAvatarUrl(user?.avatarUrl ?? "");
    setError("");
    setSuccess("");
    setCurrentPassword("");
    setNewPassword("");
  };

  const handleSaveProfile = async () => {
    setError("");
    setSuccess("");
    setSaving(true);
    try {
      const res = await fetch("/api/auth/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          username: username || undefined,
          avatarUrl: avatarUrl || null,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to update profile");
      await refreshUser();
      setSuccess("Profile updated");
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setSaving(false);
    }
  };

  const handleChangePassword = async () => {
    setError("");
    setSuccess("");
    setSaving(true);
    try {
      const res = await fetch("/api/auth/password", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ currentPassword, newPassword }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to change password");
      setSuccess("Password updated");
      setCurrentPassword("");
      setNewPassword("");
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="xs"
      fullWidth
      TransitionProps={{ onEnter: handleOpen }}
    >
      <DialogTitle>Edit Profile</DialogTitle>
      <DialogContent>
        {error && <Alert severity="error" sx={{ mb: 1 }}>{error}</Alert>}
        {success && <Alert severity="success" sx={{ mb: 1 }}>{success}</Alert>}
        <Tabs value={tab} onChange={(_, v) => { setTab(v); setError(""); setSuccess(""); }} sx={{ mb: 2 }}>
          <Tab label="Profile" />
          <Tab label="Password" />
        </Tabs>
        {tab === 0 && (
          <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
            <TextField
              label="Username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              slotProps={{ htmlInput: { minLength: USERNAME_MIN, maxLength: USERNAME_MAX } }}
              fullWidth
              size="small"
            />
            <TextField
              label="Avatar URL"
              value={avatarUrl}
              onChange={(e) => setAvatarUrl(e.target.value)}
              fullWidth
              size="small"
              placeholder="https://example.com/avatar.png"
            />
          </Box>
        )}
        {tab === 1 && (
          <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
            <TextField
              label="Current Password"
              type="password"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              slotProps={{ htmlInput: { maxLength: PASSWORD_MAX } }}
              fullWidth
              size="small"
            />
            <TextField
              label="New Password"
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              slotProps={{ htmlInput: { minLength: PASSWORD_MIN, maxLength: PASSWORD_MAX } }}
              fullWidth
              size="small"
            />
          </Box>
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
        <Button
          variant="contained"
          disabled={saving}
          onClick={tab === 0 ? handleSaveProfile : handleChangePassword}
        >
          {saving ? "Saving…" : "Save"}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
