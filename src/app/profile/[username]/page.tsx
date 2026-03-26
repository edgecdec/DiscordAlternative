"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { Box, Avatar, Typography, Button, Paper, CircularProgress } from "@mui/material";
import { Edit } from "@mui/icons-material";
import { useAuth } from "@/hooks/useAuth";
import ProfileDialog from "@/components/common/ProfileDialog";

interface ProfileUser {
  id: string;
  username: string;
  avatarUrl: string | null;
  createdAt: string;
}

export default function ProfilePage() {
  const params = useParams();
  const username = params?.username as string;
  const { user: currentUser } = useAuth();
  const [profile, setProfile] = useState<ProfileUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);

  useEffect(() => {
    setLoading(true);
    fetch(`/api/users/${encodeURIComponent(username)}`)
      .then((res) => (res.ok ? res.json() : Promise.reject(new Error("User not found"))))
      .then((data) => setProfile(data.user))
      .catch((e) => setError((e as Error).message))
      .finally(() => setLoading(false));
  }, [username]);

  if (loading) {
    return (
      <Box sx={{ display: "flex", justifyContent: "center", alignItems: "center", minHeight: "100vh" }}>
        <CircularProgress />
      </Box>
    );
  }

  if (error || !profile) {
    return (
      <Box sx={{ display: "flex", justifyContent: "center", alignItems: "center", minHeight: "100vh" }}>
        <Typography color="error">{error || "User not found"}</Typography>
      </Box>
    );
  }

  const isOwnProfile = currentUser?.id === profile.id;
  const joinDate = new Date(profile.createdAt).toLocaleDateString(undefined, {
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  return (
    <Box sx={{ display: "flex", justifyContent: "center", alignItems: "center", minHeight: "100vh", p: 2 }}>
      <Paper sx={{ p: 4, maxWidth: 400, width: "100%", textAlign: "center" }}>
        <Avatar
          src={profile.avatarUrl ?? undefined}
          sx={{ width: 96, height: 96, fontSize: 40, mx: "auto", mb: 2 }}
        >
          {profile.username[0].toUpperCase()}
        </Avatar>
        <Typography variant="h5" fontWeight={700}>
          {profile.username}
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
          Joined {joinDate}
        </Typography>
        {isOwnProfile && (
          <Button
            variant="outlined"
            startIcon={<Edit />}
            onClick={() => setDialogOpen(true)}
            sx={{ mt: 2 }}
          >
            Edit Profile
          </Button>
        )}
      </Paper>
      {isOwnProfile && (
        <ProfileDialog open={dialogOpen} onClose={() => setDialogOpen(false)} />
      )}
    </Box>
  );
}
