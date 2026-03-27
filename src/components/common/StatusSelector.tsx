"use client";

import { useState } from "react";
import { Box, Menu, MenuItem, ListItemIcon, ListItemText, Tooltip } from "@mui/material";
import { Circle } from "@mui/icons-material";
import { useSocket } from "@/hooks/useSocket";
import type { UserStatus } from "@/lib/constants";

const STATUS_OPTIONS: { value: UserStatus; label: string; color: string }[] = [
  { value: "online", label: "Online", color: "success.main" },
  { value: "away", label: "Away", color: "warning.main" },
  { value: "dnd", label: "Do Not Disturb", color: "error.main" },
  { value: "offline", label: "Invisible", color: "text.disabled" },
];

const STATUS_LABELS: Record<string, string> = {
  online: "Online",
  away: "Away",
  dnd: "Do Not Disturb",
  offline: "Invisible",
};

interface StatusSelectorProps {
  currentStatus: UserStatus;
  onStatusChange: (status: UserStatus) => void;
}

export default function StatusSelector({ currentStatus, onStatusChange }: StatusSelectorProps) {
  const [anchorEl, setAnchorEl] = useState<HTMLElement | null>(null);
  const { socket } = useSocket();

  const current = STATUS_OPTIONS.find((o) => o.value === currentStatus) ?? STATUS_OPTIONS[0];

  const handleSelect = async (status: UserStatus) => {
    setAnchorEl(null);
    if (status === currentStatus) return;
    onStatusChange(status);
    await fetch("/api/auth/status", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    socket?.emit("presence:status", { status });
  };

  return (
    <>
      <Tooltip title={`Status: ${STATUS_LABELS[currentStatus] ?? currentStatus}`}>
        <Box
          onClick={(e) => setAnchorEl(e.currentTarget)}
          aria-label="Change status"
          role="button"
          sx={{
            position: "absolute",
            bottom: -2,
            right: -2,
            cursor: "pointer",
            borderRadius: "50%",
            bgcolor: "background.default",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            width: 14,
            height: 14,
          }}
        >
          <Circle sx={{ fontSize: 10, color: current.color }} />
        </Box>
      </Tooltip>
      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={() => setAnchorEl(null)}
        anchorOrigin={{ vertical: "top", horizontal: "center" }}
        transformOrigin={{ vertical: "bottom", horizontal: "center" }}
      >
        {STATUS_OPTIONS.map((opt) => (
          <MenuItem
            key={opt.value}
            selected={opt.value === currentStatus}
            onClick={() => handleSelect(opt.value)}
          >
            <ListItemIcon sx={{ minWidth: 28 }}>
              <Circle sx={{ fontSize: 12, color: opt.color }} />
            </ListItemIcon>
            <ListItemText primary={opt.label} primaryTypographyProps={{ variant: "body2" }} />
          </MenuItem>
        ))}
      </Menu>
    </>
  );
}
