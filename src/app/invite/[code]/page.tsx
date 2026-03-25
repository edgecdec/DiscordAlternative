"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  Box,
  Card,
  CardContent,
  Typography,
  Button,
  Avatar,
  CircularProgress,
  Alert,
} from "@mui/material";
import GroupIcon from "@mui/icons-material/Group";
import { useAuth } from "@/hooks/useAuth";

interface ServerInfo {
  id: string;
  name: string;
  imageUrl: string | null;
  _count: { members: number };
}

export default function InvitePage() {
  const { code } = useParams<{ code: string }>();
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [server, setServer] = useState<ServerInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [joining, setJoining] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchServer() {
      const res = await fetch(`/api/servers/invite/${code}`);
      if (!res.ok) {
        setError("Invalid or expired invite link");
        setLoading(false);
        return;
      }
      const data = await res.json();
      setServer(data.server);
      setLoading(false);
    }
    fetchServer();
  }, [code]);

  const handleJoin = useCallback(async () => {
    if (!user) {
      router.push(`/?redirect=/invite/${code}`);
      return;
    }
    setJoining(true);
    setError(null);
    const res = await fetch(`/api/servers/invite/${code}`, { method: "POST" });
    if (res.status === 409) {
      // Already a member — redirect to server
      if (server) router.replace(`/servers/${server.id}`);
      return;
    }
    if (!res.ok) {
      const data = await res.json();
      setError(data.error || "Failed to join server");
      setJoining(false);
      return;
    }
    const data = await res.json();
    router.replace(`/servers/${data.server.id}`);
  }, [user, code, server, router]);

  if (loading || authLoading) {
    return (
      <Box sx={{ display: "flex", justifyContent: "center", alignItems: "center", minHeight: "100vh", bgcolor: "background.default" }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box sx={{ display: "flex", justifyContent: "center", alignItems: "center", minHeight: "100vh", bgcolor: "background.default" }}>
      <Card sx={{ maxWidth: 400, width: "100%", mx: 2, textAlign: "center" }}>
        <CardContent sx={{ py: 4, px: 3 }}>
          {error && !server ? (
            <Alert severity="error">{error}</Alert>
          ) : server ? (
            <>
              <Avatar
                sx={{ width: 80, height: 80, mx: "auto", mb: 2, bgcolor: "primary.main", fontSize: 32 }}
                src={server.imageUrl || undefined}
              >
                {server.name[0].toUpperCase()}
              </Avatar>
              <Typography variant="body2" color="text.secondary" gutterBottom>
                You&apos;ve been invited to join
              </Typography>
              <Typography variant="h5" fontWeight={700} gutterBottom>
                {server.name}
              </Typography>
              <Box sx={{ display: "flex", justifyContent: "center", alignItems: "center", gap: 0.5, mb: 3 }}>
                <GroupIcon fontSize="small" color="action" />
                <Typography variant="body2" color="text.secondary">
                  {server._count.members} {server._count.members === 1 ? "member" : "members"}
                </Typography>
              </Box>
              {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
              <Button
                variant="contained"
                fullWidth
                size="large"
                onClick={handleJoin}
                disabled={joining}
              >
                {joining ? "Joining…" : user ? "Accept Invite" : "Log in to Join"}
              </Button>
            </>
          ) : null}
        </CardContent>
      </Card>
    </Box>
  );
}
