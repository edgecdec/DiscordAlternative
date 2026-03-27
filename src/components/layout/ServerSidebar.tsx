"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter, useParams, usePathname } from "next/navigation";
import { Badge, Box, Avatar, Tooltip, IconButton, Divider } from "@mui/material";
import { Add, ChatBubble } from "@mui/icons-material";

const SIDEBAR_WIDTH = 72;
const UNREAD_POLL_MS = 30_000;

interface ServerItem {
  id: string;
  name: string;
  imageUrl: string | null;
}

interface ServerSidebarProps {
  onCreateClick: () => void;
  onNavigate?: () => void;
}

export default function ServerSidebar({ onCreateClick, onNavigate }: ServerSidebarProps) {
  const [servers, setServers] = useState<ServerItem[]>([]);
  const [serverUnreads, setServerUnreads] = useState<Record<string, boolean>>({});
  const router = useRouter();
  const params = useParams();
  const pathname = usePathname();
  const activeServerId = params?.serverId as string | undefined;
  const isDmActive = pathname?.startsWith("/dm") ?? false;

  const fetchServers = useCallback(async () => {
    const res = await fetch("/api/servers");
    if (res.ok) {
      const data = await res.json();
      setServers(data.servers);
    }
  }, []);

  const fetchAllUnreads = useCallback(async () => {
    if (servers.length === 0) return;
    const results: Record<string, boolean> = {};
    await Promise.all(
      servers.map(async (s) => {
        const res = await fetch(`/api/servers/${s.id}/unreads`);
        if (res.ok) {
          const data = await res.json();
          results[s.id] = Object.values(data.unreads as Record<string, boolean>).some(Boolean);
        }
      })
    );
    setServerUnreads(results);
  }, [servers]);

  useEffect(() => {
    fetchServers();
  }, [fetchServers]);

  useEffect(() => {
    fetchAllUnreads();
    const interval = setInterval(fetchAllUnreads, UNREAD_POLL_MS);
    return () => clearInterval(interval);
  }, [fetchAllUnreads]);

  return (
    <Box
      sx={{
        width: SIDEBAR_WIDTH,
        minWidth: SIDEBAR_WIDTH,
        height: "100vh",
        bgcolor: "background.default",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        py: 1,
        gap: 1,
        overflowY: "auto",
        borderRight: 1,
        borderColor: "divider",
      }}
    >
      <Tooltip title="Direct Messages" placement="right">
        <IconButton
          onClick={() => { router.push("/dm"); onNavigate?.(); }}
          sx={{
            width: 48,
            height: 48,
            bgcolor: isDmActive ? "primary.main" : "background.paper",
            color: isDmActive ? "common.white" : "text.primary",
            borderRadius: isDmActive ? 2 : "50%",
            transition: "border-radius 0.2s",
            "&:hover": { bgcolor: isDmActive ? "primary.main" : "action.hover" },
          }}
          aria-label="Direct Messages"
        >
          <ChatBubble />
        </IconButton>
      </Tooltip>

      <Divider flexItem sx={{ mx: 1 }} />

      {servers.map((server) => {
        const isActive = server.id === activeServerId;
        const hasUnread = serverUnreads[server.id] && !isActive;
        return (
          <Tooltip key={server.id} title={server.name} placement="right">
            <Box
              sx={{
                position: "relative",
                cursor: "pointer",
                "&::before": isActive
                  ? {
                      content: '""',
                      position: "absolute",
                      left: -8,
                      top: "50%",
                      transform: "translateY(-50%)",
                      width: 4,
                      height: 36,
                      borderRadius: 1,
                      bgcolor: "primary.main",
                    }
                  : undefined,
              }}
              onClick={() => { router.push(`/servers/${server.id}`); onNavigate?.(); }}
            >
              <Badge
                variant="dot"
                invisible={!hasUnread}
                overlap="circular"
                sx={{ "& .MuiBadge-dot": { bgcolor: "primary.main", width: 10, height: 10, borderRadius: "50%" } }}
              >
                <Avatar
                  src={server.imageUrl ?? undefined}
                  sx={{
                    width: 48,
                    height: 48,
                    bgcolor: isActive ? "primary.main" : "background.paper",
                    color: "text.primary",
                    fontSize: 18,
                    transition: "border-radius 0.2s",
                    borderRadius: isActive ? 2 : "50%",
                  }}
                >
                  {server.name[0]?.toUpperCase()}
                </Avatar>
              </Badge>
            </Box>
          </Tooltip>
        );
      })}

      <Divider flexItem sx={{ mx: 1 }} />

      <Tooltip title="Create Server" placement="right">
        <IconButton
          onClick={onCreateClick}
          sx={{
            width: 48,
            height: 48,
            bgcolor: "background.paper",
            color: "primary.main",
            "&:hover": { bgcolor: "primary.main", color: "common.white" },
          }}
        >
          <Add />
        </IconButton>
      </Tooltip>
    </Box>
  );
}
