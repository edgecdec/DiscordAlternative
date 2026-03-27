"use client";

import { Avatar, List, ListItemButton, ListItemAvatar, ListItemText, Paper, Popper } from "@mui/material";

export interface MentionMember {
  id: string;
  username: string;
  avatarUrl: string | null;
}

interface MentionAutocompleteProps {
  filtered: MentionMember[];
  anchorEl: HTMLElement | null;
  selectedIndex: number;
  onSelect: (username: string) => void;
}

export default function MentionAutocomplete({ filtered, anchorEl, selectedIndex, onSelect }: MentionAutocompleteProps) {
  if (!anchorEl || filtered.length === 0) return null;

  return (
    <Popper open anchorEl={anchorEl} placement="top-start" sx={{ zIndex: 1300, width: 220 }}>
      <Paper elevation={4} sx={{ maxHeight: 200, overflow: "auto" }}>
        <List dense disablePadding>
          {filtered.slice(0, 10).map((m, i) => (
            <ListItemButton
              key={m.id}
              selected={i === selectedIndex}
              onMouseDown={(e) => {
                e.preventDefault();
                onSelect(m.username);
              }}
              sx={{ py: 0.5 }}
            >
              <ListItemAvatar sx={{ minWidth: 32 }}>
                <Avatar sx={{ width: 24, height: 24, fontSize: 12, bgcolor: "primary.main" }}>
                  {m.username[0].toUpperCase()}
                </Avatar>
              </ListItemAvatar>
              <ListItemText primary={m.username} primaryTypographyProps={{ variant: "body2" }} />
            </ListItemButton>
          ))}
        </List>
      </Paper>
    </Popper>
  );
}
