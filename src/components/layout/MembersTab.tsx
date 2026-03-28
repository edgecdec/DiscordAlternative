"use client";

import { useState, useEffect, useCallback } from "react";
import {
  List,
  ListItem,
  ListItemAvatar,
  ListItemText,
  Avatar,
  Select,
  MenuItem,
  IconButton,
  Chip,
  Tooltip,
  Typography,
  Alert,
} from "@mui/material";
import { PersonRemove, Block } from "@mui/icons-material";
import BanConfirmDialog from "@/components/layout/BanConfirmDialog";

const ASSIGNABLE_ROLES = ["ADMIN", "MODERATOR", "GUEST"] as const;

const ROLE_COLORS: Record<string, "primary" | "secondary" | "warning" | "default"> = {
  OWNER: "primary",
  ADMIN: "secondary",
  MODERATOR: "warning",
  GUEST: "default",
};

interface Member {
  id: string;
  role: string;
  user: { id: string; username: string; avatarUrl: string | null };
}

interface MembersTabProps {
  serverId: string;
  userRole: string;
}

export default function MembersTab({ serverId, userRole }: MembersTabProps) {
  const [members, setMembers] = useState<Member[]>([]);
  const [error, setError] = useState("");
  const [banTarget, setBanTarget] = useState<Member | null>(null);
  const isOwner = userRole === "OWNER";
  const canManage = ["OWNER", "ADMIN"].includes(userRole);

  const fetchMembers = useCallback(async () => {
    const res = await fetch(`/api/servers/${serverId}/members`);
    if (res.ok) {
      const data = await res.json();
      setMembers(data.members);
    }
  }, [serverId]);

  useEffect(() => {
    fetchMembers();
  }, [fetchMembers]);

  const handleRoleChange = async (memberId: string, role: string) => {
    setError("");
    const res = await fetch(`/api/servers/${serverId}/members/${memberId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ role }),
    });
    if (res.ok) {
      const data = await res.json();
      setMembers((prev) => prev.map((m) => (m.id === memberId ? data.member : m)));
    } else {
      const data = await res.json();
      setError(data.error || "Failed to change role");
    }
  };

  const handleKick = async (memberId: string, username: string) => {
    if (!confirm(`Kick ${username} from the server?`)) return;
    setError("");
    const res = await fetch(`/api/servers/${serverId}/members/${memberId}`, {
      method: "DELETE",
    });
    if (res.status === 204) {
      setMembers((prev) => prev.filter((m) => m.id !== memberId));
    } else {
      const data = await res.json();
      setError(data.error || "Failed to kick member");
    }
  };

  const handleBan = async (reason: string) => {
    if (!banTarget) return;
    setError("");
    const res = await fetch(`/api/servers/${serverId}/bans`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId: banTarget.user.id, reason: reason || undefined }),
    });
    if (res.ok) {
      setMembers((prev) => prev.filter((m) => m.id !== banTarget.id));
    } else {
      const data = await res.json();
      setError(data.error || "Failed to ban member");
    }
    setBanTarget(null);
  };

  const canActOn = (m: Member) => m.role !== "OWNER" && canManage;

  return (
    <>
      {error && <Alert severity="error" sx={{ mb: 1 }}>{error}</Alert>}
      <Typography variant="body2" sx={{ color: "text.secondary", mb: 1 }}>
        {members.length} member{members.length !== 1 ? "s" : ""}
      </Typography>
      <List disablePadding>
        {members.map((m) => (
          <ListItem
            key={m.id}
            secondaryAction={
              canActOn(m) ? (
                <>
                  {isOwner && (
                    <Select
                      size="small"
                      value={m.role}
                      onChange={(e) => handleRoleChange(m.id, e.target.value)}
                      sx={{ mr: 1, minWidth: 120 }}
                    >
                      {ASSIGNABLE_ROLES.map((r) => (
                        <MenuItem key={r} value={r}>{r}</MenuItem>
                      ))}
                    </Select>
                  )}
                  <Tooltip title="Kick">
                    <IconButton onClick={() => handleKick(m.id, m.user.username)} color="warning" size="small">
                      <PersonRemove />
                    </IconButton>
                  </Tooltip>
                  <Tooltip title="Ban">
                    <IconButton onClick={() => setBanTarget(m)} color="error" size="small">
                      <Block />
                    </IconButton>
                  </Tooltip>
                </>
              ) : (
                <Chip label={m.role} size="small" color={ROLE_COLORS[m.role] || "default"} />
              )
            }
            sx={{ pr: canActOn(m) ? 24 : 8 }}
          >
            <ListItemAvatar>
              <Avatar src={m.user.avatarUrl || undefined}>
                {m.user.username[0].toUpperCase()}
              </Avatar>
            </ListItemAvatar>
            <ListItemText primary={m.user.username} />
          </ListItem>
        ))}
      </List>
      <BanConfirmDialog
        open={!!banTarget}
        username={banTarget?.user.username ?? ""}
        onClose={() => setBanTarget(null)}
        onConfirm={handleBan}
      />
    </>
  );
}
