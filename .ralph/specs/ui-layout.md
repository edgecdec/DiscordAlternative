# UI Layout Specification

Discord-style layout using MUI v7 + Emotion. Dark theme default with light mode toggle.

## Theme Setup
- `ThemeRegistry` component wrapping the app (same pattern as MarchMadness).
- `useThemeMode` hook with context provider, localStorage persistence.
- Primary color: `#5865F2` (blue-purple).
- Dark mode: background `#121212`, paper `#1e1e1e`.
- Light mode: background `#f5f5f5`, paper `#ffffff`.

## Layout Structure (Three-Column)
- **Server Sidebar (left, narrow ~72px)**: Vertical strip of server icons (MUI `Avatar`). Active server highlighted. "Create Server" and "Join Server" buttons at bottom. Uses `Box` with fixed width.
- **Channel Panel (middle, ~240px)**: Server name header, channel list grouped by type. Text channels prefixed with `#`, voice channels with speaker icon. Current user info panel at bottom (avatar, username, settings icon). Uses MUI `List`, `ListItemButton`.
- **Main Content (right, flex)**: Either message view or voice channel view depending on channel type.

## Message View
- `MessageList` — scrollable feed using MUI `Box` with overflow-y. Messages show avatar, username, timestamp, content. Cursor-based pagination (load older on scroll to top).
- `MessageInput` — MUI `TextField` at bottom with send button and file attach `IconButton`.
- Each message: `Paper` or `Box` with `Typography` for content, `Avatar` for author.

## Voice Channel View
- Shows connected participants as a grid of `Avatar` + username.
- Mute/deafen toggle buttons using MUI `IconButton`.
- LiveKit room provider wraps this view.

## Pages (App Router)
- `/` — redirect to first server or show welcome/onboarding.
- `/servers/[serverId]` — redirect to first text channel.
- `/servers/[serverId]/channels/[channelId]` — channel view.
- `/invite/[code]` — join server via invite link.

## Responsive Behavior
- On mobile (<768px): server sidebar and channel panel collapse behind a hamburger `IconButton` + MUI `Drawer` (same pattern as MarchMadness navbar).

## Key MUI Components Used
- `Box`, `Paper`, `Typography`, `Avatar`, `TextField`, `Button`, `IconButton`
- `List`, `ListItemButton`, `ListItemText`, `ListItemIcon`
- `Drawer`, `Tooltip`, `Divider`, `Dialog`
- Icons from `@mui/icons-material`: `Tag`, `VolumeUp`, `Add`, `Settings`, `Send`, `AttachFile`, `Mic`, `MicOff`, `Headset`, `HeadsetOff`, `DarkMode`, `LightMode`, `Menu`
