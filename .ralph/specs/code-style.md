# Code Style and Organization Specification

## File Size and Splitting
- No file should exceed ~150 lines. If it does, extract logic into separate files.
- One component per file. One hook per file. One utility concern per file.
- API route files should only contain the route handler — extract validation, DB queries, and business logic into `src/lib/` helpers.

## Helper Functions and Shared Logic
- Before writing any logic, search the codebase for existing implementations. Reuse before creating.
- Extract repeated patterns into shared helpers in `src/lib/`:
  - `src/lib/auth.ts` — JWT signing, verification, cookie building, getAuthUser
  - `src/lib/db.ts` — Prisma client singleton
  - `src/lib/validators.ts` — input validation helpers (e.g. validateUsername, validatePassword)
  - `src/lib/permissions.ts` — role checking helpers (e.g. isOwnerOrAdmin, isMember)
  - `src/lib/responses.ts` — standard error response helpers (e.g. unauthorized(), badRequest(), notFound())
- If you write the same pattern in two places, extract it immediately. Don't wait.

## API Route Pattern
Every API route should follow this structure:
1. Parse and validate input (use helpers from validators.ts)
2. Authenticate (use getAuthUser from auth.ts)
3. Authorize (use helpers from permissions.ts)
4. Execute business logic (DB operations)
5. Return response

Keep route handlers thin — they orchestrate, they don't contain logic.

## Component Organization
- `src/components/common/` — reusable UI components (ThemeRegistry, etc.)
- `src/components/auth/` — authentication UI
- `src/components/layout/` — structural layout components (ServerSidebar, ChannelPanel, etc.)
- `src/components/chat/` — message-related components
- `src/components/voice/` — voice/video components
- Components should accept props, not fetch their own data. Data fetching happens in page components or hooks.

## Hooks
- Custom hooks go in `src/hooks/`.
- Each hook in its own file: `useAuth.tsx`, `useSocket.ts`, `useThemeMode.tsx`.
- Hooks should be focused — one concern per hook.

## Types
- All shared TypeScript interfaces and types go in `src/types/`.
- `src/types/socket.ts` — Socket.io event types
- `src/types/index.ts` — model types (User, Server, Channel, Message, etc.)
- Never use `any`. Define proper types.
- Never inline complex type definitions — extract to src/types/.

## Naming Conventions
- Files: camelCase for utilities (`validators.ts`), PascalCase for components (`AuthForm.tsx`).
- Functions: camelCase (`getAuthUser`, `validateUsername`).
- Types/Interfaces: PascalCase (`ServerMember`, `ClientToServerEvents`).
- Constants: UPPER_SNAKE_CASE (`BCRYPT_ROUNDS`, `PASSWORD_MIN`).
- No magic numbers or hardcoded strings inline — use named constants.

## Imports
- Use the `@/` path alias for all internal imports.
- Group imports: external packages first, then internal modules, then types.
- Use top-level ES imports only. Never dynamic `require()` inside functions.
