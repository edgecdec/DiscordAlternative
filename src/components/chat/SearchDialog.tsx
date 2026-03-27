"use client";

import { useCallback, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Avatar,
  Box,
  CircularProgress,
  Dialog,
  DialogContent,
  DialogTitle,
  IconButton,
  InputAdornment,
  List,
  ListItemButton,
  TextField,
  Typography,
} from "@mui/material";
import { Close, Search as SearchIcon, Tag } from "@mui/icons-material";
import type { SocketMessage } from "@/types/socket";

interface SearchResult extends SocketMessage {
  channel: { id: string; name: string };
}

interface SearchDialogProps {
  open: boolean;
  onClose: () => void;
  serverId: string;
}

const DEBOUNCE_MS = 400;
const SNIPPET_LENGTH = 120;

function snippet(content: string, query: string): string {
  const lower = content.toLowerCase();
  const idx = lower.indexOf(query.toLowerCase());
  if (idx === -1 || content.length <= SNIPPET_LENGTH) return content.slice(0, SNIPPET_LENGTH);
  const start = Math.max(0, idx - 40);
  const end = Math.min(content.length, start + SNIPPET_LENGTH);
  return (start > 0 ? "…" : "") + content.slice(start, end) + (end < content.length ? "…" : "");
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
}

export default function SearchDialog({ open, onClose, serverId }: SearchDialogProps) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const router = useRouter();

  const doSearch = useCallback(async (q: string, cursor?: string) => {
    if (!q.trim()) {
      setResults([]);
      setSearched(false);
      setNextCursor(null);
      return;
    }
    setLoading(true);
    try {
      const url = `/api/servers/${serverId}/search?q=${encodeURIComponent(q.trim())}${cursor ? `&cursor=${cursor}` : ""}`;
      const res = await fetch(url);
      if (!res.ok) return;
      const data = await res.json();
      setResults((prev) => cursor ? [...prev, ...data.messages] : data.messages);
      setNextCursor(data.nextCursor);
      setSearched(true);
    } finally {
      setLoading(false);
    }
  }, [serverId]);

  const handleChange = useCallback((value: string) => {
    setQuery(value);
    if (timerRef.current) clearTimeout(timerRef.current);
    if (!value.trim()) {
      setResults([]);
      setSearched(false);
      setNextCursor(null);
      return;
    }
    timerRef.current = setTimeout(() => doSearch(value), DEBOUNCE_MS);
  }, [doSearch]);

  const handleResultClick = (result: SearchResult) => {
    onClose();
    router.push(`/servers/${serverId}/channels/${result.channel.id}`);
  };

  const handleClose = () => {
    setQuery("");
    setResults([]);
    setSearched(false);
    setNextCursor(null);
    onClose();
  };

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth>
      <DialogTitle sx={{ display: "flex", alignItems: "center", gap: 1, pb: 0 }}>
        <SearchIcon color="action" />
        <Typography variant="h6" sx={{ flex: 1 }}>Search Messages</Typography>
        <IconButton onClick={handleClose} size="small"><Close /></IconButton>
      </DialogTitle>
      <DialogContent>
        <TextField
          autoFocus
          fullWidth
          size="small"
          placeholder="Search messages…"
          value={query}
          onChange={(e) => handleChange(e.target.value)}
          sx={{ mt: 1, mb: 2 }}
          slotProps={{
            input: {
              startAdornment: (
                <InputAdornment position="start"><SearchIcon fontSize="small" /></InputAdornment>
              ),
            },
          }}
        />
        {loading && results.length === 0 && (
          <Box sx={{ display: "flex", justifyContent: "center", py: 3 }}>
            <CircularProgress size={28} />
          </Box>
        )}
        {searched && results.length === 0 && !loading && (
          <Typography color="text.secondary" textAlign="center" sx={{ py: 3 }}>
            No results found
          </Typography>
        )}
        {results.length > 0 && (
          <List disablePadding sx={{ maxHeight: 400, overflowY: "auto" }}>
            {results.map((r) => (
              <ListItemButton
                key={r.id}
                onClick={() => handleResultClick(r)}
                sx={{ borderRadius: 1, mb: 0.5, alignItems: "flex-start", gap: 1.5 }}
              >
                <Avatar sx={{ width: 32, height: 32, mt: 0.5, bgcolor: "primary.main", fontSize: 13 }} src={r.author.avatarUrl ?? undefined}>
                  {r.author.username[0].toUpperCase()}
                </Avatar>
                <Box sx={{ minWidth: 0, flex: 1 }}>
                  <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
                    <Typography variant="body2" fontWeight={600} noWrap>{r.author.username}</Typography>
                    <Typography variant="caption" color="text.secondary" sx={{ ml: "auto", flexShrink: 0 }}>
                      {formatDate(r.createdAt)}
                    </Typography>
                  </Box>
                  <Typography variant="body2" color="text.secondary" sx={{ whiteSpace: "pre-wrap", wordBreak: "break-word" }}>
                    {snippet(r.content, query)}
                  </Typography>
                  <Box sx={{ display: "flex", alignItems: "center", gap: 0.5, mt: 0.25 }}>
                    <Tag sx={{ fontSize: 14, color: "text.disabled" }} />
                    <Typography variant="caption" color="text.disabled">{r.channel.name}</Typography>
                  </Box>
                </Box>
              </ListItemButton>
            ))}
            {nextCursor && (
              <Box sx={{ display: "flex", justifyContent: "center", py: 1 }}>
                {loading ? (
                  <CircularProgress size={20} />
                ) : (
                  <Typography
                    variant="body2"
                    color="primary"
                    sx={{ cursor: "pointer", "&:hover": { textDecoration: "underline" } }}
                    onClick={() => doSearch(query, nextCursor)}
                  >
                    Load more results
                  </Typography>
                )}
              </Box>
            )}
          </List>
        )}
      </DialogContent>
    </Dialog>
  );
}
