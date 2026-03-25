# Server Management Specification

CRUD operations for servers (guilds) and channels.

## Create Server
- POST `/api/servers` — accepts `{ name, imageUrl? }`.
- Creates Server with auto-generated inviteCode (uuid).
- Creates a default "general" TEXT channel.
- Creates a ServerMember with role OWNER for the creating user.
- Returns the full server object.

## Update Server
- PATCH `/api/servers/[serverId]` — accepts `{ name?, imageUrl? }`.
- Only OWNER or ADMIN can update.

## Delete Server
- DELETE `/api/servers/[serverId]`.
- Only OWNER can delete. Cascades to channels, messages, members.

## Invite System
- GET `/api/servers/[serverId]/invite` — returns the invite code. Only members can view.
- POST `/api/servers/invite/[code]` — join a server via invite code. Creates ServerMember with GUEST role. Rejects if already a member.
- Frontend page: `/invite/[code]` — shows server name and join button.

## Channel Management
- POST `/api/servers/[serverId]/channels` — accepts `{ name, type }`. OWNER/ADMIN only.
- PATCH `/api/channels/[channelId]` — accepts `{ name? }`. OWNER/ADMIN only.
- DELETE `/api/channels/[channelId]` — OWNER/ADMIN only. Cannot delete the last TEXT channel.

## Member Management
- GET `/api/servers/[serverId]/members` — list members with roles.
- PATCH `/api/servers/[serverId]/members/[memberId]` — change role. OWNER only.
- DELETE `/api/servers/[serverId]/members/[memberId]` — kick member. OWNER/ADMIN only. Cannot kick OWNER.

## User's Servers
- GET `/api/servers` — returns all servers the authenticated user is a member of.
