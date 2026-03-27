"use client";

import { Fragment } from "react";
import { Typography } from "@mui/material";

const MENTION_REGEX = /@(\w+)/g;

interface MentionTextProps {
  content: string;
}

export default function MentionText({ content }: MentionTextProps) {
  const parts: Array<{ type: "text" | "mention"; value: string }> = [];
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = MENTION_REGEX.exec(content)) !== null) {
    if (match.index > lastIndex) {
      parts.push({ type: "text", value: content.slice(lastIndex, match.index) });
    }
    parts.push({ type: "mention", value: match[0] });
    lastIndex = match.index + match[0].length;
  }
  if (lastIndex < content.length) {
    parts.push({ type: "text", value: content.slice(lastIndex) });
  }

  if (parts.length === 0) {
    return <>{content}</>;
  }

  return (
    <>
      {parts.map((part, i) =>
        part.type === "mention" ? (
          <Typography
            key={i}
            component="span"
            variant="body2"
            sx={{
              color: "primary.main",
              bgcolor: "action.hover",
              borderRadius: 0.5,
              px: 0.25,
              fontWeight: 600,
              cursor: "pointer",
            }}
          >
            {part.value}
          </Typography>
        ) : (
          <Fragment key={i}>{part.value}</Fragment>
        )
      )}
    </>
  );
}
