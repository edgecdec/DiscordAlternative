"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter, useParams } from "next/navigation";
import {
  Box,
  Typography,
  List,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  IconButton,
  Tooltip,
} from "@mui/material";
import { Tag, VolumeUp, Add, Settings } from "@mui/icons-material";
import CreateChannelDialog from "@/components/layout/CreateChannelDialog";
import ServerSettings from "@/components/layout/ServerSettings";
import UserInfoPanel from "@/components/layout/UserInfoPanel";

const PANEL_WIDTH = 240;
const ADMIN_ROLES = ["OWNER", "ADMIN"];

interface Channel {
  id: string;
  name: string;
  type: string;
}

interface Member {
  role: string;
  user: { id: string };
}

interface ServerData {
  id: string;
  name: string;
  channels: Channel[];
  members: Member[];
}

interface ChannelPanelProps {
  userId: string;
}

export default function ChannelPanel({ userId }: ChannelPanelProps) {
  const [server, setServer] = useState<ServerData | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const router = useRouter();
  const params = useParams();
  const serverId = params?.serverId as string | undefined;
  const channelId = params?.channelId as string | undefined;

  const fetchServer = useCallback(async () => {
    if (!serverId) return;
    const res = await fetch(`/api/servers/${serverId}`);
    if (res.ok) {
      const data = await res.json();
      setServer(data.server);
    }
  }, [serverId]);

  useEffect(() => {
    fetchServer();
  }, [fetchServer]);

  if (!server) return null;

  const currentMember = server.members.find((m) => m.user.id === userId);
  const canManage = currentMember ? ADMIN_ROLES.includes(currentMember.role) : false;

  const textChannels = server.channels.filter((c) => c.type === "TEXT");
  const voiceChannels = server.channels.filter((c) => c.type === "VOICE" || c.type === "VIDEO");

  const renderChannelGroup = (label: string, channels: Channel[], icon: React.ReactNode) => (
    <>
      <Box sx={{ display: "flex", alignItems: "center", px: 1, pt: 2, pb: 0.5 }}>
        <Typography variant="caption" sx={{ color: "text.secondary", textTransform: "uppercase", fontWeight: 700, flex: 1 }}>
          {label}
        </Typography>
        {canManage && (
          <Tooltip title="Create Channel">
            <IconButton size="small" onClick={() => setDialogOpen(true)} sx={{ color: "text.secondary" }}>
              <Add sx={{ fontSize: 16 }} />
            </IconButton>
          </Tooltip>
        )}
      </Box>
      <List dense disablePadding>
        {channels.map((ch) => (
          <ListItemButton
            key={ch.id}
            selected={ch.id === channelId}
            onClick={() => router.push(`/servers/${server.id}/channels/${ch.id}`)}
            sx={{ borderRadius: 1, mx: 0.5, px: 1 }}
          >
            <ListItemIcon sx={{ minWidth: 28, color: "text.secondary" }}>
              {icon}
            </ListItemIcon>
            <ListItemText
              primary={ch.name}
              slotProps={{ primary: { noWrap: true, sx: { fontSize: 14 } } }}
            />
          </ListItemButton>
        ))}
      </List>
    </>
  );

  return (
    <Box
      sx={{
        width: PANEL_WIDTH,
        minWidth: PANEL_WIDTH,
        height: "100vh",
        bgcolor: "background.paper",
        display: "flex",
        flexDirection: "column",
        borderRight: 1,
        borderColor: "divider",
      }}
    >
      <Box sx={{ px: 2, py: 1.5, borderBottom: 1, borderColor: "divider", display: "flex", alignItems: "center" }}>
        <Typography variant="subtitle1" fontWeight={700} noWrap sx={{ flex: 1 }}>
          {server.name}
        </Typography>
        {canManage && (
          <Tooltip title="Server Settings">
            <IconButton size="small" onClick={() => setSettingsOpen(true)} sx={{ color: "text.secondary" }}>
              <Settings sx={{ fontSize: 18 }} />
            </IconButton>
          </Tooltip>
        )}
      </Box>

      <Box sx={{ flex: 1, overflowY: "auto", py: 0.5 }}>
        {textChannels.length > 0 && renderChannelGroup("Text Channels", textChannels, <Tag sx={{ fontSize: 20 }} />)}
        {voiceChannels.length > 0 && renderChannelGroup("Voice Channels", voiceChannels, <VolumeUp sx={{ fontSize: 20 }} />)}
      </Box>

      <CreateChannelDialog
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        serverId={server.id}
        onCreated={fetchServer}
      />

      <ServerSettings
        open={settingsOpen}
        onClose={() => setSettingsOpen(false)}
        serverId={server.id}
        serverName={server.name}
        onUpdated={fetchServer}
      />

      <UserInfoPanel />
    </Box>
  );
}
