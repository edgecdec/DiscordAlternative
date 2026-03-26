"use client";

import { useState } from "react";
import { Box, Chip, IconButton, Popover } from "@mui/material";
import AddReactionOutlinedIcon from "@mui/icons-material/AddReactionOutlined";
import type { ReactionGroup } from "@/types/socket";

const EMOJI_LIST = [
  "👍", "👎", "😂", "❤️", "🔥", "🎉", "😢", "😮",
  "👀", "🙏", "💯", "✅", "❌", "⭐", "🤔", "😍",
  "🥳", "👏", "💀", "🫡", "😭", "🤣", "💪", "🙌",
];

interface ReactionBarProps {
  reactions: Record<string, ReactionGroup>;
  onToggle: (emoji: string) => void;
}

export default function ReactionBar({ reactions, onToggle }: ReactionBarProps) {
  const [anchorEl, setAnchorEl] = useState<HTMLElement | null>(null);
  const entries = Object.entries(reactions).filter(([, v]) => v.count > 0);

  return (
    <Box sx={{ display: "flex", flexWrap: "wrap", gap: 0.5, alignItems: "center", mt: 0.5 }}>
      {entries.map(([emoji, { count, userReacted }]) => (
        <Chip
          key={emoji}
          label={`${emoji} ${count}`}
          size="small"
          variant={userReacted ? "filled" : "outlined"}
          onClick={() => onToggle(emoji)}
          sx={{
            cursor: "pointer",
            height: 24,
            fontSize: 13,
            borderColor: userReacted ? "primary.main" : "divider",
            bgcolor: userReacted ? "primary.dark" : "transparent",
            color: "text.primary",
            "&:hover": { bgcolor: "action.hover" },
          }}
        />
      ))}
      <IconButton
        size="small"
        className="reaction-add-btn"
        onClick={(e) => setAnchorEl(e.currentTarget)}
        sx={{ width: 24, height: 24, opacity: entries.length > 0 ? 1 : 0, "&:hover": { opacity: 1 } }}
      >
        <AddReactionOutlinedIcon sx={{ fontSize: 16 }} />
      </IconButton>
      <Popover
        open={Boolean(anchorEl)}
        anchorEl={anchorEl}
        onClose={() => setAnchorEl(null)}
        anchorOrigin={{ vertical: "top", horizontal: "left" }}
        transformOrigin={{ vertical: "bottom", horizontal: "left" }}
      >
        <Box sx={{ display: "grid", gridTemplateColumns: "repeat(8, 1fr)", gap: 0.25, p: 1 }}>
          {EMOJI_LIST.map((e) => (
            <Box
              key={e}
              onClick={() => { onToggle(e); setAnchorEl(null); }}
              sx={{
                cursor: "pointer",
                fontSize: 20,
                p: 0.5,
                borderRadius: 1,
                textAlign: "center",
                "&:hover": { bgcolor: "action.hover" },
              }}
            >
              {e}
            </Box>
          ))}
        </Box>
      </Popover>
    </Box>
  );
}
