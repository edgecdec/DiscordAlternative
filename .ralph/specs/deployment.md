# Deployment Specification

Same deployment pattern as MarchMadness and SuperConnections.

## Server Process
- `server.js` at project root: custom Node HTTP server wrapping Next.js + Socket.io.
- Port: 3003 (env `PORT`).
- Production start: `NODE_ENV=production node server.js`

## pm2 Configuration
- Process name: `discord-alt`
- Start command: `node server.js`
- Env: `NODE_ENV=production`, `PORT=3003`

## Deploy Script (deploy_webhook.sh)
- Triggered by GitHub webhook POST to `/api/webhook`.
- Webhook signature verification using `WEBHOOK_SECRET` (same pattern as MarchMadness server.js).
- Steps: git fetch/reset, conditional npm install (if package.json changed), prisma migrate, next build, pm2 restart.

## Directory
- Production path: `/var/www/DiscordAlternative`
- Database file: `/var/www/DiscordAlternative/data/discord.db`
- Uploads: `/var/www/DiscordAlternative/uploads/`

## LiveKit Server (Self-Hosted)
- Install LiveKit binary on the same machine.
- Config at `/etc/livekit.yaml` — generate API key/secret with `livekit-server generate-keys`.
- Run via pm2: `pm2 start livekit-server -- --config /etc/livekit.yaml --name livekit`
- Ports: 7880 (HTTP/WS), 7881 (RTC/UDP) — open in firewall.
- If using nginx reverse proxy, WebSocket upgrade headers required for port 7880.

## .env.example
```
PORT=3003
JWT_SECRET=<random-secret>
WEBHOOK_SECRET=<webhook-secret>
LIVEKIT_API_KEY=<from-livekit.yaml>
LIVEKIT_API_SECRET=<from-livekit.yaml>
NEXT_PUBLIC_LIVEKIT_URL=ws://discord.edgecdec.com:7880
```

## .gitignore additions
```
data/
uploads/
.env
```
