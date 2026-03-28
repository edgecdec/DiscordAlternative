"use client";

import { createContext, useContext, useEffect, useRef, useState, useCallback, createElement, type ReactNode } from "react";
import { useSocket } from "@/hooks/useSocket";
import { useAuth } from "@/hooks/useAuth";
import type { SocketMessage, MentionNotifyPayload, DirectMessagePayload } from "@/types/socket";

const STORAGE_KEY = "notification_sound_muted";

interface NotificationSoundContextValue {
  muted: boolean;
  toggleMute: () => void;
}

const NotificationSoundContext = createContext<NotificationSoundContextValue>({ muted: false, toggleMute: () => {} });

function playTone(audioCtx: AudioContext, frequency: number, duration: number) {
  const osc = audioCtx.createOscillator();
  const gain = audioCtx.createGain();
  osc.type = "sine";
  osc.frequency.value = frequency;
  gain.gain.setValueAtTime(0.15, audioCtx.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + duration);
  osc.connect(gain);
  gain.connect(audioCtx.destination);
  osc.start();
  osc.stop(audioCtx.currentTime + duration);
}

export function NotificationSoundProvider({ children }: { children: ReactNode }) {
  const [muted, setMuted] = useState(() => {
    if (typeof window === "undefined") return false;
    return localStorage.getItem(STORAGE_KEY) === "true";
  });
  const audioCtxRef = useRef<AudioContext | null>(null);
  const { socket } = useSocket();
  const { user } = useAuth();
  const activeChannelRef = useRef<string | null>(null);

  // Track which channel the user is currently viewing via URL
  useEffect(() => {
    const update = () => {
      const match = window.location.pathname.match(/\/channels\/([^/]+)/);
      activeChannelRef.current = match ? match[1] : null;
    };
    update();
    window.addEventListener("popstate", update);
    // MutationObserver to catch Next.js client-side navigation
    const observer = new MutationObserver(update);
    observer.observe(document.querySelector("head title") || document.head, { childList: true, subtree: true, characterData: true });
    return () => {
      window.removeEventListener("popstate", update);
      observer.disconnect();
    };
  }, []);

  const play = useCallback(() => {
    if (muted) return;
    if (!audioCtxRef.current) {
      audioCtxRef.current = new AudioContext();
    }
    const ctx = audioCtxRef.current;
    if (ctx.state === "suspended") ctx.resume();
    playTone(ctx, 880, 0.15);
  }, [muted]);

  // Listen for message:new — play if not from self and not in the active channel
  useEffect(() => {
    if (!socket || !user) return;
    const handleMessage = (msg: SocketMessage) => {
      if (msg.author.id === user.id) return;
      if (msg.channelId === activeChannelRef.current) return;
      play();
    };
    socket.on("message:new", handleMessage);
    return () => { socket.off("message:new", handleMessage); };
  }, [socket, user, play]);

  // Listen for mention:notify
  useEffect(() => {
    if (!socket) return;
    const handleMention = (_payload: MentionNotifyPayload) => { play(); };
    socket.on("mention:notify", handleMention);
    return () => { socket.off("mention:notify", handleMention); };
  }, [socket, play]);

  // Listen for dm:new — play if not from self
  useEffect(() => {
    if (!socket || !user) return;
    const handleDM = (payload: DirectMessagePayload) => {
      if (payload.senderId === user.id) return;
      play();
    };
    socket.on("dm:new", handleDM);
    return () => { socket.off("dm:new", handleDM); };
  }, [socket, user, play]);

  const toggleMute = useCallback(() => {
    setMuted((prev) => {
      const next = !prev;
      localStorage.setItem(STORAGE_KEY, String(next));
      return next;
    });
  }, []);

  return createElement(NotificationSoundContext.Provider, { value: { muted, toggleMute } }, children);
}

export function useNotificationSound(): NotificationSoundContextValue {
  return useContext(NotificationSoundContext);
}
