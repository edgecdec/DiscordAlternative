"use client";

import type { ReactNode } from "react";
import { LiveKitRoom, RoomAudioRenderer } from "@livekit/components-react";
import { useVoice } from "@/hooks/useVoice";

const LIVEKIT_URL = process.env.NEXT_PUBLIC_LIVEKIT_URL;

export default function GlobalVoiceRoom({ children }: { children: ReactNode }) {
  const { voice, disconnectVoice } = useVoice();

  if (!voice) return <>{children}</>;

  return (
    <LiveKitRoom
      serverUrl={LIVEKIT_URL}
      token={voice.token}
      connect={true}
      audio={true}
      onDisconnected={disconnectVoice}
      style={{ display: "contents" }}
    >
      <RoomAudioRenderer />
      {children}
    </LiveKitRoom>
  );
}
