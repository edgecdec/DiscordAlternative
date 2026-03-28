"use client";

import { Fragment, useEffect, useState } from "react";
import { Box, Link, Typography } from "@mui/material";
import type { CustomEmoji } from "@/components/chat/EmojiPicker";

const URL_REGEX = /https?:\/\/[^\s<>)"']+/g;
const MENTION_REGEX = /@(\w+)/g;
const CUSTOM_EMOJI_REGEX = /:([a-zA-Z0-9_]{2,32}):/g;

type Part = { type: "text" | "mention" | "link" | "customEmoji"; value: string };

function parseContent(content: string): Part[] {
  const combined = new RegExp(
    `(${URL_REGEX.source})|(${MENTION_REGEX.source})|(${CUSTOM_EMOJI_REGEX.source})`,
    "g",
  );
  const parts: Part[] = [];
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = combined.exec(content)) !== null) {
    if (match.index > lastIndex) {
      parts.push({ type: "text", value: content.slice(lastIndex, match.index) });
    }
    if (match[1]) {
      parts.push({ type: "link", value: match[1] });
    } else if (match[2]) {
      parts.push({ type: "mention", value: match[2] });
    } else if (match[4]) {
      // match[4] is the full :name: match, match[5] is the inner name
      parts.push({ type: "customEmoji", value: match[5] });
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

// Cache for server emoji keyed by serverId
const emojiCache = new Map<string, CustomEmoji[]>();

interface MentionTextProps {
  content: string;
  serverId?: string;
}

export default function MentionText({ content, serverId }: MentionTextProps) {
  const [customEmoji, setCustomEmoji] = useState<CustomEmoji[]>(
    serverId ? emojiCache.get(serverId) ?? [] : [],
  );

  useEffect(() => {
    if (!serverId) return;
    if (emojiCache.has(serverId)) {
      setCustomEmoji(emojiCache.get(serverId)!);
      return;
    }
    fetch(`/api/servers/${serverId}/emoji`)
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data?.emoji) {
          emojiCache.set(serverId, data.emoji);
          setCustomEmoji(data.emoji);
        }
      });
  }, [serverId]);

  const parts = parseContent(content);
  const emojiMap = new Map(customEmoji.map((e) => [e.name, e]));

  if (parts.length === 0) return <>{content}</>;

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
        if (part.type === "customEmoji") {
          const emoji = emojiMap.get(part.value);
          if (emoji) {
            return (
              <Box
                key={i}
                component="img"
                src={emoji.imageUrl}
                alt={`:${emoji.name}:`}
                title={`:${emoji.name}:`}
                sx={{
                  width: 22,
                  height: 22,
                  objectFit: "contain",
                  verticalAlign: "middle",
                  display: "inline",
                  mx: 0.25,
                }}
              />
            );
          }
          // Not found — render as plain text
          return <Fragment key={i}>:{part.value}:</Fragment>;
        }
        return <Fragment key={i}>{part.value}</Fragment>;
      })}
    </>
  );
}
