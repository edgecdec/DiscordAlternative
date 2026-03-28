"use client";

import { Avatar, AvatarGroup, Tooltip } from "@mui/material";

interface ReadUser {
  userId: string;
  avatarUrl: string | null;
  username: string;
}

interface ReadReceiptsProps {
  readers: ReadUser[];
}

const AVATAR_SIZE = 16;

export default function ReadReceipts({ readers }: ReadReceiptsProps) {
  if (readers.length === 0) return null;

  const label = readers.map((r) => r.username).join(", ");

  return (
    <Tooltip title={`Read by ${label}`} placement="left">
      <AvatarGroup
        max={5}
        sx={{
          justifyContent: "flex-end",
          "& .MuiAvatar-root": {
            width: AVATAR_SIZE,
            height: AVATAR_SIZE,
            fontSize: 9,
            border: "1px solid",
            borderColor: "background.paper",
          },
        }}
      >
        {readers.map((r) => (
          <Avatar key={r.userId} src={r.avatarUrl ?? undefined} alt={r.username}>
            {r.username[0].toUpperCase()}
          </Avatar>
        ))}
      </AvatarGroup>
    </Tooltip>
  );
}
