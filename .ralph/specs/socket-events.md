# Socket.io Events Specification

Real-time messaging via Socket.io running on the same server.js process as Next.js.

## Server Setup (in server.js)
- Attach Socket.io `Server` to the Node HTTP server (same pattern as SuperConnections).
- On connection: parse JWT from cookie header, verify, attach user info to socket.
- Reject connections with invalid/missing auth.

## Connection Lifecycle
- `connection` — register socket, associate with authenticated user. Track userId → socketId mapping.
- `disconnect` — remove socket mapping, broadcast offline status to user's servers.

## Channel Events
- `channel:join` — client sends `{ channelId: string }`. Server validates membership, joins socket to room `channel:<channelId>`.
- `channel:leave` — client sends `{ channelId: string }`. Server leaves the room.

## Message Events
- `message:create` — client sends `{ channelId: string, content: string, fileUrl?: string }`. Server validates author is a member, persists to DB via Prisma, broadcasts `message:new` to room with full message object (including author info).
- `message:update` — client sends `{ messageId: string, content: string }`. Server validates author owns message, updates DB, broadcasts `message:updated` to room.
- `message:delete` — client sends `{ messageId: string }`. Server validates author or admin, soft-deletes in DB, broadcasts `message:deleted` with `{ messageId }` to room.

## Presence Events
- `presence:online` — on connection, server broadcasts `{ userId, username }` to all server rooms the user belongs to.
- `presence:offline` — on disconnect, server broadcasts `{ userId }` to relevant rooms.
- Server maintains an in-memory `Map<userId, Set<socketId>>` for online tracking.

## Typing Indicator
- `typing:start` — client sends `{ channelId }`. Server broadcasts to room excluding sender.
- `typing:stop` — client sends `{ channelId }`. Server broadcasts to room excluding sender.

## Payload Types
All payloads must have TypeScript interfaces in `src/types/socket.ts`.
Both `ServerToClientEvents` and `ClientToServerEvents` interfaces must be defined for type-safe Socket.io usage.
