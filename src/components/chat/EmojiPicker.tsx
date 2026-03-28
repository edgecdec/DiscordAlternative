"use client";

import { useCallback, useEffect, useState } from "react";
import { Box, IconButton, Popover, Tab, Tabs, Typography } from "@mui/material";

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

export interface CustomEmoji {
  id: string;
  name: string;
  imageUrl: string;
}

interface EmojiPickerProps {
  anchorEl: HTMLElement | null;
  onClose: () => void;
  onSelect: (emoji: string) => void;
  onSelectCustom?: (emoji: CustomEmoji) => void;
  serverId?: string;
}

export default function EmojiPicker({ anchorEl, onClose, onSelect, onSelectCustom, serverId }: EmojiPickerProps) {
  const [tab, setTab] = useState(0);
  const [customEmoji, setCustomEmoji] = useState<CustomEmoji[]>([]);

  useEffect(() => {
    if (!serverId || !anchorEl) return;
    fetch(`/api/servers/${serverId}/emoji`)
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data?.emoji) setCustomEmoji(data.emoji);
      });
  }, [serverId, anchorEl]);

  const handleClick = useCallback(
    (emoji: string) => {
      onSelect(emoji);
      onClose();
    },
    [onSelect, onClose],
  );

  const handleCustomClick = useCallback(
    (emoji: CustomEmoji) => {
      onSelectCustom?.(emoji);
      onClose();
    },
    [onSelectCustom, onClose],
  );

  const hasCustom = serverId && customEmoji.length > 0;

  return (
    <Popover
      open={Boolean(anchorEl)}
      anchorEl={anchorEl}
      onClose={onClose}
      anchorOrigin={{ vertical: "top", horizontal: "center" }}
      transformOrigin={{ vertical: "bottom", horizontal: "center" }}
      slotProps={{ paper: { sx: { width: 320, maxHeight: 400, display: "flex", flexDirection: "column" } } }}
    >
      {hasCustom && (
        <Tabs value={tab} onChange={(_, v) => setTab(v)} variant="fullWidth" sx={{ minHeight: 36 }}>
          <Tab label="Standard" sx={{ minHeight: 36, py: 0, fontSize: 12 }} />
          <Tab label="Server" sx={{ minHeight: 36, py: 0, fontSize: 12 }} />
        </Tabs>
      )}
      <Box sx={{ overflow: "auto", p: 1 }}>
        {(!hasCustom || tab === 0) &&
          EMOJI_CATEGORIES.map((cat) => (
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
        {hasCustom && tab === 1 && (
          <Box sx={{ display: "flex", flexWrap: "wrap", gap: 0.5 }}>
            {customEmoji.map((e) => (
              <IconButton
                key={e.id}
                size="small"
                onClick={() => handleCustomClick(e)}
                sx={{ width: 36, height: 36, p: 0.25 }}
                aria-label={e.name}
                title={`:${e.name}:`}
              >
                <Box
                  component="img"
                  src={e.imageUrl}
                  alt={e.name}
                  sx={{ width: 28, height: 28, objectFit: "contain" }}
                />
              </IconButton>
            ))}
          </Box>
        )}
      </Box>
    </Popover>
  );
}
