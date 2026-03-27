"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { Avatar, Box, Typography } from "@mui/material";
import DMMessageList from "@/components/chat/DMMessageList";
import DMMessageInput from "@/components/chat/DMMessageInput";

interface UserInfo {
  id: string;
  username: string;
  avatarUrl: string | null;
}

export default function DMChatPage() {
  const params = useParams();
  const userId = params?.userId as string;
  const [otherUser, setOtherUser] = useState<UserInfo | null>(null);

  useEffect(() => {
    if (!userId) return;
    // Fetch conversations to find this user's info
    fetch("/api/dm/conversations")
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (!data?.conversations) return;
        const conv = data.conversations.find(
          (c: { user: UserInfo }) => c.user.id === userId,
        );
        if (conv) setOtherUser(conv.user);
      });
  }, [userId]);

  return (
    <Box sx={{ flex: 1, display: "flex", flexDirection: "column", height: "100%" }}>
      <Box sx={{ px: 2, py: 1, borderBottom: 1, borderColor: "divider", display: "flex", alignItems: "center", gap: 1 }}>
        {otherUser && (
          <Avatar src={otherUser.avatarUrl ?? undefined} sx={{ width: 28, height: 28, bgcolor: "primary.main", fontSize: 12 }}>
            {otherUser.username[0].toUpperCase()}
          </Avatar>
        )}
        <Typography variant="subtitle1" fontWeight={700}>
          {otherUser?.username ?? "Direct Message"}
        </Typography>
      </Box>
      <DMMessageList otherUserId={userId} />
      <DMMessageInput receiverId={userId} />
    </Box>
  );
}
