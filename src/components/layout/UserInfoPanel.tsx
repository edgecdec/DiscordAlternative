"use client";

import { Box, Avatar, Typography, IconButton, Tooltip } from "@mui/material";
import { DarkMode, LightMode, Settings } from "@mui/icons-material";
import { useAuth } from "@/hooks/useAuth";
import { useThemeMode } from "@/hooks/useThemeMode";

export default function UserInfoPanel() {
  const { user } = useAuth();
  const { mode, toggleMode } = useThemeMode();

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
      <Avatar
        src={user.avatarUrl ?? undefined}
        sx={{ width: 32, height: 32, fontSize: 14 }}
      >
        {user.username[0].toUpperCase()}
      </Avatar>
      <Typography variant="body2" fontWeight={600} noWrap sx={{ flex: 1 }}>
        {user.username}
      </Typography>
      <Tooltip title={mode === "dark" ? "Light mode" : "Dark mode"}>
        <IconButton size="small" onClick={toggleMode} sx={{ color: "text.secondary" }}>
          {mode === "dark" ? <LightMode sx={{ fontSize: 18 }} /> : <DarkMode sx={{ fontSize: 18 }} />}
        </IconButton>
      </Tooltip>
      <Tooltip title="Settings">
        <IconButton size="small" sx={{ color: "text.secondary" }}>
          <Settings sx={{ fontSize: 18 }} />
        </IconButton>
      </Tooltip>
    </Box>
  );
}
