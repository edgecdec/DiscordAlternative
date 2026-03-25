# Database Schema Specification

Prisma ORM with SQLite (better-sqlite3 adapter). Schema defines all core data models.

## Prisma Datasource

```prisma
datasource db {
  provider = "sqlite"
  url      = "file:../data/discord.db"
}

generator client {
  provider = "prisma-client-js"
}
```

## Models

### User
- id: String @id @default(cuid())
- username: String @unique
- passwordHash: String
- avatarUrl: String? (optional)
- createdAt: DateTime @default(now())
- updatedAt: DateTime @updatedAt
- Relations: messages[], serverMembers[], directMessages[]

### Server
- id: String @id @default(cuid())
- name: String
- imageUrl: String? (optional)
- inviteCode: String @unique @default(uuid())
- ownerId: String → relation to User
- createdAt: DateTime @default(now())
- updatedAt: DateTime @updatedAt
- Relations: channels[], members[]

### Channel
- id: String @id @default(cuid())
- name: String
- type: String (TEXT | VOICE | VIDEO), default "TEXT"
- serverId: String → relation to Server (onDelete: Cascade)
- createdAt: DateTime @default(now())
- updatedAt: DateTime @updatedAt
- Relations: messages[]
- Note: Every server gets a default "general" TEXT channel on creation.

### Message
- id: String @id @default(cuid())
- content: String
- fileUrl: String? (optional)
- deleted: Boolean @default(false)
- authorId: String → relation to User
- channelId: String → relation to Channel (onDelete: Cascade)
- createdAt: DateTime @default(now())
- updatedAt: DateTime @updatedAt
- @@index([channelId])

### ServerMember
- id: String @id @default(cuid())
- role: String (OWNER | ADMIN | MODERATOR | GUEST), default "GUEST"
- userId: String → relation to User
- serverId: String → relation to Server (onDelete: Cascade)
- joinedAt: DateTime @default(now())
- @@unique([userId, serverId])

## Constraints
- Deleting a Server cascades to its Channels, Messages, and ServerMembers.
- Index on Message.channelId for pagination queries.
- SQLite doesn't support enums natively — use String fields with application-level validation.
