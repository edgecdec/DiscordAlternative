"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Button,
  Box,
  Typography,
  IconButton,
  Tooltip,
  Alert,
  Tabs,
  Tab,
} from "@mui/material";
import { ContentCopy, Close } from "@mui/icons-material";
import { SERVER_NAME_MAX } from "@/lib/constants";
import MembersTab from "@/components/layout/MembersTab";
import DangerZoneTab from "@/components/layout/DangerZoneTab";

const OWNER_ROLE = "OWNER";

interface ServerSettingsProps {
  open: boolean;
  onClose: () => void;
  serverId: string;
  serverName: string;
  userRole: string;
  onUpdated: () => void;
}

export default function ServerSettings({ open, onClose, serverId, serverName, userRole, onUpdated }: ServerSettingsProps) {
  const [tab, setTab] = useState(0);
  const [name, setName] = useState(serverName);
  const [inviteCode, setInviteCode] = useState("");
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const isOwner = userRole === OWNER_ROLE;

  useEffect(() => {
    setName(serverName);
  }, [serverName]);

  const fetchInviteCode = useCallback(async () => {
    const res = await fetch(`/api/servers/${serverId}/invite`);
    if (res.ok) {
      const data = await res.json();
      setInviteCode(data.inviteCode);
    }
  }, [serverId]);

  useEffect(() => {
    if (open) {
      fetchInviteCode();
      setCopied(false);
      setError("");
      setTab(0);
    }
  }, [open, fetchInviteCode]);

  const handleSave = async () => {
    const trimmed = name.trim();
    if (!trimmed) {
      setError("Server name cannot be empty");
      return;
    }
    setSaving(true);
    setError("");
    const res = await fetch(`/api/servers/${serverId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: trimmed }),
    });
    setSaving(false);
    if (res.ok) {
      onUpdated();
      onClose();
    } else {
      const data = await res.json();
      setError(data.error || "Failed to update server");
    }
  };

  const inviteUrl = inviteCode ? `${window.location.origin}/invite/${inviteCode}` : "";

  const handleCopy = async () => {
    await navigator.clipboard.writeText(inviteUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle sx={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        Server Settings
        <IconButton onClick={onClose} size="small">
          <Close />
        </IconButton>
      </DialogTitle>
      <Tabs value={tab} onChange={(_, v) => setTab(v)} sx={{ px: 3 }}>
        <Tab label="General" />
        <Tab label="Members" />
        {isOwner && <Tab label="Danger Zone" />}
      </Tabs>
      <DialogContent>
        {tab === 0 && (
          <>
            {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
            <TextField
              label="Server Name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              fullWidth
              sx={{ mt: 1 }}
              slotProps={{ htmlInput: { maxLength: SERVER_NAME_MAX } }}
            />
            <Box sx={{ mt: 3 }}>
              <Typography variant="subtitle2" sx={{ color: "text.secondary", mb: 1 }}>
                Invite Link
              </Typography>
              <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                <TextField
                  value={inviteUrl}
                  fullWidth
                  size="small"
                  slotProps={{ input: { readOnly: true } }}
                />
                <Tooltip title={copied ? "Copied!" : "Copy"}>
                  <IconButton onClick={handleCopy} disabled={!inviteCode}>
                    <ContentCopy />
                  </IconButton>
                </Tooltip>
              </Box>
            </Box>
          </>
        )}
        {tab === 1 && <MembersTab serverId={serverId} userRole={userRole} />}
        {tab === 2 && isOwner && <DangerZoneTab serverId={serverId} serverName={serverName} />}
      </DialogContent>
      {tab === 0 && (
        <DialogActions>
          <Button onClick={onClose}>Cancel</Button>
          <Button onClick={handleSave} variant="contained" disabled={saving}>
            Save
          </Button>
        </DialogActions>
      )}
    </Dialog>
  );
}
