"use client";

import { useState, useEffect, useCallback } from "react";
import { Box, Avatar, Typography, IconButton, Tooltip } from "@mui/material";
import { DarkMode, LightMode, Settings } from "@mui/icons-material";
import { useAuth } from "@/hooks/useAuth";
import { useThemeMode } from "@/hooks/useThemeMode";
import { useSocket } from "@/hooks/useSocket";
import ProfileDialog from "@/components/common/ProfileDialog";
import StatusSelector from "@/components/common/StatusSelector";
import type { UserStatus } from "@/lib/constants";

export default function UserInfoPanel() {
  const { user } = useAuth();
  const { mode, toggleMode } = useThemeMode();
  const { socket } = useSocket();
  const [profileOpen, setProfileOpen] = useState(false);
  const [status, setStatus] = useState<UserStatus>("online");

  useEffect(() => {
    if (!user) return;
    fetch("/api/auth/me")
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data?.user?.status) setStatus(data.user.status as UserStatus);
      });
  }, [user]);

  const handleStatusFromSocket = useCallback(
    ({ userId, status: newStatus }: { userId: string; status: string }) => {
      if (user && userId === user.id) setStatus(newStatus as UserStatus);
    },
    [user]
  );

  useEffect(() => {
    if (!socket) return;
    socket.on("presence:status", handleStatusFromSocket);
    return () => { socket.off("presence:status", handleStatusFromSocket); };
  }, [socket, handleStatusFromSocket]);

  if (!user) return null;

  return (
    <Box
      sx={{
        display: "flex",
        alignItems: "center",
        gap: 1,
        px: 1.5,
        py: 1,
        borderTop: 1,
        borderColor: "divider",
        bgcolor: "background.default",
      }}
    >
      <Box sx={{ position: "relative" }}>
        <Avatar
          src={user.avatarUrl ?? undefined}
          sx={{ width: 32, height: 32, fontSize: 14 }}
        >
          {user.username[0].toUpperCase()}
        </Avatar>
        <StatusSelector currentStatus={status} onStatusChange={setStatus} />
      </Box>
      <Typography variant="body2" fontWeight={600} noWrap sx={{ flex: 1 }}>
        {user.username}
      </Typography>
      <Tooltip title={mode === "dark" ? "Light mode" : "Dark mode"}>
        <IconButton size="small" onClick={toggleMode} sx={{ color: "text.secondary" }}>
          {mode === "dark" ? <LightMode sx={{ fontSize: 18 }} /> : <DarkMode sx={{ fontSize: 18 }} />}
        </IconButton>
      </Tooltip>
      <Tooltip title="Edit Profile">
        <IconButton size="small" onClick={() => setProfileOpen(true)} sx={{ color: "text.secondary" }}>
          <Settings sx={{ fontSize: 18 }} />
        </IconButton>
      </Tooltip>
      <ProfileDialog open={profileOpen} onClose={() => setProfileOpen(false)} />
    </Box>
  );
}
