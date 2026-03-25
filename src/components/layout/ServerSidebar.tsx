"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter, useParams } from "next/navigation";
import { Box, Avatar, Tooltip, IconButton, Divider } from "@mui/material";
import { Add } from "@mui/icons-material";

const SIDEBAR_WIDTH = 72;

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
  const router = useRouter();
  const params = useParams();
  const activeServerId = params?.serverId as string | undefined;

  const fetchServers = useCallback(async () => {
    const res = await fetch("/api/servers");
    if (res.ok) {
      const data = await res.json();
      setServers(data.servers);
    }
  }, []);

  useEffect(() => {
    fetchServers();
  }, [fetchServers]);

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
      {servers.map((server) => {
        const isActive = server.id === activeServerId;
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
