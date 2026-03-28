"use client";

import { useCallback, useRef, useState, type DragEvent, type ReactNode } from "react";
import { Box, Typography } from "@mui/material";
import { CloudUpload } from "@mui/icons-material";

interface FileDropZoneProps {
  children: ReactNode;
  onFilesDropped: (files: File[]) => void;
  disabled?: boolean;
}

export default function FileDropZone({ children, onFilesDropped, disabled }: FileDropZoneProps) {
  const [dragging, setDragging] = useState(false);
  const dragCounter = useRef(0);

  const handleDragEnter = useCallback((e: DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    dragCounter.current++;
    if (e.dataTransfer.types.includes("Files")) setDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    dragCounter.current--;
    if (dragCounter.current === 0) setDragging(false);
  }, []);

  const handleDragOver = useCallback((e: DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  const handleDrop = useCallback(
    (e: DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      dragCounter.current = 0;
      setDragging(false);
      if (disabled) return;
      const files = Array.from(e.dataTransfer.files);
      if (files.length > 0) onFilesDropped(files);
    },
    [onFilesDropped, disabled],
  );

  return (
    <Box
      sx={{ position: "relative", flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}
      onDragEnter={handleDragEnter}
      onDragLeave={handleDragLeave}
      onDragOver={handleDragOver}
      onDrop={handleDrop}
    >
      {children}
      {dragging && (
        <Box
          sx={{
            position: "absolute",
            inset: 0,
            bgcolor: "rgba(88, 101, 242, 0.15)",
            border: 2,
            borderStyle: "dashed",
            borderColor: "primary.main",
            borderRadius: 2,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 10,
            pointerEvents: "none",
          }}
        >
          <CloudUpload sx={{ fontSize: 48, color: "primary.main", mb: 1 }} />
          <Typography variant="h6" color="primary.main" fontWeight={700}>
            Drop files to upload
          </Typography>
        </Box>
      )}
    </Box>
  );
}
