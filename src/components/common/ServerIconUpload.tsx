"use client";

import { useRef, useState } from "react";
import { Avatar, Box, IconButton, Tooltip, CircularProgress } from "@mui/material";
import { CameraAlt, Close } from "@mui/icons-material";

const ICON_SIZE = 80;

interface ServerIconUploadProps {
  imageUrl: string | null;
  serverName: string;
  onChange: (url: string | null) => void;
}

export default function ServerIconUpload({ imageUrl, serverName, onChange }: ServerIconUploadProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  const handleFile = async (file: File) => {
    setUploading(true);
    try {
      const form = new FormData();
      form.append("file", file);
      const res = await fetch("/api/upload", { method: "POST", body: form });
      if (res.ok) {
        const data = await res.json();
        onChange(data.url);
      }
    } finally {
      setUploading(false);
    }
  };

  return (
    <Box sx={{ display: "flex", alignItems: "center", gap: 2, mb: 2 }}>
      <Box sx={{ position: "relative" }}>
        <Avatar
          src={imageUrl ?? undefined}
          sx={{ width: ICON_SIZE, height: ICON_SIZE, fontSize: 32, bgcolor: "background.default" }}
        >
          {serverName?.[0]?.toUpperCase() ?? "?"}
        </Avatar>
        {uploading && (
          <CircularProgress
            size={ICON_SIZE}
            sx={{ position: "absolute", top: 0, left: 0 }}
          />
        )}
        <Tooltip title="Upload icon">
          <IconButton
            size="small"
            onClick={() => inputRef.current?.click()}
            disabled={uploading}
            sx={{
              position: "absolute",
              bottom: -4,
              right: -4,
              bgcolor: "primary.main",
              color: "common.white",
              width: 28,
              height: 28,
              "&:hover": { bgcolor: "primary.dark" },
            }}
          >
            <CameraAlt sx={{ fontSize: 16 }} />
          </IconButton>
        </Tooltip>
      </Box>
      {imageUrl && (
        <Tooltip title="Remove icon">
          <IconButton size="small" onClick={() => onChange(null)} disabled={uploading}>
            <Close fontSize="small" />
          </IconButton>
        </Tooltip>
      )}
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        hidden
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) handleFile(file);
          e.target.value = "";
        }}
      />
    </Box>
  );
}
