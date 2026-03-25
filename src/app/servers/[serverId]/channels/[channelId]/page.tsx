"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { Box, Typography } from "@mui/material";
import { Tag } from "@mui/icons-material";

export default function ChannelPage() {
  const params = useParams();
  const channelId = params?.channelId as string;
  const serverId = params?.serverId as string;
  const [channelName, setChannelName] = useState<string | null>(null);

  useEffect(() => {
    if (!serverId) return;
    fetch(`/api/servers/${serverId}`)
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (!data) return;
        const ch = data.server.channels.find(
          (c: { id: string; name: string }) => c.id === channelId
        );
        if (ch) setChannelName(ch.name);
      });
  }, [serverId, channelId]);

  return (
    <Box sx={{ flex: 1, display: "flex", flexDirection: "column", height: "100%" }}>
      <Box
        sx={{
          px: 2,
          py: 1,
          borderBottom: 1,
          borderColor: "divider",
          display: "flex",
          alignItems: "center",
          gap: 1,
        }}
      >
        <Tag sx={{ color: "text.secondary", fontSize: 20 }} />
        <Typography variant="subtitle1" fontWeight={700}>
          {channelName ?? "Loading..."}
        </Typography>
      </Box>
      <Box
        sx={{
          flex: 1,
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
        }}
      >
        <Typography color="text.secondary">
          {channelName ? `Welcome to #${channelName}` : ""}
        </Typography>
      </Box>
    </Box>
  );
}
