"use client";

import { useState, type ReactNode } from "react";
import { Box, Drawer, IconButton, useMediaQuery } from "@mui/material";
import { Menu } from "@mui/icons-material";
import { useAuth } from "@/hooks/useAuth";
import ServerSidebar from "@/components/layout/ServerSidebar";
import CreateServerDialog from "@/components/layout/CreateServerDialog";

const MOBILE_QUERY = "(max-width:767px)";

export default function DMLayout({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const isMobile = useMediaQuery(MOBILE_QUERY);

  if (!user) return null;

  const sidebar = (
    <ServerSidebar
      onCreateClick={() => { setDialogOpen(true); setDrawerOpen(false); }}
      onNavigate={() => setDrawerOpen(false)}
    />
  );

  return (
    <Box sx={{ display: "flex", height: "100vh", overflow: "hidden" }}>
      {isMobile ? (
        <Drawer open={drawerOpen} onClose={() => setDrawerOpen(false)}>
          {sidebar}
        </Drawer>
      ) : (
        sidebar
      )}
      <Box sx={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>
        {isMobile && (
          <IconButton
            onClick={() => setDrawerOpen(true)}
            sx={{ position: "absolute", top: 6, left: 8, zIndex: 10 }}
            size="small"
            aria-label="Open navigation"
          >
            <Menu />
          </IconButton>
        )}
        {children}
      </Box>
      <CreateServerDialog open={dialogOpen} onClose={() => setDialogOpen(false)} />
    </Box>
  );
}
