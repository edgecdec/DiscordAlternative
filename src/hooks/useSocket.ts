"use client";

import {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
  useCallback,
  type ReactNode,
  createElement,
} from "react";
import { io, type Socket } from "socket.io-client";
import type {
  ClientToServerEvents,
  ServerToClientEvents,
} from "@/types/socket";
import { useAuth } from "@/hooks/useAuth";

type TypedSocket = Socket<ServerToClientEvents, ClientToServerEvents>;

interface SocketContextValue {
  socket: TypedSocket | null;
  connected: boolean;
  joinChannel: (channelId: string) => void;
  leaveChannel: (channelId: string) => void;
}

const SocketContext = createContext<SocketContextValue | null>(null);

export function SocketProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const socketRef = useRef<TypedSocket | null>(null);
  const [connected, setConnected] = useState(false);

  useEffect(() => {
    if (!user) {
      if (socketRef.current) {
        socketRef.current.disconnect();
        socketRef.current = null;
        setConnected(false);
      }
      return;
    }

    const s: TypedSocket = io({
      withCredentials: true,
      reconnection: true,
      reconnectionAttempts: Infinity,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
    });

    s.on("connect", () => setConnected(true));
    s.on("disconnect", () => setConnected(false));

    socketRef.current = s;

    return () => {
      s.disconnect();
      socketRef.current = null;
      setConnected(false);
    };
  }, [user]);

  const joinChannel = useCallback((channelId: string) => {
    socketRef.current?.emit("channel:join", { channelId });
  }, []);

  const leaveChannel = useCallback((channelId: string) => {
    socketRef.current?.emit("channel:leave", { channelId });
  }, []);

  return createElement(
    SocketContext.Provider,
    { value: { socket: socketRef.current, connected, joinChannel, leaveChannel } },
    children
  );
}

export function useSocket(): SocketContextValue {
  const ctx = useContext(SocketContext);
  if (!ctx) throw new Error("useSocket must be used within SocketProvider");
  return ctx;
}
