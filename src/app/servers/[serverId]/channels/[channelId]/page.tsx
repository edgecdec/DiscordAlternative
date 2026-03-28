"use client";

import { useCallback, useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { Box, IconButton, Tooltip, Typography, useMediaQuery } from "@mui/material";
import { PushPin, Schedule, Search, Settings, Tag, VolumeUp } from "@mui/icons-material";
import { useSocket } from "@/hooks/useSocket";
import { useAuth } from "@/hooks/useAuth";
import type { SocketMessage } from "@/types/socket";
import MessageList from "@/components/chat/MessageList";
import MessageInput from "@/components/chat/MessageInput";
import TypingIndicator from "@/components/chat/TypingIndicator";
import VoiceChannel from "@/components/voice/VoiceChannel";
import SearchDialog from "@/components/chat/SearchDialog";
import ChannelSettingsDialog from "@/components/layout/ChannelSettingsDialog";
import PinnedMessagesDrawer from "@/components/chat/PinnedMessagesDrawer";
import ThreadPanel from "@/components/chat/ThreadPanel";
import ChannelTopicDisplay from "@/components/chat/ChannelTopicDisplay";

interface ChannelInfo {
  name: string;
  type: string;
  slowModeSeconds: number;
  topic: string | null;
}

const ADMIN_ROLES = ["OWNER", "ADMIN"];

function markChannelRead(channelId: string, socket: ReturnType<typeof useSocket>["socket"]) {
  fetch(`/api/channels/${channelId}/read`, { method: "PATCH" })
    .then((res) => (res.ok ? res.json() : null))
    .then((data) => {
      if (data?.lastReadMessageId && socket) {
        socket.emit("read:update", { channelId, lastReadMessageId: data.lastReadMessageId });
      }
    });
}

function formatSlowMode(seconds: number): string {
  if (seconds >= 60) return `${seconds / 60}m`;
  return `${seconds}s`;
}

export default function ChannelPage() {
  const params = useParams();
  const channelId = params?.channelId as string;
  const serverId = params?.serverId as string;
  const [channel, setChannel] = useState<ChannelInfo | null>(null);
  const [userRole, setUserRole] = useState<string>("GUEST");
  const { socket, joinChannel, leaveChannel, connected } = useSocket();
  const { user } = useAuth();
  const isMobile = useMediaQuery("(max-width:767px)");
  const [replyTo, setReplyTo] = useState<SocketMessage | null>(null);
  const [searchOpen, setSearchOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [pinsOpen, setPinsOpen] = useState(false);
  const [activeThread, setActiveThread] = useState<{ id: string; name: string } | null>(null);

  useEffect(() => {
    setReplyTo(null);
    setActiveThread(null);
  }, [channelId]);

  useEffect(() => {
    if (!serverId) return;
    fetch(`/api/servers/${serverId}`)
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (!data) return;
        const ch = data.server.channels.find(
          (c: { id: string; name: string; type: string; slowModeSeconds: number; topic?: string | null }) => c.id === channelId
        );
        if (ch) setChannel({ name: ch.name, type: ch.type, slowModeSeconds: ch.slowModeSeconds ?? 0, topic: ch.topic ?? null });
        if (user) {
          const member = data.server.members.find(
            (m: { user: { id: string }; role: string }) => m.user.id === user.id
          );
          if (member) setUserRole(member.role);
        }
      });
  }, [serverId, channelId, user]);

  const isText = !channel || channel.type === "TEXT";
  const isVoice = channel?.type === "VOICE" || channel?.type === "VIDEO";
  const ChannelIcon = isVoice ? VolumeUp : Tag;
  const canManage = ADMIN_ROLES.includes(userRole);
  const showSlowModeIcon = isText && channel && channel.slowModeSeconds > 0;

  useEffect(() => {
    if (!channelId || !connected || !isText) return;
    joinChannel(channelId);
    return () => {
      leaveChannel(channelId);
    };
  }, [channelId, connected, joinChannel, leaveChannel, isText]);

  const onNewMessage = useCallback(() => {
    markChannelRead(channelId, socket);
  }, [channelId, socket]);

  useEffect(() => {
    if (!channelId || !isText) return;
    markChannelRead(channelId, socket);
    if (!socket) return;
    socket.on("message:new", onNewMessage);
    return () => {
      socket.off("message:new", onNewMessage);
    };
  }, [channelId, isText, socket, onNewMessage]);

  const handleSlowModeUpdated = useCallback((newSlowMode: number) => {
    setChannel((prev) => prev ? { ...prev, slowModeSeconds: newSlowMode } : prev);
  }, []);

  const handleOpenThread = useCallback((threadId: string, threadName: string) => {
    setActiveThread({ id: threadId, name: threadName });
  }, []);

  const handleTopicUpdated = useCallback((newTopic: string | null) => {
    setChannel((prev) => prev ? { ...prev, topic: newTopic } : prev);
  }, []);

  return (
    <Box sx={{ flex: 1, display: "flex", flexDirection: "column", height: "100%" }}>
      <Box
        sx={{
          pl: isMobile ? 6 : 2,
          pr: 2,
          py: 1,
          borderBottom: 1,
          borderColor: "divider",
          display: "flex",
          alignItems: "center",
          gap: 1,
        }}
      >
        <ChannelIcon sx={{ color: "text.secondary", fontSize: 20 }} />
        <Typography variant="subtitle1" fontWeight={700}>
          {channel?.name ?? "Loading..."}
        </Typography>
        {showSlowModeIcon && (
          <Tooltip title={`Slow mode: ${formatSlowMode(channel.slowModeSeconds)}`}>
            <Schedule sx={{ fontSize: 16, color: "text.secondary" }} />
          </Tooltip>
        )}
        {isText && channel && (
          <ChannelTopicDisplay
            channelId={channelId}
            topic={channel.topic}
            canEdit={canManage}
            onTopicUpdated={handleTopicUpdated}
          />
        )}
        <Box sx={{ ml: "auto", display: "flex", gap: 0.5 }}>
          {isText && (
            <Tooltip title="Pinned Messages">
              <IconButton size="small" onClick={() => setPinsOpen(true)} aria-label="Pinned messages">
                <PushPin sx={{ fontSize: 20 }} />
              </IconButton>
            </Tooltip>
          )}
          {canManage && isText && channel && (
            <Tooltip title="Channel Settings">
              <IconButton size="small" onClick={() => setSettingsOpen(true)} aria-label="Channel settings">
                <Settings sx={{ fontSize: 20 }} />
              </IconButton>
            </Tooltip>
          )}
          <IconButton size="small" onClick={() => setSearchOpen(true)} aria-label="Search messages">
            <Search sx={{ fontSize: 20 }} />
          </IconButton>
        </Box>
      </Box>
      <SearchDialog open={searchOpen} onClose={() => setSearchOpen(false)} serverId={serverId} />
      {isText && (
        <PinnedMessagesDrawer open={pinsOpen} onClose={() => setPinsOpen(false)} channelId={channelId} />
      )}
      {channel && isText && canManage && (
        <ChannelSettingsDialog
          open={settingsOpen}
          onClose={() => setSettingsOpen(false)}
          channelId={channelId}
          channelName={channel.name}
          slowModeSeconds={channel.slowModeSeconds}
          onUpdated={handleSlowModeUpdated}
        />
      )}
      {isText && channel ? (
        <Box sx={{ flex: 1, display: "flex", overflow: "hidden" }}>
          <Box sx={{ flex: 1, display: "flex", flexDirection: "column", minWidth: 0 }}>
            <MessageList channelId={channelId} serverId={serverId} onReply={setReplyTo} onOpenThread={handleOpenThread} userRole={userRole} />
            <TypingIndicator channelId={channelId} />
            <MessageInput
              channelId={channelId}
              serverId={serverId}
              slowModeSeconds={channel.slowModeSeconds}
              replyTo={replyTo}
              onCancelReply={() => setReplyTo(null)}
            />
          </Box>
          {activeThread && (
            <ThreadPanel
              threadId={activeThread.id}
              threadName={activeThread.name}
              channelId={channelId}
              serverId={serverId}
              onClose={() => setActiveThread(null)}
            />
          )}
        </Box>
      ) : !channel ? (
        <Box sx={{ flex: 1, display: "flex", justifyContent: "center", alignItems: "center" }}>
          <Typography color="text.secondary">Loading...</Typography>
        </Box>
      ) : (
        <VoiceChannel channelId={channelId} channelName={channel?.name ?? ""} serverId={serverId} />
      )}
    </Box>
  );
}
