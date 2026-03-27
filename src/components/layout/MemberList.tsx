"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams } from "next/navigation";
import { Box, Typography, Avatar, List, ListItem, ListItemAvatar, ListItemText } from "@mui/material";
import { Circle } from "@mui/icons-material";
import { useSocket } from "@/hooks/useSocket";

interface Member {
  id: string;
  role: string;
  user: { id: string; username: string; avatarUrl: string | null };
}

const ROLE_ORDER = ["OWNER", "ADMIN", "MODERATOR", "GUEST"] as const;
const ROLE_LABELS: Record<string, string> = {
  OWNER: "Owner",
  ADMIN: "Admin",
  MODERATOR: "Moderator",
  GUEST: "Members",
};

const STATUS_COLORS: Record<string, string> = {
  online: "success.main",
  away: "warning.main",
  dnd: "error.main",
  offline: "text.disabled",
};

export default function MemberList() {
  const params = useParams();
  const serverId = params?.serverId as string;
  const { socket } = useSocket();
  const [members, setMembers] = useState<Member[]>([]);
  const [onlineIds, setOnlineIds] = useState<Set<string>>(new Set());
  const [statuses, setStatuses] = useState<Record<string, string>>({});

  useEffect(() => {
    if (!serverId) return;
    fetch(`/api/servers/${serverId}/members`)
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data?.members) setMembers(data.members);
      });
  }, [serverId]);

  useEffect(() => {
    if (!socket || !serverId) return;
    socket.emit("presence:list", { serverId });
  }, [socket, serverId]);

  const handlePresenceList = useCallback(
    ({ onlineUserIds, userStatuses }: { onlineUserIds: string[]; userStatuses?: Record<string, string> }) => {
      setOnlineIds(new Set(onlineUserIds));
      if (userStatuses) setStatuses(userStatuses);
    },
    []
  );

  const handleOnline = useCallback(({ userId }: { userId: string }) => {
    setOnlineIds((prev) => new Set(prev).add(userId));
    setStatuses((prev) => ({ ...prev, [userId]: prev[userId] === "offline" ? "online" : prev[userId] || "online" }));
  }, []);

  const handleOffline = useCallback(({ userId }: { userId: string }) => {
    setOnlineIds((prev) => {
      const next = new Set(prev);
      next.delete(userId);
      return next;
    });
    setStatuses((prev) => ({ ...prev, [userId]: "offline" }));
  }, []);

  const handleStatus = useCallback(({ userId, status }: { userId: string; status: string }) => {
    setStatuses((prev) => ({ ...prev, [userId]: status }));
  }, []);

  useEffect(() => {
    if (!socket) return;
    socket.on("presence:list", handlePresenceList);
    socket.on("presence:online", handleOnline);
    socket.on("presence:offline", handleOffline);
    socket.on("presence:status", handleStatus);
    return () => {
      socket.off("presence:list", handlePresenceList);
      socket.off("presence:online", handleOnline);
      socket.off("presence:offline", handleOffline);
      socket.off("presence:status", handleStatus);
    };
  }, [socket, handlePresenceList, handleOnline, handleOffline, handleStatus]);

  const grouped = ROLE_ORDER.map((role) => ({
    role,
    label: ROLE_LABELS[role],
    items: members.filter((m) => m.role === role),
  })).filter((g) => g.items.length > 0);

  return (
    <Box
      sx={{
        width: 240,
        borderLeft: 1,
        borderColor: "divider",
        overflow: "auto",
        bgcolor: "background.paper",
        display: { xs: "none", md: "block" },
      }}
    >
      <Typography variant="caption" sx={{ px: 2, pt: 2, display: "block", color: "text.secondary", fontWeight: 700, textTransform: "uppercase" }}>
        Members — {members.length}
      </Typography>
      {grouped.map((group) => (
        <Box key={group.role}>
          <Typography variant="caption" sx={{ px: 2, pt: 1.5, display: "block", color: "text.secondary", fontWeight: 600, textTransform: "uppercase", fontSize: "0.68rem" }}>
            {group.label} — {group.items.length}
          </Typography>
          <List dense disablePadding>
            {group.items.map((m) => {
              const userStatus = statuses[m.user.id] || (onlineIds.has(m.user.id) ? "online" : "offline");
              const isOnline = userStatus !== "offline";
              return (
                <ListItem key={m.id} sx={{ px: 2, py: 0.5, opacity: isOnline ? 1 : 0.5 }}>
                  <ListItemAvatar sx={{ minWidth: 40 }}>
                    <Box sx={{ position: "relative" }}>
                      <Avatar sx={{ width: 32, height: 32, fontSize: 14, bgcolor: "primary.main" }}>
                        {m.user.username[0].toUpperCase()}
                      </Avatar>
                      <Circle
                        sx={{
                          position: "absolute",
                          bottom: -2,
                          right: -2,
                          fontSize: 12,
                          color: STATUS_COLORS[userStatus] || STATUS_COLORS.offline,
                        }}
                      />
                    </Box>
                  </ListItemAvatar>
                  <ListItemText
                    primary={m.user.username}
                    primaryTypographyProps={{ variant: "body2", noWrap: true }}
                  />
                </ListItem>
              );
            })}
          </List>
        </Box>
      ))}
    </Box>
  );
}
