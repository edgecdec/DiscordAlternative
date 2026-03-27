"use client";

import { useCallback } from "react";
import { Box, IconButton, Popover, Typography } from "@mui/material";

const EMOJI_CATEGORIES: { label: string; emojis: string[] }[] = [
  {
    label: "Smileys",
    emojis: [
      "😀","😂","🤣","😊","😍","🥰","😘","😎","🤩","🥳",
      "😏","😒","😔","😢","😭","😤","🤯","😱","🥺","😴",
      "🤔","🤫","🤭","🙄","😬","🤗","🫡","🫠","😈","💀",
    ],
  },
  {
    label: "Gestures",
    emojis: [
      "👍","👎","👏","🙌","🤝","✌️","🤞","🫶","❤️","🔥",
      "💯","⭐","✨","🎉","🎊","💪","👀","🧠","💬","💡",
    ],
  },
  {
    label: "Objects",
    emojis: [
      "🎮","🎵","🎧","📱","💻","⌨️","🖥️","📸","🎬","📝",
      "📌","🔗","🛠️","⚙️","🔒","🔑","📦","🚀","⏰","☕",
    ],
  },
  {
    label: "Nature",
    emojis: [
      "🌞","🌙","⚡","🌈","🌊","🍕","🍔","🍺","🍷","🎂",
      "🐱","🐶","🦊","🐸","🐻","🌸","🌺","🍀","🌲","🍄",
    ],
  },
];

interface EmojiPickerProps {
  anchorEl: HTMLElement | null;
  onClose: () => void;
  onSelect: (emoji: string) => void;
}

export default function EmojiPicker({ anchorEl, onClose, onSelect }: EmojiPickerProps) {
  const handleClick = useCallback(
    (emoji: string) => {
      onSelect(emoji);
      onClose();
    },
    [onSelect, onClose],
  );

  return (
    <Popover
      open={Boolean(anchorEl)}
      anchorEl={anchorEl}
      onClose={onClose}
      anchorOrigin={{ vertical: "top", horizontal: "center" }}
      transformOrigin={{ vertical: "bottom", horizontal: "center" }}
      slotProps={{ paper: { sx: { width: 320, maxHeight: 360, p: 1 } } }}
    >
      {EMOJI_CATEGORIES.map((cat) => (
        <Box key={cat.label} sx={{ mb: 1 }}>
          <Typography variant="caption" color="text.secondary" sx={{ px: 0.5, fontWeight: 600 }}>
            {cat.label}
          </Typography>
          <Box sx={{ display: "flex", flexWrap: "wrap" }}>
            {cat.emojis.map((emoji) => (
              <IconButton
                key={emoji}
                size="small"
                onClick={() => handleClick(emoji)}
                sx={{ fontSize: 20, width: 36, height: 36 }}
                aria-label={emoji}
              >
                {emoji}
              </IconButton>
            ))}
          </Box>
        </Box>
      ))}
    </Popover>
  );
}
