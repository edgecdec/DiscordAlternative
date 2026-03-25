"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Box, CircularProgress } from "@mui/material";

interface Channel {
  id: string;
  type: string;
}

interface ServerData {
  channels: Channel[];
}

export default function ServerPage() {
  const params = useParams();
  const router = useRouter();
  const serverId = params?.serverId as string;
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!serverId) return;
    fetch(`/api/servers/${serverId}`)
      .then((res) => (res.ok ? res.json() : null))
      .then((data: { server: ServerData } | null) => {
        if (!data) return;
        const textChannel = data.server.channels.find((c) => c.type === "TEXT");
        if (textChannel) {
          router.replace(`/servers/${serverId}/channels/${textChannel.id}`);
        }
      })
      .finally(() => setLoading(false));
  }, [serverId, router]);

  if (!loading) return null;

  return (
    <Box sx={{ flex: 1, display: "flex", justifyContent: "center", alignItems: "center" }}>
      <CircularProgress />
    </Box>
  );
}
