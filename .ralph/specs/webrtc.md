# WebRTC / LiveKit Specification

Voice and video channels use a self-hosted LiveKit server as the SFU. Backend only generates tokens.

## LiveKit Server (Self-Hosted)
- Install LiveKit server binary on the same machine as the app.
- Runs as a separate process managed by pm2 (e.g., `pm2 start livekit-server --name livekit`).
- Config file at `/etc/livekit.yaml` with generated API key/secret pair.
- Listens on port 7880 (HTTP) and 7881 (RTC/UDP).
- `NEXT_PUBLIC_LIVEKIT_URL` points to `ws://<your-domain>:7880` (or wss with TLS).

## Token Generation
- API route: POST `/api/livekit/token`
- Requires authenticated user (read JWT from cookie).
- Accepts `{ channelId }` in request body.
- Validates: user is a member of the server that owns the channel, channel type is VOICE or VIDEO.
- Generates LiveKit access token using `livekit-server-sdk`:
  - Room name: `channel:<channelId>`
  - Participant identity: `user:<userId>`
  - Grants: roomJoin, canPublish, canSubscribe
  - Expiry: 1 hour
- Returns `{ token: "<jwt>" }`.

## Frontend Integration
- `VoiceChannel.tsx` component uses `@livekit/components-react`.
- Fetches token from `/api/livekit/token` when user clicks to join a voice channel.
- Wraps content in `LiveKitRoom` provider, connecting to `NEXT_PUBLIC_LIVEKIT_URL`.
- Renders participant tracks using LiveKit React components.
- Shows participant list with mute/unmute controls (MUI `IconButton` with `Mic`/`MicOff` icons).
- Disconnect button to leave the voice channel.

## Environment Variables
- `LIVEKIT_API_KEY` — server-side only, matches key in `/etc/livekit.yaml`
- `LIVEKIT_API_SECRET` — server-side only, matches secret in `/etc/livekit.yaml`
- `NEXT_PUBLIC_LIVEKIT_URL` — public, e.g. `ws://yourdomain.com:7880`
