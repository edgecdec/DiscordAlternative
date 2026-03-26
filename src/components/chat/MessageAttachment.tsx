"use client";

import { Box, Link } from "@mui/material";
import InsertDriveFileIcon from "@mui/icons-material/InsertDriveFile";

const IMAGE_EXTENSIONS = new Set(["jpg", "jpeg", "png", "gif", "webp"]);

function getExtension(url: string): string {
  const path = url.split("?")[0];
  const dot = path.lastIndexOf(".");
  return dot === -1 ? "" : path.slice(dot + 1).toLowerCase();
}

function getFilename(url: string): string {
  const path = url.split("?")[0];
  return path.split("/").pop() ?? url;
}

interface MessageAttachmentProps {
  fileUrl: string;
}

export default function MessageAttachment({ fileUrl }: MessageAttachmentProps) {
  const ext = getExtension(fileUrl);

  if (IMAGE_EXTENSIONS.has(ext)) {
    return (
      <Box
        component="img"
        src={fileUrl}
        alt="attachment"
        sx={{
          maxWidth: 400,
          maxHeight: 300,
          borderRadius: 1,
          mt: 0.5,
          display: "block",
          cursor: "pointer",
        }}
        onClick={() => window.open(fileUrl, "_blank")}
      />
    );
  }

  return (
    <Link
      href={fileUrl}
      target="_blank"
      rel="noopener noreferrer"
      download
      sx={{
        display: "inline-flex",
        alignItems: "center",
        gap: 0.5,
        mt: 0.5,
        px: 1.5,
        py: 0.75,
        borderRadius: 1,
        bgcolor: "action.hover",
        textDecoration: "none",
        color: "primary.main",
        "&:hover": { bgcolor: "action.selected" },
      }}
    >
      <InsertDriveFileIcon fontSize="small" />
      {getFilename(fileUrl)}
    </Link>
  );
}
