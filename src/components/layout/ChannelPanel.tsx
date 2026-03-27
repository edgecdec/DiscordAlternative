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
  Collapse,
} from "@mui/material";
import { Tag, VolumeUp, Add, Settings, FiberManualRecord, ExpandMore, ChevronRight } from "@mui/icons-material";
import CreateChannelDialog from "@/components/layout/CreateChannelDialog";
import ServerSettings from "@/components/layout/ServerSettings";
import UserInfoPanel from "@/components/layout/UserInfoPanel";

const PANEL_WIDTH = 240;
const ADMIN_ROLES = ["OWNER", "ADMIN"];
const UNREAD_POLL_MS = 30_000;

interface Channel {
  id: string;
  name: string;
  type: string;
  categoryId: string | null;
}

interface Category {
  id: string;
  name: string;
  position: number;
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
  categories: Category[];
}

interface ChannelPanelProps {
  userId: string;
  onNavigate?: () => void;
}

function getChannelIcon(type: string) {
  return type === "TEXT" ? <Tag sx={{ fontSize: 20 }} /> : <VolumeUp sx={{ fontSize: 20 }} />;
}

export default function ChannelPanel({ userId, onNavigate }: ChannelPanelProps) {
  const [server, setServer] = useState<ServerData | null>(null);
  const [unreads, setUnreads] = useState<Record<string, boolean>>({});
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});
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

  const fetchUnreads = useCallback(async () => {
    if (!serverId) return;
    const res = await fetch(`/api/servers/${serverId}/unreads`);
    if (res.ok) {
      const data = await res.json();
      setUnreads(data.unreads);
    }
  }, [serverId]);

  useEffect(() => {
    fetchServer();
  }, [fetchServer]);

  useEffect(() => {
    fetchUnreads();
    const interval = setInterval(fetchUnreads, UNREAD_POLL_MS);
    return () => clearInterval(interval);
  }, [fetchUnreads]);

  if (!server) return null;

  const currentMember = server.members.find((m) => m.user.id === userId);
  const canManage = currentMember ? ADMIN_ROLES.includes(currentMember.role) : false;

  const toggleCollapse = (categoryId: string) => {
    setCollapsed((prev) => ({ ...prev, [categoryId]: !prev[categoryId] }));
  };

  const uncategorized = server.channels.filter((c) => !c.categoryId);
  const categories = (server.categories || []).slice().sort((a, b) => a.position - b.position);

  const renderChannel = (ch: Channel) => {
    const isUnread = unreads[ch.id] && ch.id !== channelId;
    return (
      <ListItemButton
        key={ch.id}
        selected={ch.id === channelId}
        onClick={() => { router.push(`/servers/${server.id}/channels/${ch.id}`); onNavigate?.(); }}
        sx={{ borderRadius: 1, mx: 0.5, px: 1 }}
      >
        <ListItemIcon sx={{ minWidth: 28, color: "text.secondary" }}>
          {getChannelIcon(ch.type)}
        </ListItemIcon>
        <ListItemText
          primary={ch.name}
          slotProps={{
            primary: {
              noWrap: true,
              sx: {
                fontSize: 14,
                fontWeight: isUnread ? 700 : 400,
                color: isUnread ? "text.primary" : "text.secondary",
              },
            },
          }}
        />
        {isUnread && (
          <FiberManualRecord sx={{ fontSize: 8, color: "primary.main", ml: 0.5 }} />
        )}
      </ListItemButton>
    );
  };

  const renderCategoryHeader = (label: string, count: number, categoryId?: string) => (
    <Box
      sx={{
        display: "flex",
        alignItems: "center",
        px: 0.5,
        pt: 2,
        pb: 0.5,
        cursor: categoryId ? "pointer" : undefined,
        userSelect: "none",
      }}
      onClick={categoryId ? () => toggleCollapse(categoryId) : undefined}
    >
      {categoryId && (
        collapsed[categoryId]
          ? <ChevronRight sx={{ fontSize: 16, color: "text.secondary" }} />
          : <ExpandMore sx={{ fontSize: 16, color: "text.secondary" }} />
      )}
      <Typography
        variant="caption"
        sx={{
          color: "text.secondary",
          textTransform: "uppercase",
          fontWeight: 700,
          flex: 1,
          ml: categoryId ? 0 : 1.5,
        }}
      >
        {label} — {count}
      </Typography>
      {canManage && (
        <Tooltip title="Create Channel">
          <IconButton
            size="small"
            onClick={(e) => { e.stopPropagation(); setDialogOpen(true); }}
            sx={{ color: "text.secondary" }}
          >
            <Add sx={{ fontSize: 16 }} />
          </IconButton>
        </Tooltip>
      )}
    </Box>
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
        {uncategorized.length > 0 && (
          <>
            {renderCategoryHeader("Channels", uncategorized.length)}
            <List dense disablePadding>
              {uncategorized.map(renderChannel)}
            </List>
          </>
        )}
        {categories.map((cat) => {
          const catChannels = server.channels.filter((c) => c.categoryId === cat.id);
          if (catChannels.length === 0) return null;
          const isCollapsed = collapsed[cat.id] ?? false;
          return (
            <Box key={cat.id}>
              {renderCategoryHeader(cat.name, catChannels.length, cat.id)}
              <Collapse in={!isCollapsed}>
                <List dense disablePadding>
                  {catChannels.map(renderChannel)}
                </List>
              </Collapse>
            </Box>
          );
        })}
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
        userRole={currentMember?.role || "GUEST"}
        onUpdated={fetchServer}
      />

      <UserInfoPanel />
    </Box>
  );
}
