"use client";

import { Suspense, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Box, CircularProgress } from "@mui/material";
import { useAuth } from "@/hooks/useAuth";
import AuthForm from "@/components/auth/AuthForm";

const LoadingBox = (
  <Box sx={{ display: "flex", justifyContent: "center", alignItems: "center", minHeight: "100vh" }}>
    <CircularProgress />
  </Box>
);

function HomeContent() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirect = searchParams.get("redirect");

  useEffect(() => {
    if (!loading && user) {
      router.replace(redirect || "/servers");
    }
  }, [loading, user, router, redirect]);

  if (loading || user) return LoadingBox;

  return (
    <Box sx={{ display: "flex", justifyContent: "center", alignItems: "center", minHeight: "100vh", bgcolor: "background.default" }}>
      <AuthForm />
    </Box>
  );
}

export default function Home() {
  return (
    <Suspense fallback={LoadingBox}>
      <HomeContent />
    </Suspense>
  );
}
