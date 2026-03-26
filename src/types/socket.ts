// Socket.io event payload types and typed event interfaces

export interface MessageAuthor {
  id: string;
  username: string;
  avatarUrl: string | null;
}

export interface ReactionGroup {
  count: number;
  userReacted: boolean;
}

export interface SocketMessage {
  id: string;
  content: string;
  fileUrl: string | null;
  deleted: boolean;
  createdAt: string;
  updatedAt: string;
  channelId: string;
  author: MessageAuthor;
  reactions?: Record<string, ReactionGroup>;
}

// Client → Server payloads
export interface ChannelJoinPayload {
  channelId: string;
}

export interface ChannelLeavePayload {
  channelId: string;
}

export interface MessageCreatePayload {
  channelId: string;
  content: string;
  fileUrl?: string;
}

export interface MessageUpdatePayload {
  messageId: string;
  content: string;
}

export interface MessageDeletePayload {
  messageId: string;
}

export interface TypingPayload {
  channelId: string;
}

export interface PresenceListPayload {
  serverId: string;
}

export interface PresenceListResponse {
  onlineUserIds: string[];
}

// Server → Client payloads
export interface PresenceOnlinePayload {
  userId: string;
  username: string;
}

export interface PresenceOfflinePayload {
  userId: string;
}

export interface TypingBroadcastPayload {
  userId: string;
  username: string;
  channelId: string;
}

export interface MessageDeletedPayload {
  messageId: string;
}

export interface ReactionTogglePayload {
  messageId: string;
  emoji: string;
}

export interface ReactionBroadcastPayload {
  messageId: string;
  emoji: string;
  userId: string;
  channelId: string;
}

// Typed Socket.io event interfaces
export interface ServerToClientEvents {
  "message:new": (message: SocketMessage) => void;
  "message:updated": (message: SocketMessage) => void;
  "message:deleted": (payload: MessageDeletedPayload) => void;
  "reaction:add": (payload: ReactionBroadcastPayload) => void;
  "reaction:remove": (payload: ReactionBroadcastPayload) => void;
  "presence:online": (payload: PresenceOnlinePayload) => void;
  "presence:offline": (payload: PresenceOfflinePayload) => void;
  "presence:list": (payload: PresenceListResponse) => void;
  "typing:start": (payload: TypingBroadcastPayload) => void;
  "typing:stop": (payload: TypingBroadcastPayload) => void;
}

export interface ClientToServerEvents {
  "channel:join": (payload: ChannelJoinPayload) => void;
  "channel:leave": (payload: ChannelLeavePayload) => void;
  "message:create": (payload: MessageCreatePayload) => void;
  "message:update": (payload: MessageUpdatePayload) => void;
  "message:delete": (payload: MessageDeletePayload) => void;
  "reaction:toggle": (payload: ReactionTogglePayload) => void;
  "presence:list": (payload: PresenceListPayload) => void;
  "typing:start": (payload: TypingPayload) => void;
  "typing:stop": (payload: TypingPayload) => void;
}
