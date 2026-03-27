"use client";

import { Fragment } from "react";
import { Link, Typography } from "@mui/material";

const URL_REGEX = /https?:\/\/[^\s<>)"']+/g;
const MENTION_REGEX = /@(\w+)/g;

type Part = { type: "text" | "mention" | "link"; value: string };

function parseContent(content: string): Part[] {
  const combined = new RegExp(`(${URL_REGEX.source})|(${MENTION_REGEX.source})`, "g");
  const parts: Part[] = [];
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = combined.exec(content)) !== null) {
    if (match.index > lastIndex) {
      parts.push({ type: "text", value: content.slice(lastIndex, match.index) });
    }
    if (match[1]) {
      parts.push({ type: "link", value: match[1] });
    } else {
      parts.push({ type: "mention", value: match[0] });
    }
    lastIndex = match.index + match[0].length;
  }
  if (lastIndex < content.length) {
    parts.push({ type: "text", value: content.slice(lastIndex) });
  }
  return parts;
}

export function extractFirstUrl(content: string): string | null {
  const match = content.match(URL_REGEX);
  return match ? match[0] : null;
}

interface MentionTextProps {
  content: string;
}

export default function MentionText({ content }: MentionTextProps) {
  const parts = parseContent(content);

  if (parts.length === 0) {
    return <>{content}</>;
  }

  return (
    <>
      {parts.map((part, i) => {
        if (part.type === "mention") {
          return (
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
          );
        }
        if (part.type === "link") {
          return (
            <Link
              key={i}
              href={part.value}
              target="_blank"
              rel="noopener noreferrer"
              sx={{ wordBreak: "break-all" }}
            >
              {part.value}
            </Link>
          );
        }
        return <Fragment key={i}>{part.value}</Fragment>;
      })}
    </>
  );
}
