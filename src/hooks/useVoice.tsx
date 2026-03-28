"use client";

import {
  createContext,
  useContext,
  useState,
  useCallback,
  type ReactNode,
  createElement,
} from "react";

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
    setVoice({ ...params, token: data.token });
  }, []);

  const disconnectVoice = useCallback(() => {
    setVoice(null);
  }, []);

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
