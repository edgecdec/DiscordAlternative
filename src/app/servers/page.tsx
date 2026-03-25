"use client";

import { useState } from "react";
import { Box, Typography } from "@mui/material";
import { useAuth } from "@/hooks/useAuth";
import ServerSidebar from "@/components/layout/ServerSidebar";
import CreateServerDialog from "@/components/layout/CreateServerDialog";

export default function ServersPage() {
  const { user } = useAuth();
  const [dialogOpen, setDialogOpen] = useState(false);

  if (!user) return null;

  return (
    <Box sx={{ display: "flex", height: "100vh" }}>
      <ServerSidebar onCreateClick={() => setDialogOpen(true)} />
      <Box
        sx={{
          flex: 1,
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
        }}
      >
        <Typography color="text.secondary">
          Select or create a server to get started
        </Typography>
      </Box>
      <CreateServerDialog
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
      />
    </Box>
  );
}
