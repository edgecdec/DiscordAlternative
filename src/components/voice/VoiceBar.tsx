"use client";

import { Box, Typography, IconButton, Tooltip } from "@mui/material";
import { CallEnd, VolumeUp } from "@mui/icons-material";
import { useRouter } from "next/navigation";
import { useVoice } from "@/hooks/useVoice";

export default function VoiceBar() {
  const { voice, disconnectVoice } = useVoice();
  const router = useRouter();

  if (!voice) return null;

  return (
    <Box
      sx={{
        px: 1.5,
        py: 1,
        borderTop: 1,
        borderColor: "divider",
        bgcolor: "success.dark",
        display: "flex",
        alignItems: "center",
        gap: 1,
      }}
    >
      <VolumeUp sx={{ fontSize: 16, color: "success.light" }} />
      <Box
        sx={{ flex: 1, cursor: "pointer", minWidth: 0 }}
        onClick={() => router.push(`/servers/${voice.serverId}/channels/${voice.channelId}`)}
      >
        <Typography variant="caption" sx={{ color: "success.light", fontWeight: 700, display: "block" }}>
          Voice Connected
        </Typography>
        <Typography variant="caption" noWrap sx={{ color: "common.white", display: "block" }}>
          {voice.channelName}
        </Typography>
      </Box>
      <Tooltip title="Disconnect">
        <IconButton size="small" onClick={disconnectVoice} sx={{ color: "common.white" }}>
          <CallEnd sx={{ fontSize: 18 }} />
        </IconButton>
      </Tooltip>
    </Box>
  );
}
