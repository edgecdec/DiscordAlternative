"use client";

import { useState, type FormEvent } from "react";
import {
  Card,
  CardContent,
  TextField,
  Button,
  Typography,
  Alert,
  Box,
  Link as MuiLink,
} from "@mui/material";
import { useAuth } from "@/hooks/useAuth";

type Mode = "login" | "register";

export default function AuthForm() {
  const { login, register } = useAuth();
  const [mode, setMode] = useState<Mode>("login");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const toggleMode = () => {
    setMode((m) => (m === "login" ? "register" : "login"));
    setError("");
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError("");
    setSubmitting(true);
    try {
      if (mode === "login") {
        await login(username, password);
      } else {
        await register(username, password);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setSubmitting(false);
    }
  };

  const isLogin = mode === "login";

  return (
    <Card sx={{ width: "100%", maxWidth: 400 }}>
      <CardContent
        component="form"
        onSubmit={handleSubmit}
        sx={{ display: "flex", flexDirection: "column", gap: 2 }}
      >
        <Typography variant="h5" textAlign="center">
          {isLogin ? "Welcome back!" : "Create an account"}
        </Typography>

        {error && <Alert severity="error">{error}</Alert>}

        <TextField
          label="Username"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          required
          autoComplete="username"
          slotProps={{ htmlInput: { minLength: 3, maxLength: 20 } }}
        />

        <TextField
          label="Password"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          autoComplete={isLogin ? "current-password" : "new-password"}
          slotProps={{ htmlInput: { minLength: 6 } }}
        />

        <Button
          type="submit"
          variant="contained"
          disabled={submitting}
          fullWidth
        >
          {isLogin ? "Log In" : "Register"}
        </Button>

        <Box textAlign="center">
          <Typography variant="body2" component="span">
            {isLogin ? "Need an account? " : "Already have an account? "}
          </Typography>
          <MuiLink
            component="button"
            type="button"
            variant="body2"
            onClick={toggleMode}
          >
            {isLogin ? "Register" : "Log In"}
          </MuiLink>
        </Box>
      </CardContent>
    </Card>
  );
}
