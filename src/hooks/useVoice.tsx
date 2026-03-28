"use client";

import {
  createContext,
  useContext,
  useState,
  useCallback,
  useRef,
  type ReactNode,
  createElement,
} from "react";
import { useSocket } from "@/hooks/useSocket";

interface VoiceState {
  channelId: string;
  channelName: string;
  serverId: string;
  token: string;
}

interface VoiceContextValue {
  voice: VoiceState | null;
  joinVoice: (params: Omit<VoiceState, "token">) => Promise<void>;
  disconnectVoice: () => void;
}

const VoiceContext = createContext<VoiceContextValue | null>(null);

export function VoiceProvider({ children }: { children: ReactNode }) {
  const [voice, setVoice] = useState<VoiceState | null>(null);
  const { socket } = useSocket();
  const prevChannelRef = useRef<string | null>(null);

  const joinVoice = useCallback(async (params: Omit<VoiceState, "token">) => {
    const res = await fetch("/api/livekit/token", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ channelId: params.channelId }),
    });
    if (!res.ok) {
      const data = await res.json();
      throw new Error(data.error || "Failed to get voice token");
    }
    const data = await res.json();
    // Leave previous voice channel if any
    if (prevChannelRef.current) {
      socket?.emit("voice:leave", { channelId: prevChannelRef.current });
    }
    socket?.emit("voice:join", { channelId: params.channelId });
    prevChannelRef.current = params.channelId;
    setVoice({ ...params, token: data.token });
  }, [socket]);

  const disconnectVoice = useCallback(() => {
    if (prevChannelRef.current) {
      socket?.emit("voice:leave", { channelId: prevChannelRef.current });
      prevChannelRef.current = null;
    }
    setVoice(null);
  }, [socket]);

  return createElement(
    VoiceContext.Provider,
    { value: { voice, joinVoice, disconnectVoice } },
    children
  );
}

export function useVoice(): VoiceContextValue {
  const ctx = useContext(VoiceContext);
  if (!ctx) throw new Error("useVoice must be used within VoiceProvider");
  return ctx;
}
