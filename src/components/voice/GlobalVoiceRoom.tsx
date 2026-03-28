"use client";

import { useMemo, type ReactNode } from "react";
import { LiveKitRoom, RoomAudioRenderer } from "@livekit/components-react";
import type { AudioCaptureOptions, TrackPublishDefaults } from "livekit-client";
import { useVoice } from "@/hooks/useVoice";

const LIVEKIT_URL = process.env.NEXT_PUBLIC_LIVEKIT_URL;

const AUDIO_CAPTURE_DEFAULTS: AudioCaptureOptions = {
  noiseSuppression: true,
  autoGainControl: true,
  echoCancellation: true,
};

const PUBLISH_DEFAULTS: TrackPublishDefaults = {
  dtx: true,
};

export default function GlobalVoiceRoom({ children }: { children: ReactNode }) {
  const { voice, disconnectVoice } = useVoice();

  const roomOptions = useMemo(
    () => ({
      audioCaptureDefaults: AUDIO_CAPTURE_DEFAULTS,
      publishDefaults: PUBLISH_DEFAULTS,
    }),
    []
  );

  if (!voice) return <>{children}</>;

  return (
    <LiveKitRoom
      serverUrl={LIVEKIT_URL}
      token={voice.token}
      connect={true}
      audio={true}
      options={roomOptions}
      onDisconnected={disconnectVoice}
      style={{ display: "contents" }}
    >
      <RoomAudioRenderer />
      {children}
    </LiveKitRoom>
  );
}
