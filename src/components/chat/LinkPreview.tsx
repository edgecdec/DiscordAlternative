"use client";

import { Box, Link, Typography } from "@mui/material";
import { Link as LinkIcon } from "@mui/icons-material";

interface LinkPreviewProps {
  url: string;
}

function getDomain(url: string): string {
  try {
    return new URL(url).hostname;
  } catch {
    return url;
  }
}

export default function LinkPreview({ url }: LinkPreviewProps) {
  return (
    <Box
      sx={{
        display: "flex",
        alignItems: "center",
        gap: 1,
        mt: 0.5,
        p: 1,
        borderLeft: 3,
        borderColor: "primary.main",
        bgcolor: "action.hover",
        borderRadius: 1,
        maxWidth: 400,
      }}
    >
      <LinkIcon sx={{ fontSize: 18, color: "text.secondary", flexShrink: 0 }} />
      <Link
        href={url}
        target="_blank"
        rel="noopener noreferrer"
        variant="body2"
        sx={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}
      >
        {getDomain(url)}
      </Link>
    </Box>
  );
}
