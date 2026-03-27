"use client";

import { Box, Typography } from "@mui/material";
import { Reply as ReplyIcon } from "@mui/icons-material";
import type { MessageReplyTo } from "@/types/socket";

const SNIPPET_MAX = 80;

interface ReplyQuoteProps {
  replyTo: MessageReplyTo;
}

export default function ReplyQuote({ replyTo }: ReplyQuoteProps) {
  const snippet = replyTo.deleted
    ? "Original message was deleted"
    : replyTo.content.length > SNIPPET_MAX
      ? replyTo.content.slice(0, SNIPPET_MAX) + "…"
      : replyTo.content;

  return (
    <Box
      sx={{
        display: "flex",
        alignItems: "center",
        gap: 0.5,
        pl: 1,
        mb: 0.25,
        borderLeft: 2,
        borderColor: "primary.main",
      }}
    >
      <ReplyIcon sx={{ fontSize: 12, color: "text.secondary", transform: "scaleX(-1)" }} />
      <Typography variant="caption" fontWeight={600} color="text.secondary">
        {replyTo.author.username}
      </Typography>
      <Typography
        variant="caption"
        color="text.secondary"
        noWrap
        sx={{ fontStyle: replyTo.deleted ? "italic" : "normal" }}
      >
        {snippet}
      </Typography>
    </Box>
  );
}
