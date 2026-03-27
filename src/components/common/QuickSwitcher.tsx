"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Box,
  Dialog,
  InputAdornment,
  List,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  TextField,
  Typography,
} from "@mui/material";
import { Search, Tag, VolumeUp } from "@mui/icons-material";

interface ChannelEntry {
  id: string;
  name: string;
  type: string;
  serverId: string;
  serverName: string;
}

interface QuickSwitcherProps {
  open: boolean;
  onClose: () => void;
}

export default function QuickSwitcher({ open, onClose }: QuickSwitcherProps) {
  const [query, setQuery] = useState("");
  const [channels, setChannels] = useState<ChannelEntry[]>([]);
  const [selectedIdx, setSelectedIdx] = useState(0);
  const router = useRouter();

  useEffect(() => {
    if (!open) return;
    setQuery("");
    setSelectedIdx(0);
    fetch("/api/servers")
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (!data?.servers) return;
        const entries: ChannelEntry[] = [];
        for (const s of data.servers) {
          for (const ch of s.channels) {
            entries.push({ id: ch.id, name: ch.name, type: ch.type, serverId: s.id, serverName: s.name });
          }
        }
        setChannels(entries);
      });
  }, [open]);

  const filtered = useMemo(() => {
    if (!query.trim()) return channels;
    const q = query.toLowerCase();
    return channels.filter(
      (c) => c.name.toLowerCase().includes(q) || c.serverName.toLowerCase().includes(q),
    );
  }, [channels, query]);

  useEffect(() => {
    setSelectedIdx(0);
  }, [query]);

  const navigate = useCallback(
    (ch: ChannelEntry) => {
      onClose();
      router.push(`/servers/${ch.serverId}/channels/${ch.id}`);
    },
    [onClose, router],
  );

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setSelectedIdx((prev) => (prev >= filtered.length - 1 ? 0 : prev + 1));
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        setSelectedIdx((prev) => (prev <= 0 ? filtered.length - 1 : prev - 1));
      } else if (e.key === "Enter" && filtered[selectedIdx]) {
        e.preventDefault();
        navigate(filtered[selectedIdx]);
      }
    },
    [filtered, selectedIdx, navigate],
  );

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <Box sx={{ p: 1 }}>
        <TextField
          autoFocus
          fullWidth
          size="small"
          placeholder="Jump to a channel…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={handleKeyDown}
          slotProps={{
            input: {
              startAdornment: (
                <InputAdornment position="start">
                  <Search fontSize="small" />
                </InputAdornment>
              ),
            },
          }}
        />
      </Box>
      <List dense sx={{ maxHeight: 320, overflowY: "auto", px: 0.5, pb: 0.5 }}>
        {filtered.length === 0 && (
          <Typography variant="body2" color="text.secondary" textAlign="center" sx={{ py: 2 }}>
            No channels found
          </Typography>
        )}
        {filtered.map((ch, i) => (
          <ListItemButton
            key={ch.id}
            selected={i === selectedIdx}
            onClick={() => navigate(ch)}
            sx={{ borderRadius: 1 }}
          >
            <ListItemIcon sx={{ minWidth: 28 }}>
              {ch.type === "TEXT" ? (
                <Tag sx={{ fontSize: 18, color: "text.secondary" }} />
              ) : (
                <VolumeUp sx={{ fontSize: 18, color: "text.secondary" }} />
              )}
            </ListItemIcon>
            <ListItemText
              primary={ch.name}
              secondary={ch.serverName}
              slotProps={{
                primary: { sx: { fontSize: 14 } },
                secondary: { sx: { fontSize: 12 } },
              }}
            />
          </ListItemButton>
        ))}
      </List>
    </Dialog>
  );
}
