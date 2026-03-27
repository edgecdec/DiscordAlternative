"use client";

import { useState, type ReactNode } from "react";
import { Box, Drawer, IconButton, Tooltip, Typography, useMediaQuery } from "@mui/material";
import { Keyboard, Menu } from "@mui/icons-material";
import { useAuth } from "@/hooks/useAuth";
import useKeyboardShortcuts from "@/hooks/useKeyboardShortcuts";
import ServerSidebar from "@/components/layout/ServerSidebar";
import ChannelPanel from "@/components/layout/ChannelPanel";
import CreateServerDialog from "@/components/layout/CreateServerDialog";
import MemberList from "@/components/layout/MemberList";
import QuickSwitcher from "@/components/common/QuickSwitcher";

const MOBILE_QUERY = "(max-width:767px)";

const SHORTCUT_HINT = "⌘K / Ctrl+K — Quick switch channels\nEsc — Close dialogs\nType anywhere — Focus chat input";

export default function ServerLayout({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const isMobile = useMediaQuery(MOBILE_QUERY);
  const { quickSwitcherOpen, closeQuickSwitcher } = useKeyboardShortcuts();

  if (!user) return null;

  const panels = (
    <>
      <ServerSidebar onCreateClick={() => { setDialogOpen(true); setDrawerOpen(false); }} onNavigate={() => setDrawerOpen(false)} />
      <ChannelPanel userId={user.id} onNavigate={() => setDrawerOpen(false)} />
    </>
  );

  return (
    <Box sx={{ display: "flex", height: "100vh", overflow: "hidden" }}>
      {isMobile ? (
        <Drawer
          open={drawerOpen}
          onClose={() => setDrawerOpen(false)}
          PaperProps={{ sx: { display: "flex", flexDirection: "row" } }}
        >
          {panels}
        </Drawer>
      ) : (
        panels
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

      {!isMobile && <MemberList />}
      <CreateServerDialog open={dialogOpen} onClose={() => setDialogOpen(false)} />
      <QuickSwitcher open={quickSwitcherOpen} onClose={closeQuickSwitcher} />

      {!isMobile && (
        <Tooltip title={<Typography variant="caption" sx={{ whiteSpace: "pre-line" }}>{SHORTCUT_HINT}</Typography>}>
          <IconButton
            size="small"
            sx={{ position: "fixed", bottom: 8, right: 8, color: "text.disabled", opacity: 0.6 }}
            aria-label="Keyboard shortcuts"
          >
            <Keyboard sx={{ fontSize: 18 }} />
          </IconButton>
        </Tooltip>
      )}
    </Box>
  );
}
