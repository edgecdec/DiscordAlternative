"use client";

import { useEffect, useState, useCallback } from "react";
import { Box, Typography, Button, CircularProgress } from "@mui/material";
import { Add, Login } from "@mui/icons-material";
import { useAuth } from "@/hooks/useAuth";
import ServerSidebar from "@/components/layout/ServerSidebar";
import CreateServerDialog from "@/components/layout/CreateServerDialog";
import JoinServerDialog from "@/components/layout/JoinServerDialog";

export default function ServersPage() {
  const { user } = useAuth();
  const [createOpen, setCreateOpen] = useState(false);
  const [joinOpen, setJoinOpen] = useState(false);
  const [serverCount, setServerCount] = useState<number | null>(null);

  const fetchCount = useCallback(async () => {
    const res = await fetch("/api/servers");
    if (res.ok) {
      const data = await res.json();
      setServerCount(data.servers?.length ?? 0);
    }
  }, []);

  useEffect(() => {
    if (user) fetchCount();
  }, [user, fetchCount]);

  if (!user) return null;

  const hasServers = serverCount !== null && serverCount > 0;
  const loading = serverCount === null;

  return (
    <Box sx={{ display: "flex", height: "100vh" }}>
      {hasServers && <ServerSidebar onCreateClick={() => setCreateOpen(true)} />}
      <Box
        sx={{
          flex: 1,
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          alignItems: "center",
          gap: 2,
          bgcolor: "background.default",
        }}
      >
        {loading ? (
          <CircularProgress />
        ) : hasServers ? (
          <Typography color="text.secondary">
            Select or create a server to get started
          </Typography>
        ) : (
          <>
            <Typography variant="h4" fontWeight={700}>
              Welcome to Discord Alt!
            </Typography>
            <Typography color="text.secondary" sx={{ mb: 2 }}>
              Create your own server or join an existing one with an invite code.
            </Typography>
            <Box sx={{ display: "flex", gap: 2 }}>
              <Button
                variant="contained"
                size="large"
                startIcon={<Add />}
                onClick={() => setCreateOpen(true)}
              >
                Create a Server
              </Button>
              <Button
                variant="outlined"
                size="large"
                startIcon={<Login />}
                onClick={() => setJoinOpen(true)}
              >
                Join a Server
              </Button>
            </Box>
          </>
        )}
      </Box>
      <CreateServerDialog open={createOpen} onClose={() => setCreateOpen(false)} />
      <JoinServerDialog open={joinOpen} onClose={() => setJoinOpen(false)} />
    </Box>
  );
}
