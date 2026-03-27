"use client";

import { useState, useEffect, useCallback } from "react";
import {
  List,
  ListItem,
  ListItemAvatar,
  ListItemText,
  Avatar,
  Typography,
  Button,
  Box,
  CircularProgress,
} from "@mui/material";
import type { AuditAction } from "@/lib/auditLog";

interface AuditLogEntry {
  id: string;
  action: string;
  targetId: string | null;
  details: string | null;
  createdAt: string;
  user: { id: string; username: string; avatarUrl: string | null };
}

const ACTION_LABELS: Record<AuditAction, string> = {
  member_kick: "kicked a member",
  member_role_change: "changed a member's role",
  channel_create: "created a channel",
  channel_delete: "deleted a channel",
  message_delete: "deleted a message",
  server_update: "updated server settings",
};

function formatDetails(action: string, details: string | null): string {
  if (!details) return "";
  try {
    const parsed = JSON.parse(details);
    if (action === "member_role_change" && parsed.newRole) {
      return ` → ${parsed.newRole}`;
    }
    if (parsed.name) return ` (${parsed.name})`;
    return "";
  } catch {
    return "";
  }
}

function formatTime(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

interface AuditLogTabProps {
  serverId: string;
}

export default function AuditLogTab({ serverId }: AuditLogTabProps) {
  const [logs, setLogs] = useState<AuditLogEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [cursor, setCursor] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(true);

  const fetchLogs = useCallback(async (c?: string) => {
    setLoading(true);
    const url = `/api/servers/${serverId}/audit-log${c ? `?cursor=${c}` : ""}`;
    const res = await fetch(url);
    if (res.ok) {
      const data = await res.json();
      const entries: AuditLogEntry[] = data.logs;
      setLogs((prev) => (c ? [...prev, ...entries] : entries));
      setHasMore(entries.length >= 50);
      setCursor(entries.length > 0 ? entries[entries.length - 1].id : null);
    }
    setLoading(false);
  }, [serverId]);

  useEffect(() => {
    fetchLogs();
  }, [fetchLogs]);

  return (
    <Box>
      {logs.length === 0 && !loading && (
        <Typography sx={{ color: "text.secondary", mt: 2, textAlign: "center" }}>
          No audit log entries yet.
        </Typography>
      )}
      <List disablePadding>
        {logs.map((entry) => (
          <ListItem key={entry.id} sx={{ alignItems: "flex-start", px: 0 }}>
            <ListItemAvatar>
              <Avatar src={entry.user.avatarUrl ?? undefined} sx={{ width: 32, height: 32 }}>
                {entry.user.username[0].toUpperCase()}
              </Avatar>
            </ListItemAvatar>
            <ListItemText
              primary={
                <Typography variant="body2">
                  <Typography component="span" variant="body2" sx={{ fontWeight: 600 }}>
                    {entry.user.username}
                  </Typography>
                  {" "}
                  {ACTION_LABELS[entry.action as AuditAction] ?? entry.action}
                  {formatDetails(entry.action, entry.details)}
                </Typography>
              }
              secondary={formatTime(entry.createdAt)}
            />
          </ListItem>
        ))}
      </List>
      {loading && (
        <Box sx={{ display: "flex", justifyContent: "center", py: 2 }}>
          <CircularProgress size={24} />
        </Box>
      )}
      {!loading && hasMore && cursor && (
        <Box sx={{ display: "flex", justifyContent: "center", py: 1 }}>
          <Button size="small" onClick={() => fetchLogs(cursor)}>
            Load More
          </Button>
        </Box>
      )}
    </Box>
  );
}
