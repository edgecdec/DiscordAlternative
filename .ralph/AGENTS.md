# Project: Discord Alternative (Lightweight, Private, Self-Hosted)

## Stack

- **Frontend**: Next.js 15 (React 19) with App Router
- **Styling**: MUI v7 + Emotion (matching MarchMadness/SuperConnections visual style)
- **Real-Time Text**: Socket.io (on same server process, like SuperConnections)
- **Voice/Video**: LiveKit (WebRTC SFU, external service)
- **Database**: SQLite via Prisma ORM (better-sqlite3 adapter)
- **Auth**: JWT via cookies (same pattern as MarchMadness — jsonwebtoken + bcryptjs)
- **File Storage**: Local filesystem with `/uploads` directory served statically

## Project Structure

```
/
├── .ralph/              # Ralph loop config
├── prisma/
│   └── schema.prisma    # Database schema (SQLite)
├── src/
│   ├── app/             # Next.js App Router pages and API routes
│   ├── components/      # React components (chat/, voice/, layout/, common/)
│   ├── lib/             # DB client, auth helpers, shared utils
│   ├── hooks/           # Custom React hooks (useAuth, useSocket, useThemeMode)
│   └── types/           # Shared TypeScript types (socket events, models)
├── server.js            # Custom Node HTTP server (Next.js + Socket.io)
├── deploy_webhook.sh    # Auto-deploy via GitHub webhook
├── public/              # Static assets
├── uploads/             # User file uploads (gitignored)
└── data/                # SQLite database file (gitignored)
```

## Server Pattern

Single `server.js` process wraps Next.js and Socket.io together (same as SuperConnections):
```js
const server = createServer(handler);
const io = new Server(server);
```
Deployed to `/var/www/DiscordAlternative`, managed by pm2.

## Backpressure Validation Commands

Run in order. ALL must exit 0 before committing.

```bash
npx prisma validate
npx tsc --noEmit
npm test
```

## Remote Smoke Test (post-deploy validation)

After deployment tasks, source `.ralph/.server-env` then verify:
```bash
source .ralph/.server-env
ssh -i $SSH_KEY $SSH_USER@$SSH_HOST "curl -s -o /dev/null -w '%{http_code}' http://localhost:3003"
```
Expected: `200`. If not, check logs:
```bash
ssh -i $SSH_KEY $SSH_USER@$SSH_HOST "pm2 logs discord-alt --lines 30 --nostream"
```

## Theme

- Primary color: `#5865F2` (Discord-inspired blue-purple)
- Dark mode default, light mode toggle (same useThemeMode pattern as MarchMadness)
- Dark background: `#121212` / paper: `#1e1e1e`

## Remote Server Access

Connection details are stored locally in `.ralph/.server-env` (gitignored). Read that file to get `SSH_KEY`, `SSH_USER`, and `SSH_HOST`.

- Production path: `/var/www/DiscordAlternative`
- OS: Ubuntu 24.04, x86_64
- Process manager: pm2
- Other apps on same server: jeopardy (:3000), superconnections (:3001), marchmadness (:3002)
- This app runs on port 3003.

### Useful Remote Commands
```bash
# Source connection info first
source .ralph/.server-env

# Check running processes
ssh -i $SSH_KEY $SSH_USER@$SSH_HOST "pm2 list"

# View app logs
ssh -i $SSH_KEY $SSH_USER@$SSH_HOST "pm2 logs discord-alt --lines 50"

# Restart app
ssh -i $SSH_KEY $SSH_USER@$SSH_HOST "pm2 restart discord-alt"

# Check memory/disk
ssh -i $SSH_KEY $SSH_USER@$SSH_HOST "free -h && df -h /"

# Test if app is responding
ssh -i $SSH_KEY $SSH_USER@$SSH_HOST "curl -s -o /dev/null -w '%{http_code}' http://localhost:3003"
```

## Operational Notes

- Socket.io event payloads must have TypeScript interfaces in `src/types/socket.ts`.
- Prisma schema is the single source of truth for data models.
- JWT tokens stored in httpOnly cookies, not localStorage.
- All API routes under `src/app/api/` use Next.js Route Handlers.
- Environment variables: see `.env.example` for required keys.
- Port: 3003 (to avoid conflicts with MarchMadness:3002, SuperConnections:3001).
