"use client";

import { useState, type ReactNode } from "react";
import { Box } from "@mui/material";
import { useAuth } from "@/hooks/useAuth";
import ServerSidebar from "@/components/layout/ServerSidebar";
import ChannelPanel from "@/components/layout/ChannelPanel";
import CreateServerDialog from "@/components/layout/CreateServerDialog";
import MemberList from "@/components/layout/MemberList";

export default function ServerLayout({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [dialogOpen, setDialogOpen] = useState(false);

  if (!user) return null;

  return (
    <Box sx={{ display: "flex", height: "100vh", overflow: "hidden" }}>
      <ServerSidebar onCreateClick={() => setDialogOpen(true)} />
      <ChannelPanel userId={user.id} />
      <Box sx={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>
        {children}
      </Box>
      <MemberList />
      <CreateServerDialog open={dialogOpen} onClose={() => setDialogOpen(false)} />
    </Box>
  );
}
