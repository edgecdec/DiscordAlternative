"use client";

import { useState, useEffect, useCallback } from "react";
import {
  List,
  ListItem,
  ListItemAvatar,
  ListItemText,
  Avatar,
  Button,
  Typography,
  Alert,
} from "@mui/material";

interface Ban {
  id: string;
  reason: string | null;
  createdAt: string;
  user: { id: string; username: string; avatarUrl: string | null };
  bannedBy: { id: string; username: string };
}

interface BansTabProps {
  serverId: string;
}

export default function BansTab({ serverId }: BansTabProps) {
  const [bans, setBans] = useState<Ban[]>([]);
  const [error, setError] = useState("");

  const fetchBans = useCallback(async () => {
    const res = await fetch(`/api/servers/${serverId}/bans`);
    if (res.ok) {
      const data = await res.json();
      setBans(data.bans);
    }
  }, [serverId]);

  useEffect(() => {
    fetchBans();
  }, [fetchBans]);

  const handleUnban = async (userId: string) => {
    setError("");
    const res = await fetch(`/api/servers/${serverId}/bans`, {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId }),
    });
    if (res.status === 204) {
      setBans((prev) => prev.filter((b) => b.user.id !== userId));
    } else {
      const data = await res.json();
      setError(data.error || "Failed to unban user");
    }
  };

  return (
    <>
      {error && <Alert severity="error" sx={{ mb: 1 }}>{error}</Alert>}
      <Typography variant="body2" sx={{ color: "text.secondary", mb: 1 }}>
        {bans.length} banned user{bans.length !== 1 ? "s" : ""}
      </Typography>
      {bans.length === 0 && (
        <Typography variant="body2" sx={{ color: "text.disabled", mt: 2, textAlign: "center" }}>
          No banned users
        </Typography>
      )}
      <List disablePadding>
        {bans.map((b) => (
          <ListItem
            key={b.id}
            secondaryAction={
              <Button size="small" color="primary" onClick={() => handleUnban(b.user.id)}>
                Unban
              </Button>
            }
          >
            <ListItemAvatar>
              <Avatar src={b.user.avatarUrl || undefined}>
                {b.user.username[0].toUpperCase()}
              </Avatar>
            </ListItemAvatar>
            <ListItemText
              primary={b.user.username}
              secondary={b.reason ? `Reason: ${b.reason}` : `Banned by ${b.bannedBy.username}`}
            />
          </ListItem>
        ))}
      </List>
    </>
  );
}
